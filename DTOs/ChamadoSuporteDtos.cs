using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AbrirChamadoDto
{
    public int? ConversaId { get; set; }
    public int? CursoId { get; set; }
    public string Texto { get; set; } = string.Empty;
}

public class ResponderChamadoDto
{
    public string Texto { get; set; } = string.Empty;
}

public class MensagemChamadoResponseDto
{
    public int Id { get; set; }
    public int AutorId { get; set; }
    public string AutorNome { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public DateTime CriadoEm { get; set; }
}

public class ChamadoSuporteResponseDto
{
    public int Id { get; set; }
    public int AlunoId { get; set; }
    public string AlunoNome { get; set; } = string.Empty;
    public int? CursoId { get; set; }
    public string? CursoTitulo { get; set; }
    public int? CoordenadorDestinoId { get; set; }
    public StatusChamadoSuporte Status { get; set; }
    public string Resumo { get; set; } = string.Empty;
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
    public DateTime? ResolvidoEm { get; set; }
    public List<MensagemChamadoResponseDto> Mensagens { get; set; } = new();
}
