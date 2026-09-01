using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AvaliacaoResponseDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int ProfessorAutorId { get; set; }
    public int TurmaId { get; set; }
    public string TurmaNome { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int ModuloId { get; set; }
    public string ModuloTitulo { get; set; } = string.Empty;
    public int? ConteudoDidaticoId { get; set; }
    public string ConteudoDidaticoTitulo { get; set; } = string.Empty;
    public TipoAvaliacao TipoAvaliacao { get; set; }
    public StatusPublicacao StatusPublicacao { get; set; }
    public DateTime? DataAbertura { get; set; }
    public DateTime? DataFechamento { get; set; }
    public int TentativasPermitidas { get; set; }
    public int? TempoLimiteMinutos { get; set; }
    public decimal NotaMaxima { get; set; }
    public decimal PesoNota { get; set; }
    public decimal PesoProgresso { get; set; }
    public int TotalQuestoes { get; set; }
    public DateTime? PublicadoEm { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime? AtualizadoEm { get; set; }
}
