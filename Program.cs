using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
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
builder.Services.AddScoped<IExtratorTextoMaterialService, ExtratorTextoMaterialService>();
builder.Services.AddScoped<IValidadorQuestaoIaService, ValidadorQuestaoIaService>();
// Provedor de IA trocavel por configuracao ("IA:Provedor" = "Anthropic" | "Gemini",
// padrao Anthropic) - os dois implementam a mesma interface e compartilham prompt
// (PromptGeracaoQuestoesIa) e validacao (RespostaIaUtil), so a chamada HTTP muda.
// Permite testar/trocar de provedor sem mexer no resto do pipeline de geracao.
var provedorIa = builder.Configuration["IA:Provedor"] ?? "Anthropic";
if (string.Equals(provedorIa, "Gemini", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IAvaliacaoIAService, GeminiAvaliacaoIAService>();
}
else
{
    builder.Services.AddScoped<IAvaliacaoIAService, AvaliacaoIAService>();
}
// Primeiro uso de IHttpClientFactory no projeto - molde do BlobServiceClient singleton
// (Program.cs, registro condicional de storage acima) para uma integracao externa
// nova, so que via HTTP simples em vez de SDK (ver proposta aprovada, decisao 3).
builder.Services.AddHttpClient(AvaliacaoIAService.NomeHttpClient, cliente =>
{
    cliente.BaseAddress = new Uri("https://api.anthropic.com/");
    cliente.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddHttpClient(GeminiAvaliacaoIAService.NomeHttpClient, cliente =>
{
    cliente.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    cliente.Timeout = TimeSpan.FromSeconds(90);
});
// Azure App Service/Container Apps tem disco efemero e nao compartilhado entre
// instancias - fora de Development, upload so e confiavel em Blob Storage.
// AzureStorage:ConnectionString ausente mantem o backend local (docker-compose,
// que resolve isso com um volume nomeado em um unico host).
var azureStorageConnectionString = builder.Configuration["AzureStorage:ConnectionString"];
if (!string.IsNullOrWhiteSpace(azureStorageConnectionString))
{
    var blobServiceClient = new Azure.Storage.Blobs.BlobServiceClient(azureStorageConnectionString);
    builder.Services.AddSingleton(blobServiceClient);
    builder.Services.AddScoped<IArmazenamentoArquivoService, ArmazenamentoArquivoBlobService>();

    // Sem isso, cada instancia/reinicio gera um chaveiro de Data Protection
    // novo (fica so em /root/.aspnet/DataProtection-Keys, efemero no
    // container) - qualquer coisa protegida por ele (hoje nada critico,
    // mas antiforgery/cookies usariam) para de validar ao reiniciar ou ao
    // escalar pra mais de uma instancia.
    // A extensao exige que o container ja exista - diferente do backend de
    // upload (ArmazenamentoArquivoBlobService), que cria o proprio.
    blobServiceClient.GetBlobContainerClient("dataprotection-keys")
        .CreateIfNotExists(Azure.Storage.Blobs.Models.PublicAccessType.None);

    builder.Services.AddDataProtection()
        .PersistKeysToAzureBlobStorage(azureStorageConnectionString, "dataprotection-keys", "chaves.xml");
}
else
{
    builder.Services.AddScoped<IArmazenamentoArquivoService, ArmazenamentoArquivoLocalService>();
}
builder.Services.AddScoped<ICertificadoService, CertificadoService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();
builder.Services.AddScoped<IFeedbackAcademicoService, FeedbackAcademicoService>();
builder.Services.AddHostedService<RefreshTokenCleanupService>();

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

    // Policy dedicada (nao a de "auth") para o endpoint de geracao por IA - cada
    // chamada custa dinheiro de verdade no provedor, entao o limite e por professor
    // autenticado (nao por IP) e bem mais apertado que qualquer outra rota hoje.
    // 10/hora cobre uso legitimo (testar, regenerar questao individual na revisao)
    // sem abrir espaco pra loop acidental ou abuso (decisao 9 da proposta aprovada).
    options.AddPolicy("ia-geracao", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.User.FindFirst("usuarioId")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));
});

var corsAllowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

// appsettings.Production.json deixa Cors:AllowedOrigins vazio de proposito
// (nunca hardcode dominio de producao no codigo) - mas se ninguem preencher
// Cors__AllowedOrigins__N via variavel de ambiente antes do deploy, a API
// sobe normalmente e o navegador bloqueia toda chamada do frontend por CORS,
// uma falha silenciosa que so aparece em uso real. Falha o boot em vez disso,
// no mesmo espirito do guard ja existente pra Jwt:Key.
if (!builder.Environment.IsDevelopment() && (corsAllowedOrigins is null || corsAllowedOrigins.Length == 0))
{
    throw new InvalidOperationException(
        "Cors:AllowedOrigins nao foi configurado para o ambiente '" + builder.Environment.EnvironmentName +
        "'. Configure via variavel de ambiente Cors__AllowedOrigins__0 (e __1, __2... se houver mais de uma " +
        "origem) com a URL real do frontend/app. Veja appsettings.example.json.");
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsAllowedOrigins ?? ["http://localhost:5000", "https://localhost:5001"])
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Fora de Development (ex.: docker-compose, que sobe a API em Production contra um
// SQL Server vazio), nao ha outro jeito de aplicar as migrations antes do primeiro
// boot a nao ser essa flag explicita. Em um deploy real (Azure etc.) prefira rodar
// 'dotnet ef database update' manualmente/via pipeline de CI e deixar a flag em false.
var executarMigrationsNoStartup = app.Environment.IsDevelopment() ||
    app.Configuration.GetValue<bool>("RunMigrationsOnStartup");

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PlataformaContext>();

    if (executarMigrationsNoStartup)
    {
        await dbContext.Database.MigrateAsync();
    }

    if (app.Environment.IsDevelopment())
    {
        await DevelopmentDataSeeder.SeedAsync(dbContext);
    }
}

if (string.IsNullOrWhiteSpace(azureStorageConnectionString))
{
    var pastaUploads = Path.Combine(app.Environment.ContentRootPath, "Storage", "Uploads");
    Directory.CreateDirectory(Path.Combine(pastaUploads, "conteudos"));
    Directory.CreateDirectory(Path.Combine(pastaUploads, "cursos"));
}

// Fora de Development a API normalmente fica atras de um proxy que termina
// TLS (App Service, Application Gateway, Front Door) - sem isso,
// Request.Scheme nunca chega como "https" e HSTS/redirect/geracao de URL
// absoluta ficam errados. KnownNetworks/KnownProxies ficam vazios de
// proposito: e a configuracao documentada da Microsoft pra App Service, que
// ja garante (na borda) que X-Forwarded-* so chega do proprio proxy, nunca
// direto do cliente.
if (!app.Environment.IsDevelopment())
{
    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };
    forwardedHeadersOptions.KnownIPNetworks.Clear();
    forwardedHeadersOptions.KnownProxies.Clear();
    app.UseForwardedHeaders(forwardedHeadersOptions);
    app.UseHsts();
}

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

// Le do backend configurado (disco local ou Azure Blob Storage) em vez de
// StaticFileOptions contra um caminho fisico fixo - o gate de autenticacao
// pro path "/uploads" continua sendo o middleware acima, inalterado.
app.MapGet("/uploads/{subpasta}/{nomeArquivo}", async (string subpasta, string nomeArquivo, IArmazenamentoArquivoService armazenamento) =>
{
    var arquivo = await armazenamento.AbrirArquivoAsync(subpasta, nomeArquivo);
    return arquivo is null
        ? Results.NotFound()
        : Results.Stream(arquivo.Conteudo, arquivo.ContentType);
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

// Expoe o Program gerado pelas top-level statements pra PlataformaEnsino.Tests
// poder usar WebApplicationFactory<Program> em testes de integracao HTTP.
public partial class Program { }
