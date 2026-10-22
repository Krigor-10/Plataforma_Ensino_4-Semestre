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

        return subpasta switch
        {
            "conteudos" => await PodeAcessarConteudoAsync(arquivoUrl, alunoId),
            "questoes" => await PodeAcessarAnexoQuestaoAsync(arquivoUrl, alunoId),
            _ => false
        };
    }

    private async Task<bool> PodeAcessarConteudoAsync(string arquivoUrl, int alunoId)
    {
        var cursoId = await _context.ConteudosDidaticos
            .Where(conteudo => conteudo.ArquivoUrl == arquivoUrl)
            .Select(conteudo => (int?)conteudo.CursoId)
            .FirstOrDefaultAsync();

        return cursoId.HasValue && await AlunoTemAcessoNoCursoAsync(cursoId.Value, alunoId);
    }

    private async Task<bool> PodeAcessarAnexoQuestaoAsync(string arquivoUrl, int alunoId)
    {
        var questaoBancoId = await _context.AnexosQuestoesBanco
            .Where(anexo => anexo.ArquivoUrl == arquivoUrl)
            .Select(anexo => (int?)anexo.QuestaoBancoId)
            .FirstOrDefaultAsync();

        if (!questaoBancoId.HasValue)
        {
            return false;
        }

        // Uma questao do banco pode estar publicada em mais de uma avaliacao
        // (cursos diferentes) - basta o aluno ter acesso a uma delas, ja que
        // e o mesmo arquivo de anexo reaproveitado.
        var cursoIds = await _context.QuestoesPublicadas
            .Where(questao => questao.QuestaoBancoId == questaoBancoId.Value)
            .Join(_context.Avaliacoes, questao => questao.AvaliacaoId, avaliacao => avaliacao.Id, (questao, avaliacao) => avaliacao.CursoId)
            .Distinct()
            .ToListAsync();

        foreach (var cursoId in cursoIds)
        {
            if (await AlunoTemAcessoNoCursoAsync(cursoId, alunoId))
            {
                return true;
            }
        }

        return false;
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
