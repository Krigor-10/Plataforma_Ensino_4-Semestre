using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

// Modelado/migrado mas sem escritor: nenhum Service grava aqui hoje (auditoria 2026-09-04).
// So e lido em ModuloRepository (guard de exclusao de modulo), que por isso nunca dispara.
public class MarcoProgressoAluno
{
    public int Id { get; set; }
    public int MatriculaId { get; set; }
    public EscopoMarcoProgresso Escopo { get; set; } = EscopoMarcoProgresso.Curso;
    public int CursoId { get; set; }
    public int? ModuloId { get; set; }
    public OrigemMarcoProgresso Origem { get; set; } = OrigemMarcoProgresso.Recalculo;
    public decimal PercentualMarco { get; set; }
    public int? ReferenciaId { get; set; }
    public DateTime GeradoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessadoEm { get; set; }
    public string Observacao { get; set; } = string.Empty;

    [JsonIgnore]
    [ValidateNever]
    public Matricula? Matricula { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Curso? Curso { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Modulo? Modulo { get; set; }
}
