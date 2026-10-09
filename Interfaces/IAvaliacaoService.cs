using Microsoft.AspNetCore.Http;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IAvaliacaoService
{
    Task<IEnumerable<Avaliacao>> ListarAvaliacoesPorProfessorAsync(int professorId);
    Task<IEnumerable<AvaliacaoAlunoResponseDto>> ListarAvaliacoesPorAlunoAsync(int alunoId);
    Task<Avaliacao> ObterAvaliacaoPorProfessorAsync(int id, int professorId);
    Task<Avaliacao> CriarAvaliacaoAsync(int professorId, CriarAvaliacaoDto dto);
    Task<Avaliacao> AtualizarAvaliacaoAsync(int id, int professorId, AtualizarAvaliacaoDto dto);
    Task ExcluirAvaliacaoAsync(int id, int professorId);
    Task<IEnumerable<QuestaoPublicada>> ListarQuestoesAsync(int avaliacaoId, int professorId);
    Task<IEnumerable<QuestaoAvaliacaoAlunoResponseDto>> ListarQuestoesPorAlunoAsync(int avaliacaoId, int alunoId);
    Task<QuestaoPublicada> AdicionarQuestaoAsync(int avaliacaoId, int professorId, CriarQuestaoAvaliacaoDto dto);
    Task<IEnumerable<QuestaoPublicada>> AdicionarQuestoesEmLoteAsync(int avaliacaoId, int professorId, CriarQuestoesEmLoteDto dto);
    Task<QuestaoPublicada> AtualizarQuestaoAsync(int avaliacaoId, int questaoId, int professorId, AtualizarQuestaoAvaliacaoDto dto);
    Task ReordenarQuestoesAsync(int avaliacaoId, int professorId, ReordenarQuestoesDto dto);
    Task ExcluirQuestaoAsync(int avaliacaoId, int questaoId, int professorId);
    Task<TentativaAvaliacaoAlunoResponseDto> EnviarRespostasAlunoAsync(int avaliacaoId, int alunoId, EnviarAvaliacaoAlunoDto dto);
    Task<RevisaoTentativaResponseDto> ObterRevisaoTentativaAsync(int tentativaId, int alunoId);
    Task<ResultadoGeracaoIA> GerarQuestoesComIaAsync(int avaliacaoId, int professorId, IFormFile arquivo, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken);
    Task<AnexoQuestaoBanco> AdicionarAnexoQuestaoAsync(int questaoBancoId, int professorId, IFormFile arquivo, string titulo, TipoConteudoDidatico tipoAnexo);
    Task RemoverAnexoQuestaoAsync(int questaoBancoId, int anexoId, int professorId);
}
