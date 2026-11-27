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

    /// <summary>
    /// Modalidade com que o curso nasceu, guardada na PRIMEIRA conversao
    /// (pacote 8 da auditoria de 26/11, decisao D4): Acompanhado ou Gratuito
    /// encerrado que virou Pago ou Gratuito. Null = nunca foi convertido.
    /// </summary>
    public ModeloCurso? ModeloCursoOriginal { get; private set; }

    public int? ConcluidoPeloProfessorId { get; private set; }
    public DateTime? ConcluidoPeloProfessorEm { get; private set; }

    public int? EncerradoPorId { get; private set; }
    public DateTime? EncerradoEm { get; private set; }

    /// <summary>
    /// Quando o Admin publicou este pacote (ModeloCurso.PagoPacote) na home
    /// publica. Null = fora da venda. Um pacote que veio do fluxo Gratuito->
    /// pacote (ConcluidoPeloProfessorEm preenchido) so pode ser republicado
    /// se estiver encerrado (ver CursoService.PublicarParaVendaAsync); um
    /// pacote criado direto nao tem essa exigencia.
    /// </summary>
    public DateTime? PublicadoParaVendaEm { get; private set; }

    /// <summary>
    /// Quando o curso saiu da venda/do catalogo pela ultima vez (pacote 6 da
    /// auditoria de 26/11): diferencia "Fora de venda" (ja foi vendido e foi
    /// retirado) de "nunca publicado". Limpa ao publicar de novo.
    /// </summary>
    public DateTime? RetiradoDaVendaEm { get; private set; }

    /// <summary>
    /// Situacao unica do curso (ver <see cref="SituacaoCurso.Calcular"/>):
    /// abas do Admin, selos e tela Inscricoes leem daqui. Nao persistida.
    /// </summary>
    [NotMapped]
    public string Situacao => SituacaoCurso.Calcular(this);

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

    /// <summary>
    /// Converte o curso pronto em outra modalidade de venda (pacote 8, D1/D4).
    /// Guarda a modalidade de origem so na primeira conversao; encerramento,
    /// conclusao e matriculas continuam como estao (D7).
    /// </summary>
    public void ConverterPara(ModeloCurso destino, decimal preco)
    {
        ModeloCursoOriginal ??= ModeloCurso;
        ModeloCurso = destino;
        Preco = preco;
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

    public void DesfazerConclusao()
    {
        ConcluidoPeloProfessorId = null;
        ConcluidoPeloProfessorEm = null;
    }

    /// <summary>
    /// Regra unica de "curso aceita edicao de conteudo/avaliacao/modulo",
    /// usada tanto pela trava (CursoService.GarantirCursoAbertoParaEdicaoAsync)
    /// quanto pelo recalculo de progresso (ProgressoAlunoService.
    /// RecalcularProgressoDoCursoAsync) - as duas nunca podem divergir.
    /// Pacote 7 da auditoria de 26/11 (regra de 25/11, "Gratuito e Pago so
    /// chegam completos"): trava se estiver PUBLICADO (catalogo/venda),
    /// CONCLUIDO pelo professor ou ENCERRADO, em qualquer modelo. Para
    /// corrigir: o Admin tira da venda/do catalogo e, se estava concluido, o
    /// coordenador devolve ou reabre.
    /// </summary>
    public bool AceitaEdicao()
    {
        return !PublicadoParaVendaEm.HasValue
            && !ConcluidoPeloProfessorEm.HasValue
            && !EncerradoEm.HasValue;
    }

    /// <summary>Mesma regra de <see cref="AceitaEdicao"/>, exposta no JSON pras telas.</summary>
    [NotMapped]
    public bool PermiteEdicaoConteudo => AceitaEdicao();

    /// <summary>
    /// Aparece no catalogo e aceita matricula NOVA (decisao D3 da auditoria
    /// de 26/11): Gratuito e Pago so se publicados pelo Admin, mesmo
    /// encerrados (curso convertido); Acompanhado como antes, ate o
    /// coordenador encerrar. Quem ja tem matricula continua com acesso
    /// sempre (D7). Espelhado em shared/catalogoVisibilidade.js.
    /// </summary>
    [NotMapped]
    public bool DisponivelParaNovosAlunos => ModeloCurso == ModeloCurso.Acompanhado
        ? !EncerradoEm.HasValue
        : PublicadoParaVendaEm.HasValue;

    public void PublicarParaVenda(DateTime? momento = null)
    {
        PublicadoParaVendaEm = momento ?? DateTime.UtcNow;
        RetiradoDaVendaEm = null;
    }

    public void DespublicarDaVenda(DateTime? momento = null)
    {
        if (PublicadoParaVendaEm.HasValue)
        {
            RetiradoDaVendaEm = momento ?? DateTime.UtcNow;
        }

        PublicadoParaVendaEm = null;
    }
}
