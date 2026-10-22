using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class ConteudoDidatico
{
    public int Id { get; set; }

    [Required]
    [StringLength(180)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(500)]
    public string Descricao { get; set; } = string.Empty;

    public TipoConteudoDidatico TipoConteudo { get; set; } = TipoConteudoDidatico.Texto;

    public string CorpoTexto { get; set; } = string.Empty;

    [StringLength(500)]
    public string ArquivoUrl { get; set; } = string.Empty;

    [StringLength(500)]
    public string LinkUrl { get; set; } = string.Empty;

    public int ProfessorAutorId { get; private set; }
    public int TurmaId { get; set; }
    public int CursoId { get; private set; }
    public int ModuloId { get; set; }

    public StatusPublicacao StatusPublicacao { get; private set; } = StatusPublicacao.Rascunho;
    public int OrdemExibicao { get; set; }
    public decimal PesoProgresso { get; set; } = 1;
    public DateTime? PublicadoEm { get; private set; }
    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;
    public DateTime? AtualizadoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Professor? ProfessorAutor { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Turma? Turma { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Modulo? Modulo { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoConteudoAluno> ProgressosAlunos { get; set; } = new();

    public void DefinirProfessorAutor(int professorAutorId)
    {
        if (professorAutorId <= 0)
        {
            throw new ArgumentException("O professor autor informado e invalido.");
        }

        ProfessorAutorId = professorAutorId;
    }

    public void DefinirCurso(int cursoId)
    {
        if (cursoId <= 0)
        {
            throw new ArgumentException("O curso informado e invalido.");
        }

        CursoId = cursoId;
    }

    public void RegistrarCriacao(DateTime? criadoEm = null)
    {
        CriadoEm = criadoEm ?? DateTime.UtcNow;
    }

    public void MarcarAtualizacao(DateTime? atualizadoEm = null)
    {
        AtualizadoEm = atualizadoEm ?? DateTime.UtcNow;
    }

    public void DefinirStatusPublicacao(StatusPublicacao statusPublicacao, DateTime? referencia = null)
    {
        var momentoReferencia = referencia ?? DateTime.UtcNow;

        StatusPublicacao = statusPublicacao;

        if (statusPublicacao == StatusPublicacao.Publicado)
        {
            PublicadoEm ??= momentoReferencia;
            return;
        }

        PublicadoEm = null;
    }
}
