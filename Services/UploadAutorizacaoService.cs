using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class UploadAutorizacaoService : IUploadAutorizacaoService
{
    private readonly PlataformaContext _context;
    private readonly IAcessoAcademicoService _acessoAcademicoService;

    public UploadAutorizacaoService(PlataformaContext context, IAcessoAcademicoService acessoAcademicoService)
    {
        _context = context;
        _acessoAcademicoService = acessoAcademicoService;
    }

    public async Task<bool> AlunoPodeAcessarArquivoAsync(string subpasta, string nomeArquivo, int alunoId)
    {
        var arquivoUrl = $"/uploads/{subpasta}/{nomeArquivo}";

        var cursoIds = await ObterCursoIdsDoArquivoAsync(subpasta, arquivoUrl);
        foreach (var cursoId in cursoIds)
        {
            if (await AlunoTemAcessoNoCursoAsync(cursoId, alunoId))
            {
                return true;
            }
        }

        return false;
    }

    public async Task<bool> CoordenadorPodeAcessarArquivoAsync(string subpasta, string nomeArquivo, int coordenadorId)
    {
        var arquivoUrl = $"/uploads/{subpasta}/{nomeArquivo}";

        var cursoIds = await ObterCursoIdsDoArquivoAsync(subpasta, arquivoUrl);
        if (cursoIds.Count == 0)
        {
            return false;
        }

        return await _context.Cursos
            .AsNoTracking()
            .AnyAsync(curso => cursoIds.Contains(curso.Id) && curso.CoordenadorId == coordenadorId);
    }

    private async Task<List<int>> ObterCursoIdsDoArquivoAsync(string subpasta, string arquivoUrl)
    {
        return subpasta switch
        {
            "conteudos" => await ObterCursoIdsDoConteudoAsync(arquivoUrl),
            "questoes" => await ObterCursoIdsDoAnexoQuestaoAsync(arquivoUrl),
            _ => new List<int>()
        };
    }

    private async Task<List<int>> ObterCursoIdsDoConteudoAsync(string arquivoUrl)
    {
        var cursoId = await _context.ConteudosDidaticos
            .Where(conteudo => conteudo.ArquivoUrl == arquivoUrl)
            .Select(conteudo => (int?)conteudo.CursoId)
            .FirstOrDefaultAsync();

        return cursoId.HasValue ? new List<int> { cursoId.Value } : new List<int>();
    }

    // Uma questao do banco pode estar publicada em mais de uma avaliacao
    // (cursos diferentes) - basta ter acesso a uma delas, ja que e o mesmo
    // arquivo de anexo reaproveitado.
    private async Task<List<int>> ObterCursoIdsDoAnexoQuestaoAsync(string arquivoUrl)
    {
        var questaoBancoId = await _context.AnexosQuestoesBanco
            .Where(anexo => anexo.ArquivoUrl == arquivoUrl)
            .Select(anexo => (int?)anexo.QuestaoBancoId)
            .FirstOrDefaultAsync();

        if (!questaoBancoId.HasValue)
        {
            return new List<int>();
        }

        return await _context.QuestoesPublicadas
            .Where(questao => questao.QuestaoBancoId == questaoBancoId.Value)
            .Join(_context.Avaliacoes, questao => questao.AvaliacaoId, avaliacao => avaliacao.Id, (questao, avaliacao) => avaliacao.CursoId)
            .Distinct()
            .ToListAsync();
    }

    private async Task<bool> AlunoTemAcessoNoCursoAsync(int cursoId, int alunoId)
    {
        var matricula = await _context.Matriculas
            .Include(item => item.Curso)
            .FirstOrDefaultAsync(item =>
                item.AlunoId == alunoId &&
                item.CursoId == cursoId &&
                item.Status == StatusMatricula.Aprovada);

        return matricula is not null && await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula);
    }
}
