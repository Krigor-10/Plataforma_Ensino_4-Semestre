using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class Matricula
{
    public int Id { get; set; }

    [Required]
    [StringLength(16)]
    public string CodigoRegistro { get; set; } = string.Empty;

    public DateTime DataSolicitacao { get; private set; } = DateTime.UtcNow;

    [Range(0, 10)]
    public decimal NotaFinal { get; private set; }

    public StatusMatricula Status { get; private set; } = StatusMatricula.Pendente;

    public DateTime? CertificadoEmitidoEm { get; private set; }

    public int AlunoId { get; set; }
    public Aluno? Aluno { get; set; }

    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    public int? TurmaId { get; private set; }
    public Turma? Turma { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public List<TentativaAvaliacao> TentativasAvaliacao { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<LancamentoNotaAluno> LancamentosNota { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoConteudoAluno> ProgressosConteudo { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoModuloAluno> ProgressosModulo { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<ProgressoCursoAluno> ProgressosCurso { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<MarcoProgressoAluno> MarcosProgresso { get; set; } = new();

    public void RegistrarSolicitacao(DateTime? dataSolicitacao = null)
    {
        DataSolicitacao = dataSolicitacao ?? DateTime.UtcNow;
    }

    public void VincularTurma(int turmaId)
    {
        if (turmaId <= 0)
        {
            throw new ArgumentException("A turma informada e invalida.");
        }

        TurmaId = turmaId;
    }

    public void AprovarComTurma(int turmaId, int cursoId)
    {
        if (cursoId <= 0)
        {
            throw new ArgumentException("O curso informado e invalido.");
        }

        VincularTurma(turmaId);
        CursoId = cursoId;
        Aprovar();
    }

    public void Aprovar() => Status = StatusMatricula.Aprovada;
    public void Rejeitar() => Status = StatusMatricula.Rejeitada;
    public void Cancelar() => Status = StatusMatricula.Cancelada;

    public void LancarNotaFinal(decimal nota)
    {
        if (Status != StatusMatricula.Aprovada)
        {
            throw new InvalidOperationException("Só é possível lançar nota final para matrículas aprovadas.");
        }

        if (nota is < 0 or > 10)
        {
            throw new ArgumentException("A nota deve estar entre 0 e 10.");
        }

        NotaFinal = nota;
    }

    public void ZerarNotaFinal()
    {
        NotaFinal = 0;
    }

    public void EmitirCertificado(DateTime? emitidoEm = null)
    {
        CertificadoEmitidoEm ??= emitidoEm ?? DateTime.UtcNow;
    }
}
