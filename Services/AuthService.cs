using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace PlataformaEnsino.API.Services;

public class AuthService : IAuthService
{
    private readonly PlataformaContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthService(PlataformaContext context, IConfiguration configuration, IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto?> LoginAsync(string email, string senha)
    {
        var emailNormalizado = email.Trim().ToLower();

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == emailNormalizado);

        if (usuario == null || string.IsNullOrWhiteSpace(usuario.SenhaHash) || !BCrypt.Net.BCrypt.Verify(senha, usuario.SenhaHash))
        {
            return null;
        }

        if (!usuario.Ativo)
        {
            throw new UnauthorizedAccessException("Seu cadastro ainda está pendente de liberação.");
        }

        return await MontarRespostaAsync(usuario);
    }

    public async Task<AuthResponseDto?> RefreshAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var tokenHash = CalcularHashToken(refreshToken);
        var tokenExistente = await _context.RefreshTokens
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

        if (tokenExistente is null || !tokenExistente.EstaAtivo || tokenExistente.Usuario is null || !tokenExistente.Usuario.Ativo)
        {
            return null;
        }

        tokenExistente.Revogar();

        return await MontarRespostaAsync(tokenExistente.Usuario);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var tokenHash = CalcularHashToken(refreshToken);
        var tokenExistente = await _context.RefreshTokens
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

        if (tokenExistente is not null && tokenExistente.RevogadoEm is null)
        {
            tokenExistente.Revogar();
            await _context.SaveChangesAsync();
        }
    }

    public async Task SolicitarRecuperacaoSenhaAsync(string email)
    {
        var emailNormalizado = email.Trim().ToLower();

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == emailNormalizado);

        if (usuario is null || !usuario.Ativo)
        {
            return;
        }

        var tokenBruto = GerarTokenUrlSeguro();
        var expiraEm = DateTime.UtcNow.AddHours(1);

        usuario.DefinirTokenRecuperacaoSenha(CalcularHashToken(tokenBruto), expiraEm);
        await _context.SaveChangesAsync();

        var baseUrl = (_configuration["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var link = $"{baseUrl}/redefinir-senha/{tokenBruto}";

        var corpoHtml =
            $"<p>Ola, {usuario.Nome}.</p>" +
            "<p>Recebemos uma solicitacao para redefinir sua senha na CodeRyse Academy. " +
            $"Clique no link abaixo para continuar (valido por 1 hora):</p>" +
            $"<p><a href=\"{link}\">{link}</a></p>" +
            "<p>Se voce nao solicitou essa alteracao, ignore este e-mail.</p>";

        await _emailService.EnviarAsync(usuario.Email, "Recuperacao de senha - CodeRyse Academy", corpoHtml);
    }

    public async Task RedefinirSenhaAsync(string token, string novaSenha)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Token de recuperacao invalido.");
        }

        var tokenHash = CalcularHashToken(token);

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.TokenRecuperacaoSenhaHash == tokenHash);

        if (usuario is null || usuario.TokenRecuperacaoSenhaExpiraEm is null || usuario.TokenRecuperacaoSenhaExpiraEm < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Link de recuperacao invalido ou expirado. Solicite a recuperacao novamente.");
        }

        usuario.AtualizarSenhaHash(BCrypt.Net.BCrypt.HashPassword(novaSenha));
        usuario.LimparTokenRecuperacaoSenha();

        var refreshTokensAtivos = await _context.RefreshTokens
            .Where(r => r.UsuarioId == usuario.Id && r.RevogadoEm == null)
            .ToListAsync();
        foreach (var refreshToken in refreshTokensAtivos)
        {
            refreshToken.Revogar();
        }

        await _context.SaveChangesAsync();
    }

    private static string GerarTokenUrlSeguro()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string CalcularHashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private async Task<AuthResponseDto> MontarRespostaAsync(Usuario usuario)
    {
        var refreshTokenValor = await GerarRefreshTokenAsync(usuario.Id);

        return new AuthResponseDto
        {
            Token = GerarAccessToken(usuario),
            RefreshToken = refreshTokenValor,
            Usuario = new UsuarioSessaoDto
            {
                Id = usuario.Id,
                Nome = usuario.Nome,
                Email = usuario.Email,
                Cpf = usuario.Cpf,
                TipoUsuario = usuario.TipoUsuario
            }
        };
    }

    private string GerarAccessToken(Usuario usuario)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, usuario.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, usuario.Nome ?? string.Empty),
            new Claim(ClaimTypes.Role, usuario.TipoUsuario ?? string.Empty),
            new Claim("usuarioId", usuario.Id.ToString())
        };

        var key = _configuration["Jwt:Key"]!;
        var issuer = _configuration["Jwt:Issuer"]!;
        var audience = _configuration["Jwt:Audience"]!;
        var expireMinutes = _configuration.GetValue<int>("Jwt:ExpireMinutes", 120);

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GerarRefreshTokenAsync(int usuarioId)
    {
        var expireDias = _configuration.GetValue<int>("Jwt:RefreshTokenExpireDays", 30);
        var valor = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        var refreshToken = RefreshToken.Emitir(usuarioId, CalcularHashToken(valor), expireDias);
        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return valor;
    }
}
