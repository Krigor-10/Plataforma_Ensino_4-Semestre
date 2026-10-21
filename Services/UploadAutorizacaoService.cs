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
        var turmaId = await _context.ConteudosDidaticos
            .Where(conteudo => conteudo.ArquivoUrl == arquivoUrl)
            .Select(conteudo => (int?)conteudo.TurmaId)
            .FirstOrDefaultAsync();

        return turmaId.HasValue && await AlunoTemAcessoNaTurmaAsync(turmaId.Value, alunoId);
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
        // (turmas diferentes) - basta o aluno ter acesso a uma delas, ja que
        // e o mesmo arquivo de anexo reaproveitado.
        var turmaIds = await _context.QuestoesPublicadas
            .Where(questao => questao.QuestaoBancoId == questaoBancoId.Value)
            .Join(_context.Avaliacoes, questao => questao.AvaliacaoId, avaliacao => avaliacao.Id, (questao, avaliacao) => avaliacao.TurmaId)
            .Distinct()
            .ToListAsync();

        foreach (var turmaId in turmaIds)
        {
            if (await AlunoTemAcessoNaTurmaAsync(turmaId, alunoId))
            {
                return true;
            }
        }

        return false;
    }

    private async Task<bool> AlunoTemAcessoNaTurmaAsync(int turmaId, int alunoId)
    {
        var matricula = await _context.Matriculas
            .Include(item => item.Curso)
            .FirstOrDefaultAsync(item =>
                item.AlunoId == alunoId &&
                item.TurmaId == turmaId &&
                item.Status == StatusMatricula.Aprovada);

        return matricula is not null && await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula);
    }
}
