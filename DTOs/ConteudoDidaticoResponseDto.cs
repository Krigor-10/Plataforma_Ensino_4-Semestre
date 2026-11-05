using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class ConteudoDidaticoResponseDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public TipoConteudoDidatico TipoConteudo { get; set; }
    public string CorpoTexto { get; set; } = string.Empty;
    public string ArquivoUrl { get; set; } = string.Empty;
    public string LinkUrl { get; set; } = string.Empty;
    public int ProfessorAutorId { get; set; }
    public int? TurmaId { get; set; }
    public string TurmaNome { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int ModuloId { get; set; }
    public string ModuloTitulo { get; set; } = string.Empty;
    public StatusPublicacao StatusPublicacao { get; set; }
    public int OrdemExibicao { get; set; }
    public decimal PesoProgresso { get; set; }
    public DateTime? PublicadoEm { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime? AtualizadoEm { get; set; }
}
