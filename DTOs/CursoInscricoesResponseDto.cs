using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Situacao de vendas/ciclo de vida do curso pra tela Inscricoes do Admin -
/// nao confundir com StatusPublicacao (de conteudo/avaliacao). Ordem das
/// regras quando mais de uma se aplica (ex.: pacote vindo do fluxo
/// Gratuito->pacote, encerrado E a venda ao mesmo tempo): Encerrado vence
/// AVenda vence AguardandoEncerramento vence EmAndamento - mesma ordem do
/// PROMPT-agente-tela-inscricoes.md.
/// </summary>
public enum SituacaoCursoInscricoes
{
    EmAndamento = 1,
    AguardandoEncerramento = 2,
    Encerrado = 3,
    AVenda = 4
}

public class CursoInscricoesResponseDto
{
    public int CursoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? ImagemUrl { get; set; }
    public ModeloCurso ModeloCurso { get; set; }
    public SituacaoCursoInscricoes Situacao { get; set; }
    public decimal Preco { get; set; }
    public int Inscritos { get; set; }
    public int Comecaram { get; set; }
    public int Concluiram { get; set; }
    public int ComCertificado { get; set; }
    public int Pendentes { get; set; }
    public decimal Receita { get; set; }

    /// <summary>
    /// Campos de vendas (PROMPT-agente-inscricoes-v3.md, aba "Vendas" da
    /// tela Inscricoes do Admin) - mesmo periodo de Pendentes (pela
    /// DataSolicitacao da matricula), nao o de Receita (que usa PagoEm).
    /// </summary>
    public decimal AReceber { get; set; }
    public int Cancelados { get; set; }
    public decimal ValorCancelado { get; set; }

    /// <summary>
    /// Matriculas de curso PAGO com pelo menos um pagamento (de qualquer
    /// status) - TentativasCompra; Compraram e o subconjunto com pagamento
    /// Pago. Curso Gratuito sempre fica em 0/0 (conversao "-" no frontend).
    /// </summary>
    public int TentativasCompra { get; set; }
    public int Compraram { get; set; }
}
