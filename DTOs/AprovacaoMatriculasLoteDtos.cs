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
    public string CursoTitulo { get; set; } = string.Empty;

    // Obsoleto: matricula nao depende mais de turma. Mantido (sempre nulo/vazio)
    // so pra nao quebrar o contrato de resposta enquanto o frontend nao for
    // atualizado pra parar de ler esses 2 campos.
    [Obsolete("Matricula nao depende mais de turma - use CursoTitulo.")]
    public int? TurmaId { get; set; }
    [Obsolete("Matricula nao depende mais de turma - use CursoTitulo.")]
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
