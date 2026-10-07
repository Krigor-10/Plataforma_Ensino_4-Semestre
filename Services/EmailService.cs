using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
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

        var mensagem = new MimeMessage();
        mensagem.From.Add(MailboxAddress.Parse(remetente));
        mensagem.To.Add(MailboxAddress.Parse(destinatario));
        mensagem.Subject = assunto;
        mensagem.Body = new BodyBuilder { HtmlBody = corpoHtml }.ToMessageBody();

        using var cliente = new SmtpClient();
        await cliente.ConnectAsync(host, porta, usarSsl ? SecureSocketOptions.StartTlsWhenAvailable : SecureSocketOptions.None);

        if (!string.IsNullOrWhiteSpace(usuario))
        {
            await cliente.AuthenticateAsync(usuario, senha ?? string.Empty);
        }

        await cliente.SendAsync(mensagem);
        await cliente.DisconnectAsync(quit: true);
    }
}
