using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Resultado da emissao em lote: quantas matriculas aprovadas do curso
/// ganharam o certificado nesta chamada e quantas continuam bloqueadas
/// por alguma pendencia (ver <see cref="ICertificadoService.EmitirCertificadosDoCursoAsync"/>).
/// </summary>
public record ResultadoEmissaoLoteCertificados(int Emitidos, int Bloqueados);

/// <summary>
/// Resultado da checagem de requisitos de certificacao pra uma matricula:
/// Matricula (com Curso/Turma/ProgressosCurso carregados), se o certificado
/// pode ser emitido agora (Pendencias vazia) e as mensagens de pendencia na
/// mesma ordem/texto que EmitirCertificadoAsync usaria pra lancar excecao.
/// </summary>
public record StatusCertificadoMatricula(Matricula Matricula, IReadOnlyList<string> Pendencias)
{
    public bool CertificadoDisponivel => Pendencias.Count == 0;
}

public interface ICertificadoService
{
    Task<Matricula> EmitirCertificadoAsync(int alunoId, int matriculaId);
    Task<IEnumerable<Matricula>> ListarCertificadosDoAlunoAsync(int alunoId);
    Task<Matricula> ObterCertificadoPorCodigoAsync(string codigo);

    /// <summary>
    /// Checa os requisitos de emissao de certificado pra uma matricula sem
    /// gravar nada no banco - mesmas regras de EmitirCertificadoAsync, so
    /// que devolve a lista de pendencias em vez de lancar na primeira.
    /// </summary>
    Task<IReadOnlyList<string>> VerificarRequisitosAsync(Matricula matricula);

    /// <summary>
    /// Status de certificacao (disponivel + pendencias) de todas as
    /// matriculas aprovadas do aluno - usado pela tela de Certificados pra
    /// nao depender de regra calculada no front-end.
    /// </summary>
    Task<IReadOnlyList<StatusCertificadoMatricula>> ListarStatusCertificadosDoAlunoAsync(int alunoId);

    /// <summary>
    /// Emite automaticamente o certificado de cada matricula aprovada do
    /// curso que ja cumpre todos os requisitos (mesma regra de
    /// <see cref="EmitirCertificadoAsync"/>, via ObterPendenciasAsync) -
    /// usado por CursoService.EncerrarCursoAsync pra cursos Acompanhado,
    /// onde o aluno nunca pede o certificado: quem nao cumpre fica
    /// bloqueado ate corrigir a pendencia.
    /// </summary>
    Task<ResultadoEmissaoLoteCertificados> EmitirCertificadosDoCursoAsync(int cursoId);
}
