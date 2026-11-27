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

    /// <summary>
    /// Dados impressos no certificado, CONGELADOS na emissao (decisao F2 da
    /// auditoria de 26/11, docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-2026-
    /// 11-26.md): mudar depois o nome do aluno, o titulo do curso ou a nota
    /// (refazer prova) nao altera um certificado ja emitido. Mesmo padrao do
    /// NomeTurmaSnapshot. Null so em certificado nao emitido.
    /// </summary>
    [StringLength(150)]
    public string? NomeAlunoCertificado { get; private set; }

    [StringLength(150)]
    public string? TituloCursoCertificado { get; private set; }

    public decimal? NotaFinalCertificado { get; private set; }

    /// <summary>
    /// Revogacao manual pelo Admin (decisao F3): o certificado continua
    /// valido por padrao mesmo se o aluno perder o acesso; so deixa de valer
    /// se o Admin revogar, com motivo. A verificacao publica mostra a data,
    /// nunca o motivo.
    /// </summary>
    public DateTime? CertificadoRevogadoEm { get; private set; }
    public int? CertificadoRevogadoPorId { get; private set; }

    [StringLength(300)]
    public string? MotivoRevogacaoCertificado { get; private set; }

    public int AlunoId { get; set; }
    public Aluno? Aluno { get; set; }

    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    /// <summary>
    /// Preco do curso CONGELADO no momento desta matricula — fonte de verdade
    /// pra decisao de acesso (ver AcessoAcademicoService.MatriculaTemAcessoLiberado),
    /// nunca Curso.Preco ao vivo. Garante que um aluno que entrou de graca
    /// nao perde acesso se o curso virar pago depois (ex.: fluxo Gratuito ->
    /// pacote pago).
    /// </summary>
    public decimal ValorNaMatricula { get; private set; }

    public int? TurmaId { get; private set; }
    public Turma? Turma { get; set; }

    /// <summary>
    /// Copia congelada de Turma.NomeTurma, preenchida so por migration (backfill
    /// das matriculas que ja tinham TurmaId antes da Fase B remover Turma do
    /// fluxo ativo) - garante que certificados antigos (pagina publica de
    /// verificacao) e o "Turma atual" do Aluno continuem mostrando o nome mesmo
    /// depois que a tabela Turmas for removida de vez.
    /// </summary>
    [StringLength(120)]
    public string? NomeTurmaSnapshot { get; set; }

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
    public List<Pagamento> Pagamentos { get; set; } = new();

    public void RegistrarSolicitacao(DateTime? dataSolicitacao = null)
    {
        DataSolicitacao = dataSolicitacao ?? DateTime.UtcNow;
    }

    public void DefinirValorNaMatricula(decimal valor)
    {
        if (valor < 0)
        {
            throw new ArgumentException("O valor da matricula nao pode ser negativo.");
        }

        ValorNaMatricula = valor;
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
    public void Cancelar() => Status = StatusMatricula.Cancelada;

    public void Reabrir()
    {
        Status = StatusMatricula.Pendente;
        RegistrarSolicitacao(DateTime.UtcNow);
    }

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

    /// <summary>
    /// Emite uma unica vez e congela nome, titulo e nota final do momento
    /// (Aluno e Curso precisam estar carregados - CertificadoService sempre
    /// carrega). Chamadas seguidas nao mudam nada.
    /// </summary>
    public void EmitirCertificado(DateTime? emitidoEm = null)
    {
        if (CertificadoEmitidoEm.HasValue)
        {
            return;
        }

        CertificadoEmitidoEm = emitidoEm ?? DateTime.UtcNow;
        NomeAlunoCertificado = Aluno?.Nome;
        TituloCursoCertificado = Curso?.Titulo;
        NotaFinalCertificado = NotaFinal;
    }

    public void RevogarCertificado(int revogadoPorId, string motivo, DateTime? revogadoEm = null)
    {
        if (!CertificadoEmitidoEm.HasValue)
        {
            throw new InvalidOperationException("Esta matricula nao tem certificado emitido.");
        }

        if (CertificadoRevogadoEm.HasValue)
        {
            throw new InvalidOperationException("Este certificado ja foi revogado.");
        }

        var motivoTratado = (motivo ?? string.Empty).Trim();
        if (motivoTratado.Length < 5 || motivoTratado.Length > 300)
        {
            throw new ArgumentException("Informe o motivo da revogacao (de 5 a 300 caracteres).");
        }

        CertificadoRevogadoEm = revogadoEm ?? DateTime.UtcNow;
        CertificadoRevogadoPorId = revogadoPorId;
        MotivoRevogacaoCertificado = motivoTratado;
    }
}
