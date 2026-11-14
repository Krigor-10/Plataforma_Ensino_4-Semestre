namespace PlataformaEnsino.API.DTOs;

/* Visao de leitura do conteudo PUBLICADO de um curso, pro Coordenador (e
   Admin) acompanharem a qualidade do ensino antes de encerrar - ver
   CursoRevisaoConteudoService. Reaproveita ConteudoDidaticoResponseDto e
   QuestaoAvaliacaoResponseDto (ja trazem EhCorreta/Explicacao) em vez de
   duplicar campos. */
public class RevisaoConteudoCursoResponseDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public List<RevisaoConteudoModuloResponseDto> Modulos { get; set; } = new();
    public List<RevisaoConteudoAvaliacaoResponseDto> AvaliacoesSemModulo { get; set; } = new();
}

public class RevisaoConteudoModuloResponseDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public List<ConteudoDidaticoResponseDto> Conteudos { get; set; } = new();
    public List<RevisaoConteudoAvaliacaoResponseDto> Avaliacoes { get; set; } = new();
}

public class RevisaoConteudoAvaliacaoResponseDto
{
    public AvaliacaoResponseDto Avaliacao { get; set; } = new();
    public List<QuestaoAvaliacaoResponseDto> Questoes { get; set; } = new();
}
