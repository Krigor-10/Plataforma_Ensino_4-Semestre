using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

/// <summary>
/// Vinculo direto Professor-Curso (N:N) - substitui Turma.ProfessorId como
/// mecanismo de atribuicao de professor a um curso. Um curso pode ter mais
/// de um professor (ex.: turmas diferentes com professores diferentes no
/// modelo antigo), por isso N:N em vez de um unico ProfessorId em Curso.
/// </summary>
public class ProfessorCurso
{
    public int Id { get; set; }

    public int ProfessorId { get; set; }
    public int CursoId { get; set; }

    public DateTime VinculadoEm { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    [ValidateNever]
    public Professor? Professor { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Curso? Curso { get; set; }
}
