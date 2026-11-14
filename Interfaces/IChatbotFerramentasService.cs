using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// As 6 ferramentas só-leitura do Assistente CodeRyse (fluxo-chatbot Fase 1).
/// O id do aluno vem sempre do token (nunca da entrada da ferramenta); todo
/// cursoId é validado contra as matrículas do aluno - métodos com cursoId
/// lançam <see cref="KeyNotFoundException"/> quando o curso não é dele, pra
/// o orquestrador (ChatbotIAService) converter em tool_result com
/// is_error:true.
/// </summary>
public interface IChatbotFerramentasService
{
    Task<IReadOnlyList<CursoDoAlunoFerramentaDto>> ObterMeusCursosAsync(int alunoId);
    Task<ProgressoDoCursoFerramentaDto> ObterProgressoDoCursoAsync(int alunoId, int cursoId);
    Task<IReadOnlyList<SituacaoAvaliacaoFerramentaDto>> ObterSituacaoAvaliacoesAsync(int alunoId, int cursoId);
    Task<SituacaoCertificadoFerramentaDto> ObterSituacaoCertificadoAsync(int alunoId, int cursoId);
    Task<IReadOnlyList<PagamentoFerramentaDto>> ObterMeusPagamentosAsync(int alunoId);

    /// <summary>Até 5 cursos visíveis no catálogo público (mesma regra de shared/catalogoVisibilidade.js) cujo título contém o termo.</summary>
    Task<IReadOnlyList<CursoCatalogoFerramentaDto>> BuscarNoCatalogoAsync(string termo);
}
