using System.Net;
using System.Net.Mail;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnviarAsync(string destinatario, string assunto, string corpoHtml)
    {
        var host = _configuration["Smtp:Host"];

        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogInformation(
                "SMTP nao configurado (Smtp:Host vazio) - e-mail simulado.\nPara: {Destinatario}\nAssunto: {Assunto}\n{Corpo}",
                destinatario, assunto, corpoHtml);
            return;
        }

        var porta = _configuration.GetValue("Smtp:Port", 587);
        var usuario = _configuration["Smtp:Usuario"];
        var senha = _configuration["Smtp:Senha"];
        var usarSsl = _configuration.GetValue("Smtp:UsarSsl", true);
        var remetente = _configuration["Smtp:Remetente"] ?? "no-reply@edtech.local";

        using var cliente = new SmtpClient(host, porta)
        {
            EnableSsl = usarSsl
        };

        if (!string.IsNullOrWhiteSpace(usuario))
        {
            cliente.Credentials = new NetworkCredential(usuario, senha);
        }

        using var mensagem = new MailMessage(remetente, destinatario, assunto, corpoHtml)
        {
            IsBodyHtml = true
        };

        await cliente.SendMailAsync(mensagem);
    }
}
