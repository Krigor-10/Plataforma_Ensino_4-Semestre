using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public enum PapelMensagemChatbot
{
    Usuario = 1,
    Assistente = 2
}

// Uma linha por mensagem (aluno ou Assistente). AcoesJson/FerramentasUsadasJson
// guardam listas serializadas (sem tabela filha - sao so pra auditoria/painel
// da fase 4, nunca consultadas por filtro). SemResposta espelha o marcador
// [[sem_resposta]] que o ChatbotIAService remove do texto antes de salvar.
public class MensagemChatbot
{
    public int Id { get; set; }

    public int ConversaId { get; set; }

    public PapelMensagemChatbot Papel { get; private set; }

    public string Texto { get; private set; } = string.Empty;

    public string? AcoesJson { get; private set; }

    public string? FerramentasUsadasJson { get; private set; }

    public bool SemResposta { get; private set; }

    public int TokensEntrada { get; private set; }

    public int TokensSaida { get; private set; }

    public int TokensCacheLeitura { get; private set; }

    public int TokensCacheEscrita { get; private set; }

    public decimal CustoUsd { get; private set; }

    public bool? Util { get; private set; }

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;

    [JsonIgnore]
    [ValidateNever]
    public ConversaChatbot? Conversa { get; set; }

    public static MensagemChatbot CriarDoUsuario(int conversaId, string texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ArgumentException("A mensagem nao pode ser vazia.");
        }

        return new MensagemChatbot
        {
            ConversaId = conversaId,
            Papel = PapelMensagemChatbot.Usuario,
            Texto = texto,
            CriadoEm = DateTime.UtcNow
        };
    }

    public static MensagemChatbot CriarDoAssistente(
        int conversaId,
        string texto,
        string? acoesJson,
        string? ferramentasUsadasJson,
        bool semResposta,
        int tokensEntrada,
        int tokensSaida,
        int tokensCacheLeitura,
        int tokensCacheEscrita,
        decimal custoUsd)
    {
        return new MensagemChatbot
        {
            ConversaId = conversaId,
            Papel = PapelMensagemChatbot.Assistente,
            Texto = texto,
            AcoesJson = acoesJson,
            FerramentasUsadasJson = ferramentasUsadasJson,
            SemResposta = semResposta,
            TokensEntrada = tokensEntrada,
            TokensSaida = tokensSaida,
            TokensCacheLeitura = tokensCacheLeitura,
            TokensCacheEscrita = tokensCacheEscrita,
            CustoUsd = custoUsd,
            CriadoEm = DateTime.UtcNow
        };
    }

    public void RegistrarFeedback(bool util)
    {
        if (Papel != PapelMensagemChatbot.Assistente)
        {
            throw new InvalidOperationException("So e possivel dar feedback em mensagens do Assistente.");
        }

        Util = util;
    }
}
