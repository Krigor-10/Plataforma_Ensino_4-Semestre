using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class Avaliacao
{
    public int Id { get; set; }

    [Required]
    [StringLength(180)]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(500)]
    public string Descricao { get; set; } = string.Empty;

    public int ProfessorAutorId { get; private set; }
    public int TurmaId { get; set; }
    public int? ModuloId { get; set; }
    public int? ConteudoDidaticoId { get; set; }

    public TipoAvaliacao TipoAvaliacao { get; set; } = TipoAvaliacao.Quiz;
    public StatusPublicacao StatusPublicacao { get; private set; } = StatusPublicacao.Rascunho;
    public DateTime? DataAbertura { get; set; }
    public DateTime? DataFechamento { get; set; }
    public int TentativasPermitidas { get; private set; } = 1;
    public int? TempoLimiteMinutos { get; set; }
    public decimal NotaMaxima { get; set; } = 10;
    public decimal PesoNota { get; set; } = 1;
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
    public ConteudoDidatico? ConteudoDidatico { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<QuestaoPublicada> Questoes { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<TentativaAvaliacao> Tentativas { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<LancamentoNotaAluno> LancamentosNota { get; set; } = new();

    public void DefinirAutor(int professorAutorId)
    {
        if (professorAutorId <= 0)
        {
            throw new ArgumentException("O professor autor informado e invalido.");
        }

        ProfessorAutorId = professorAutorId;
    }

    public void DefinirTentativasPermitidas(int tentativasPermitidas)
    {
        if (tentativasPermitidas <= 0)
        {
            throw new ArgumentException("A quantidade de tentativas permitidas deve ser maior que zero.");
        }

        TentativasPermitidas = tentativasPermitidas;
    }

    public void Publicar(DateTime? publicadoEm = null)
    {
        StatusPublicacao = StatusPublicacao.Publicado;
        PublicadoEm = publicadoEm ?? DateTime.UtcNow;
        AtualizadoEm = publicadoEm ?? DateTime.UtcNow;
    }

    public void Arquivar(DateTime? atualizadoEm = null)
    {
        StatusPublicacao = StatusPublicacao.Arquivado;
        AtualizadoEm = atualizadoEm ?? DateTime.UtcNow;
    }

    public void VoltarParaRascunho(DateTime? atualizadoEm = null)
    {
        StatusPublicacao = StatusPublicacao.Rascunho;
        PublicadoEm = null;
        AtualizadoEm = atualizadoEm ?? DateTime.UtcNow;
    }

    public void MarcarAtualizacao(DateTime? atualizadoEm = null)
    {
        AtualizadoEm = atualizadoEm ?? DateTime.UtcNow;
    }
}
