using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class LancamentoNotaAluno
{
    public int Id { get; set; }
    public int MatriculaId { get; set; }
    public int AvaliacaoId { get; set; }
    public int? ModuloId { get; set; }
    public int? TentativaAvaliacaoId { get; set; }
    public int? ProfessorResponsavelId { get; set; }
    public decimal NotaOficial { get; private set; }
    public decimal PesoNota { get; private set; } = 1;
    public OrigemCorrecaoNota OrigemCorrecao { get; private set; } = OrigemCorrecaoNota.Automatica;
    public DateTime? LiberadaAoAlunoEm { get; private set; }
    public string FeedbackProfessor { get; set; } = string.Empty;
    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;
    public DateTime? AtualizadoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Matricula? Matricula { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Avaliacao? Avaliacao { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Modulo? Modulo { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public TentativaAvaliacao? TentativaAvaliacao { get; set; }

    [JsonIgnore]
    [ValidateNever]
    public Professor? ProfessorResponsavel { get; set; }

    public void RegistrarCorrecao(decimal notaOficial, decimal pesoNota, OrigemCorrecaoNota origemCorrecao)
    {
        if (notaOficial < 0)
        {
            throw new ArgumentException("A nota oficial nao pode ser negativa.");
        }

        if (pesoNota <= 0)
        {
            throw new ArgumentException("O peso da nota deve ser maior que zero.");
        }

        NotaOficial = notaOficial;
        PesoNota = pesoNota;
        OrigemCorrecao = origemCorrecao;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void LiberarAoAluno(DateTime? liberadaAoAlunoEm = null)
    {
        LiberadaAoAlunoEm = liberadaAoAlunoEm ?? DateTime.UtcNow;
        AtualizadoEm = LiberadaAoAlunoEm;
    }

    public void MarcarAtualizacao(DateTime? atualizadoEm = null)
    {
        AtualizadoEm = atualizadoEm ?? DateTime.UtcNow;
    }
}
