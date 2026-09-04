using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class Modulo
{
    public int Id { get; set; }

    [Required]
    [StringLength(16)]
    public string CodigoRegistro { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Titulo { get; set; } = string.Empty;

    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<ConteudoDidatico> ConteudosDidaticos { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<Avaliacao> Avaliacoes { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<LancamentoNotaAluno> LancamentosNota { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoConteudoAluno> ProgressosConteudo { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoModuloAluno> ProgressosAlunos { get; set; } = new();

    public void AlterarTitulo(string novoTitulo)
    {
        if (string.IsNullOrWhiteSpace(novoTitulo))
        {
            throw new ArgumentException("O título do módulo é obrigatório.");
        }

        Titulo = novoTitulo;
    }
}
