namespace PlataformaEnsino.API.DTOs;

public class AprovarMatriculasLoteRequestDto
{
    public List<int> MatriculaIds { get; set; } = new();
}

public class AprovacaoMatriculasLoteResultadoDto
{
    public int TotalSolicitado { get; set; }
    public int TotalAprovado => Aprovadas.Count;
    public int TotalComErro => Erros.Count;
    public List<AprovacaoMatriculaItemDto> Aprovadas { get; set; } = new();
    public List<AprovacaoMatriculaErroDto> Erros { get; set; } = new();
}

public class AprovacaoMatriculaItemDto
{
    public int MatriculaId { get; set; }
    public string CodigoRegistro { get; set; } = string.Empty;
    public int AlunoId { get; set; }
    public int CursoId { get; set; }
    public int TurmaId { get; set; }
    public string NomeTurma { get; set; } = string.Empty;
}

public class AprovacaoMatriculaErroDto
{
    public int MatriculaId { get; set; }
    public string CodigoRegistro { get; set; } = string.Empty;
    public string NomeAluno { get; set; } = string.Empty;
    public int CursoId { get; set; }
    public string Motivo { get; set; } = string.Empty;
}
