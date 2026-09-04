using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Threading.RateLimiting;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Repositories;
using PlataformaEnsino.API.Services;
using System.Text;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.OpenApi;



var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<PlataformaContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? @"Server=(localdb)\mssqllocaldb;Database=PlataformaEnsinoDB;Trusted_Connection=True;TrustServerCertificate=True;"));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "API V1",
            Version = "v1"
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description = "Cole apenas o token JWT"
        };

        return Task.CompletedTask;
    });
});


builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IConteudoDidaticoRepository, ConteudoDidaticoRepository>();
builder.Services.AddScoped<IMatriculaRepository, MatriculaRepository>();
builder.Services.AddScoped<IModuloRepository, ModuloRepository>();
builder.Services.AddScoped<IConteudoDidaticoService, ConteudoDidaticoService>();
builder.Services.AddScoped<IProgressoAlunoService, ProgressoAlunoService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IAlunoService, AlunoService>();
builder.Services.AddScoped<IProfessorService, ProfessorService>();
builder.Services.AddScoped<ICoordenadorService, CoordenadorService>();
builder.Services.AddScoped<ICursoService, CursoService>();
builder.Services.AddScoped<ICursoAutorizacaoService, CursoAutorizacaoService>();
builder.Services.AddScoped<IMatriculaService, MatriculaService>();
builder.Services.AddScoped<IPagamentoService, PagamentoService>();
builder.Services.AddScoped<IAcessoAcademicoService, AcessoAcademicoService>();
builder.Services.AddScoped<IModuloService, ModuloService>();
builder.Services.AddScoped<ITurmaService, TurmaService>();
builder.Services.AddScoped<ITurmaRepository, TurmaRepository>();
builder.Services.AddScoped<ICursoDesempenhoService, CursoDesempenhoService>();
builder.Services.AddScoped<IAvaliacaoService, AvaliacaoService>();
builder.Services.AddScoped<IArmazenamentoArquivoService, ArmazenamentoArquivoService>();
builder.Services.AddScoped<ICertificadoService, CertificadoService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();

builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("banco-de-dados");

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

// Fora de Development, o placeholder versionado em appsettings.json ("SET_VIA_...")
// e um texto publico e conhecido: usa-lo como chave de assinatura permitiria a
// qualquer pessoa forjar tokens validos. Falha rapido e com mensagem clara em vez
// de subir "funcionando" com uma chave insegura.
if (!builder.Environment.IsDevelopment() &&
    (string.IsNullOrWhiteSpace(jwtKey) ||
     jwtKey == "SET_VIA_DOTNET_USER-SECRETS_OU_VARIAVEL_DE_AMBIENTE" ||
     jwtKey.Length < 32))
{
    throw new InvalidOperationException(
        "Jwt:Key nao foi configurada com uma chave real (minimo 32 caracteres) para o ambiente '" +
        builder.Environment.EnvironmentName + "'. Configure via variavel de ambiente Jwt__Key ou " +
        "'dotnet user-secrets set \"Jwt:Key\" \"<chave>\"'. Veja appsettings.example.json.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey!)
            ),

            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            // <img>/<a> pro /uploads nao enviam o header Authorization, entao
            // esse path aceita o token via query string como alternativa.
            OnMessageReceived = context =>
            {
                if (context.Request.Path.StartsWithSegments("/uploads") &&
                    context.Request.Query.TryGetValue("access_token", out var token))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? ["http://localhost:5000", "https://localhost:5001"];

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PlataformaContext>();

    if (app.Environment.IsDevelopment())
    {
        await dbContext.Database.MigrateAsync();
        await DevelopmentDataSeeder.SeedAsync(dbContext);
    }
}

var pastaUploads = Path.Combine(app.Environment.ContentRootPath, "Storage", "Uploads");
Directory.CreateDirectory(Path.Combine(pastaUploads, "conteudos"));
Directory.CreateDirectory(Path.Combine(pastaUploads, "cursos"));

app.UseRequestLoggingMiddleware();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseApiExceptionMiddleware();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/uploads") && context.User.Identity?.IsAuthenticated != true)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }

    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(pastaUploads),
    RequestPath = "/uploads"
});

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.MapScalarApiReference(options =>
    {
        options.Title = "PlataformaEnsino API";
    });
}

app.MapFallbackToFile("index.html");

app.Run();
