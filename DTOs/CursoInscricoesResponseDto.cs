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
}
