using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/* Visao de leitura (Parte 3/3 do fluxo-coordenador) do conteudo PUBLICADO de
   um curso - modulos, materiais e avaliacoes com questoes/gabarito - pro
   Coordenador (e Admin) acompanharem a qualidade do ensino antes de
   encerrar. So LE: nenhuma rota de escrita usa este servico. A checagem de
   posse (Admin sempre; Coordenador so dono) fica no controller via
   ICursoAutorizacaoService.PodeGerenciarCursoAsync, igual ao padrao de
   desempenho/{id} em CursosController. */
public class CursoRevisaoConteudoService : ICursoRevisaoConteudoService
{
    private readonly PlataformaContext _context;

    public CursoRevisaoConteudoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<RevisaoConteudoCursoResponseDto> ObterRevisaoConteudoAsync(int cursoId)
    {
        var comparadorPtBr = StringComparer.Create(new CultureInfo("pt-BR"), false);

        var curso = await _context.Cursos
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == cursoId)
            ?? throw new KeyNotFoundException("Curso nao encontrado.");

        var modulos = await _context.Modulos
            .AsNoTracking()
            .Where(modulo => modulo.CursoId == cursoId)
            .OrderBy(modulo => modulo.DataCriacao)
            .ToListAsync();
        var moduloIds = modulos.Select(modulo => modulo.Id).ToList();

        var materiaisPorModuloId = (await _context.ConteudosDidaticos
            .AsNoTracking()
            .Include(conteudo => conteudo.Turma)
            .Include(conteudo => conteudo.Modulo!)
                .ThenInclude(modulo => modulo.Curso)
            .Where(conteudo => moduloIds.Contains(conteudo.ModuloId)
                && conteudo.StatusPublicacao == StatusPublicacao.Publicado
                && conteudo.ExcluidoEm == null)
            .ToListAsync())
            .GroupBy(conteudo => conteudo.ModuloId)
            .ToDictionary(
                grupo => grupo.Key,
                grupo => grupo
                    .OrderBy(conteudo => conteudo.OrdemExibicao)
                    .ThenBy(conteudo => conteudo.Titulo, comparadorPtBr)
                    .ToList());

        var avaliacoes = await _context.Avaliacoes
            .AsNoTracking()
            .Include(avaliacao => avaliacao.Turma)
            .Include(avaliacao => avaliacao.Modulo!)
                .ThenInclude(modulo => modulo.Curso)
            .Include(avaliacao => avaliacao.ConteudoDidatico)
            .Where(avaliacao => avaliacao.CursoId == cursoId && avaliacao.StatusPublicacao == StatusPublicacao.Publicado)
            .ToListAsync();
        var avaliacaoIds = avaliacoes.Select(avaliacao => avaliacao.Id).ToList();

        var questoesPorAvaliacaoId = (await _context.QuestoesPublicadas
            .AsNoTracking()
            .Include(questao => questao.Alternativas)
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco!)
                .ThenInclude(questaoBanco => questaoBanco.Anexos)
            .Where(questao => avaliacaoIds.Contains(questao.AvaliacaoId))
            .OrderBy(questao => questao.Ordem)
            .ToListAsync())
            .GroupBy(questao => questao.AvaliacaoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        RevisaoConteudoAvaliacaoResponseDto MontarAvaliacaoDto(Avaliacao avaliacao)
        {
            var questoesDaAvaliacao = questoesPorAvaliacaoId.TryGetValue(avaliacao.Id, out var lista)
                ? lista
                : new List<QuestaoPublicada>();

            avaliacao.Questoes = questoesDaAvaliacao;

            return new RevisaoConteudoAvaliacaoResponseDto
            {
                Avaliacao = avaliacao.ParaResponseDto(),
                Questoes = questoesDaAvaliacao.Select(questao => questao.ParaResponseDto()).ToList()
            };
        }

        var avaliacoesPorModuloId = avaliacoes
            .Where(avaliacao => avaliacao.ModuloId.HasValue)
            .GroupBy(avaliacao => avaliacao.ModuloId!.Value)
            .ToDictionary(
                grupo => grupo.Key,
                grupo => grupo
                    .OrderBy(avaliacao => avaliacao.Titulo, comparadorPtBr)
                    .Select(MontarAvaliacaoDto)
                    .ToList());

        var avaliacoesSemModulo = avaliacoes
            .Where(avaliacao => !avaliacao.ModuloId.HasValue)
            .OrderBy(avaliacao => avaliacao.Titulo, comparadorPtBr)
            .Select(MontarAvaliacaoDto)
            .ToList();

        var modulosDto = modulos
            .Select(modulo => new RevisaoConteudoModuloResponseDto
            {
                Id = modulo.Id,
                Titulo = modulo.Titulo,
                Conteudos = (materiaisPorModuloId.TryGetValue(modulo.Id, out var materiais) ? materiais : new List<ConteudoDidatico>())
                    .Select(conteudo => conteudo.ParaResponseDto())
                    .ToList(),
                Avaliacoes = avaliacoesPorModuloId.TryGetValue(modulo.Id, out var avaliacoesDoModulo)
                    ? avaliacoesDoModulo
                    : new List<RevisaoConteudoAvaliacaoResponseDto>()
            })
            .ToList();

        return new RevisaoConteudoCursoResponseDto
        {
            CursoId = curso.Id,
            CursoTitulo = curso.Titulo,
            Modulos = modulosDto,
            AvaliacoesSemModulo = avaliacoesSemModulo
        };
    }
}
