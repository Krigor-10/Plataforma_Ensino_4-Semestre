using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

// Contexto da tela onde o aluno abriu o chat (enviado pelo frontend) - vai
// no texto da mensagem do usuario, depois do ponto de cache (ver
// ChatbotIAService). So prefixo curto, nao influencia o prompt de sistema.
public class ContextoTelaChatbotDto
{
    public string Tela { get; set; } = string.Empty;
    public int? CursoId { get; set; }
    public string? CursoTitulo { get; set; }
}

public class EnviarMensagemChatbotDto
{
    public int? ConversaId { get; set; }
    public string Texto { get; set; } = string.Empty;
    public ContextoTelaChatbotDto? Contexto { get; set; }
}

public class AcaoChatbotDto
{
    public string Rota { get; set; } = string.Empty;
    public string Rotulo { get; set; } = string.Empty;
}

// Resposta nao-streaming (?stream=false, usada pelo mobile) - o texto ja
// vem completo, sem precisar remontar pedacos de SSE.
public class EnviarMensagemChatbotRespostaDto
{
    public int ConversaId { get; set; }
    public int MensagemId { get; set; }
    public string Texto { get; set; } = string.Empty;
    public List<AcaoChatbotDto> Acoes { get; set; } = new();
    public bool SemResposta { get; set; }
}

public class MensagemChatbotResponseDto
{
    public int Id { get; set; }
    public PapelMensagemChatbot Papel { get; set; }
    public string Texto { get; set; } = string.Empty;
    public List<AcaoChatbotDto> Acoes { get; set; } = new();
    public bool SemResposta { get; set; }
    public bool? Util { get; set; }
    public DateTime CriadoEm { get; set; }
}

public class ConversaChatbotResponseDto
{
    public int Id { get; set; }
    public List<MensagemChatbotResponseDto> Mensagens { get; set; } = new();
}

public class FeedbackMensagemChatbotDto
{
    public bool Util { get; set; }
}

public class ConfiguracaoChatbotResponseDto
{
    public bool Ativo { get; set; }
    public decimal TetoMensalUsd { get; set; }
}

public class AtualizarConfiguracaoChatbotDto
{
    public bool Ativo { get; set; }
    public decimal TetoMensalUsd { get; set; }
}

public class UsoChatbotResponseDto
{
    public decimal GastoMesUsd { get; set; }
    public decimal TetoMensalUsd { get; set; }
    public int QuantidadePerguntasMes { get; set; }
}

// ---------- Ferramentas (so leitura, sempre do aluno do token) ----------

public class CursoDoAlunoFerramentaDto
{
    public int CursoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string SituacaoMatricula { get; set; } = string.Empty;
    public decimal PercentualProgresso { get; set; }
    public bool PagamentoPendente { get; set; }
}

public class ModuloProgressoFerramentaDto
{
    public int ModuloId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public bool Liberado { get; set; }
    public decimal PercentualConclusao { get; set; }
    public int ConteudosConcluidos { get; set; }
    public int TotalConteudos { get; set; }
}

public class ProgressoDoCursoFerramentaDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public List<ModuloProgressoFerramentaDto> Modulos { get; set; } = new();
}

public class SituacaoAvaliacaoFerramentaDto
{
    public int AvaliacaoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public bool Liberada { get; set; }
    public string? Motivo { get; set; }
    public int TentativasPermitidas { get; set; }
    public int TentativasRealizadas { get; set; }
    public int TentativasRestantes { get; set; }
    public DateTime? Prazo { get; set; }
    public decimal? UltimaNota { get; set; }
}

public class SituacaoCertificadoFerramentaDto
{
    public int CursoId { get; set; }
    public bool Disponivel { get; set; }
    public List<string> Pendencias { get; set; } = new();
}

public class PagamentoFerramentaDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime DataCompra { get; set; }
    public DateTime? DataPagamento { get; set; }
}

public class CursoCatalogoFerramentaDto
{
    public int CursoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public decimal Preco { get; set; }
}
