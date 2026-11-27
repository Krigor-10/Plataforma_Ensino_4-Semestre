using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class CursoInscricoesResponseDto
{
    public int CursoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? ImagemUrl { get; set; }
    public ModeloCurso ModeloCurso { get; set; }
    /// <summary>
    /// Situacao unica do curso (Models/SituacaoCurso.cs) - a mesma das abas e
    /// selos do Admin. Antes era um enum proprio com outra prioridade.
    /// </summary>
    public string Situacao { get; set; } = SituacaoCurso.EmAndamento;
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
