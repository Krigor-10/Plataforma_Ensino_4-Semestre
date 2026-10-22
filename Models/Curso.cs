using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class Curso
{
    public int Id { get; set; }

    [Required]
    [StringLength(16)]
    public string CodigoRegistro { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(1000)]
    public string Descricao { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Preco { get; set; }

    /// <summary>
    /// Fonte unica de verdade pra "curso gratuito vs pago" — computado a
    /// partir do Preco (sem campo/coluna proprio), pra nunca poder divergir
    /// dele. Nao persistido ([NotMapped]); backend e a fonte de verdade,
    /// frontend so consome este campo.
    /// </summary>
    [NotMapped]
    public bool EhGratuito => Preco <= 0;

    [StringLength(500)]
    public string? ImagemUrl { get; set; }

    public int? CoordenadorId { get; set; }
    public int CriadoPor { get; set; }

    public ModeloCurso ModeloCurso { get; set; } = ModeloCurso.PagoPacote;

    public int? ConcluidoPeloProfessorId { get; private set; }
    public DateTime? ConcluidoPeloProfessorEm { get; private set; }

    public int? EncerradoPorId { get; private set; }
    public DateTime? EncerradoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Coordenador? Coordenador { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Admin? Criador { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Professor? ProfessorConclusao { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Coordenador? EncerradoPor { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<Modulo> Modulos { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<Turma> Turmas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoCursoAluno> ProgressosAlunos { get; set; } = new();

    public void AtribuirCoordenador(Coordenador coordenador)
    {
        ArgumentNullException.ThrowIfNull(coordenador);
        CoordenadorId = coordenador.Id;
        Coordenador = coordenador;
    }

    public void RemoverCoordenador()
    {
        CoordenadorId = null;
        Coordenador = null;
    }

    public void AdicionarModulo(Modulo modulo)
    {
        ArgumentNullException.ThrowIfNull(modulo);
        Modulos.Add(modulo);
    }

    public void ConcluirPeloProfessor(int professorId, DateTime? momento = null)
    {
        if (professorId <= 0)
        {
            throw new ArgumentException("O professor informado e invalido.");
        }

        ConcluidoPeloProfessorId = professorId;
        ConcluidoPeloProfessorEm = momento ?? DateTime.UtcNow;
    }

    public void Encerrar(int coordenadorId, DateTime? momento = null)
    {
        if (coordenadorId <= 0)
        {
            throw new ArgumentException("O coordenador informado e invalido.");
        }

        EncerradoPorId = coordenadorId;
        EncerradoEm = momento ?? DateTime.UtcNow;
    }

    public void Reabrir()
    {
        EncerradoPorId = null;
        EncerradoEm = null;
    }
}
