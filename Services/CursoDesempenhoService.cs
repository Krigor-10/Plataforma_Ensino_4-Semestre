using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/* Agrega dados de progresso/desempenho por CURSO -> MODULO -> MATERIAL/AVALIACAO
   pra experiencia do Coordenador, que navega por curso (nao por turma). So LE
   tabelas ja existentes e mantidas por ProgressoAlunoService/TurmaService
   (ProgressosCursosAlunos, ProgressosModulosAlunos, ProgressosConteudosAlunos,
   TentativasAvaliacao) — nenhuma regra de calculo nova, so agregacao entre
   alunos. Espelha o padrao ja usado em TurmaService.ObterDesempenhoInternoAsync
   (que e por professor/turma) sem alterar aquele arquivo. */
public class CursoDesempenhoService : ICursoDesempenhoService
{
    private readonly PlataformaContext _context;

    public CursoDesempenhoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CursoDesempenhoResponseDto>> ObterDesempenhoPorCoordenadorAsync(int coordenadorId)
        => await ObterDesempenhoInternoAsync(coordenadorId, null);

    public async Task<CursoDesempenhoResponseDto> ObterDesempenhoPorCursoAsync(int cursoId, int coordenadorId)
    {
        var resultado = await ObterDesempenhoInternoAsync(coordenadorId, cursoId);
        return resultado.FirstOrDefault()
            ?? throw new KeyNotFoundException("Curso nao encontrado.");
    }

    private async Task<IEnumerable<CursoDesempenhoResponseDto>> ObterDesempenhoInternoAsync(int coordenadorId, int? cursoIdFiltro)
    {
        var comparadorPtBr = StringComparer.Create(new CultureInfo("pt-BR"), false);

        var cursos = await _context.Cursos
            .AsNoTracking()
            .Where(curso => curso.CoordenadorId == coordenadorId && (!cursoIdFiltro.HasValue || curso.Id == cursoIdFiltro.Value))
            .ToListAsync();

        if (cursos.Count == 0)
        {
            return Enumerable.Empty<CursoDesempenhoResponseDto>();
        }

        var cursoIds = cursos.Select(curso => curso.Id).ToList();

        var professorNomePorCursoId = (await _context.Turmas
            .AsNoTracking()
            .Where(turma => cursoIds.Contains(turma.CursoId))
            .Include(turma => turma.ProfessorResponsavel)
            .ToListAsync())
            .GroupBy(turma => turma.CursoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.First().ProfessorResponsavel?.Nome);

        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Where(matricula => cursoIds.Contains(matricula.CursoId))
            .ToListAsync();
        var matriculaIds = matriculas.Select(matricula => matricula.Id).ToList();
        var matriculasPorCursoId = matriculas
            .GroupBy(matricula => matricula.CursoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var progressoCursoPorMatriculaId = await _context.ProgressosCursosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId))
            .ToDictionaryAsync(progresso => progresso.MatriculaId);

        var modulos = await _context.Modulos
            .AsNoTracking()
            .Where(modulo => cursoIds.Contains(modulo.CursoId))
            .ToListAsync();
        var moduloIds = modulos.Select(modulo => modulo.Id).ToList();
        var modulosPorCursoId = modulos
            .GroupBy(modulo => modulo.CursoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var progressosModuloPorModuloId = (await _context.ProgressosModulosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId) && moduloIds.Contains(progresso.ModuloId))
            .ToListAsync())
            .GroupBy(progresso => progresso.ModuloId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToDictionary(progresso => progresso.MatriculaId));

        var materiais = await _context.ConteudosDidaticos
            .AsNoTracking()
            .Where(material => moduloIds.Contains(material.ModuloId))
            .ToListAsync();
        var materialIds = materiais.Select(material => material.Id).ToList();
        var materiaisPorModuloId = materiais
            .GroupBy(material => material.ModuloId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var progressosMaterialPorConteudoId = (await _context.ProgressosConteudosAlunos
            .AsNoTracking()
            .Where(progresso => matriculaIds.Contains(progresso.MatriculaId) && materialIds.Contains(progresso.ConteudoDidaticoId))
            .ToListAsync())
            .GroupBy(progresso => progresso.ConteudoDidaticoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToDictionary(progresso => progresso.MatriculaId));

        var avaliacoes = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao => avaliacao.ModuloId.HasValue && moduloIds.Contains(avaliacao.ModuloId.Value))
            .ToListAsync();
        var avaliacaoIds = avaliacoes.Select(avaliacao => avaliacao.Id).ToList();
        var avaliacoesPorModuloId = avaliacoes
            .GroupBy(avaliacao => avaliacao.ModuloId!.Value)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.ToList());

        var tentativasCorrigidas = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Where(tentativa => avaliacaoIds.Contains(tentativa.AvaliacaoId) && tentativa.StatusTentativa == StatusTentativaAvaliacao.Corrigida)
            .ToListAsync();

        var estatisticasPorAvaliacaoId = tentativasCorrigidas
            .GroupBy(tentativa => (tentativa.AvaliacaoId, tentativa.MatriculaId))
            .Select(grupo => grupo.OrderByDescending(item => item.NotaBruta).First())
            .GroupBy(tentativa => tentativa.AvaliacaoId)
            .ToDictionary(
                grupo => grupo.Key,
                grupo => (Participantes: grupo.Count(), MediaNota: grupo.Average(item => item.NotaBruta)));

        var resultado = new List<CursoDesempenhoResponseDto>();

        foreach (var curso in cursos)
        {
            var matriculasDoCurso = matriculasPorCursoId.TryGetValue(curso.Id, out var listaMatriculas)
                ? listaMatriculas
                : new List<Matricula>();
            var totalAlunos = matriculasDoCurso.Count;
            var alunosAtivos = matriculasDoCurso.Count(matricula => matricula.Status == StatusMatricula.Aprovada);
            var alunosComNota = matriculasDoCurso.Where(matricula => matricula.NotaFinal > 0).ToList();

            var progressosCursoDoCurso = matriculasDoCurso
                .Select(matricula => progressoCursoPorMatriculaId.TryGetValue(matricula.Id, out var progresso) ? progresso.PercentualConclusao : 0)
                .ToList();
            var concluidosNoCurso = progressosCursoDoCurso.Count(percentual => percentual >= 100);

            var modulosDoCurso = modulosPorCursoId.TryGetValue(curso.Id, out var listaModulos)
                ? listaModulos
                : new List<Modulo>();

            var modulosDto = modulosDoCurso
                .Select(modulo => MontarModuloDto(
                    modulo,
                    matriculasDoCurso,
                    totalAlunos,
                    progressosModuloPorModuloId,
                    materiaisPorModuloId,
                    progressosMaterialPorConteudoId,
                    avaliacoesPorModuloId,
                    estatisticasPorAvaliacaoId,
                    comparadorPtBr))
                .OrderBy(modulo => modulo.Titulo, comparadorPtBr)
                .ToList();

            resultado.Add(new CursoDesempenhoResponseDto
            {
                CursoId = curso.Id,
                CursoTitulo = curso.Titulo,
                ProfessorNome = professorNomePorCursoId.TryGetValue(curso.Id, out var professorNome) ? professorNome : null,
                TotalAlunos = totalAlunos,
                AlunosAtivos = alunosAtivos,
                ProgressoMedio = totalAlunos > 0 ? Math.Round(progressosCursoDoCurso.Average(), 1) : 0,
                PercentualConclusao = totalAlunos > 0 ? Math.Round((decimal)concluidosNoCurso / totalAlunos * 100, 1) : 0,
                DesempenhoMedio = alunosComNota.Count > 0 ? Math.Round(alunosComNota.Average(matricula => matricula.NotaFinal), 2) : 0,
                Modulos = modulosDto
            });
        }

        return resultado
            .OrderBy(curso => curso.CursoTitulo, comparadorPtBr)
            .ToList();
    }

    private static ModuloDesempenhoResponseDto MontarModuloDto(
        Modulo modulo,
        List<Matricula> matriculasDoCurso,
        int totalAlunos,
        Dictionary<int, Dictionary<int, ProgressoModuloAluno>> progressosModuloPorModuloId,
        Dictionary<int, List<ConteudoDidatico>> materiaisPorModuloId,
        Dictionary<int, Dictionary<int, ProgressoConteudoAluno>> progressosMaterialPorConteudoId,
        Dictionary<int, List<Avaliacao>> avaliacoesPorModuloId,
        Dictionary<int, (int Participantes, decimal MediaNota)> estatisticasPorAvaliacaoId,
        StringComparer comparadorPtBr)
    {
        var mapaProgressoModulo = progressosModuloPorModuloId.TryGetValue(modulo.Id, out var mapaModulo)
            ? mapaModulo
            : new Dictionary<int, ProgressoModuloAluno>();

        var progressoMedioModulo = totalAlunos > 0
            ? matriculasDoCurso.Average(matricula =>
                mapaProgressoModulo.TryGetValue(matricula.Id, out var progresso) ? progresso.PercentualConclusao : 0)
            : 0;
        var concluidosNoModulo = matriculasDoCurso.Count(matricula =>
            (mapaProgressoModulo.TryGetValue(matricula.Id, out var progresso) ? progresso.PercentualConclusao : 0) >= 100);
        var progressosComMedia = mapaProgressoModulo.Values.Where(progresso => progresso.MediaModulo > 0).ToList();

        var materiaisDoModulo = materiaisPorModuloId.TryGetValue(modulo.Id, out var listaMateriais)
            ? listaMateriais
            : new List<ConteudoDidatico>();

        var materiaisDto = materiaisDoModulo
            .Select(material =>
            {
                var mapaProgressoMaterial = progressosMaterialPorConteudoId.TryGetValue(material.Id, out var mapaMaterial)
                    ? mapaMaterial
                    : new Dictionary<int, ProgressoConteudoAluno>();

                return new MaterialDesempenhoResponseDto
                {
                    ConteudoDidaticoId = material.Id,
                    Titulo = material.Titulo,
                    TipoConteudo = material.TipoConteudo,
                    StatusPublicacao = material.StatusPublicacao,
                    AlunosConcluiram = mapaProgressoMaterial.Values.Count(progresso => progresso.StatusProgresso == StatusProgressoAprendizagem.Concluido),
                    PercentualConclusao = totalAlunos > 0
                        ? Math.Round(matriculasDoCurso.Average(matricula =>
                            mapaProgressoMaterial.TryGetValue(matricula.Id, out var progresso) ? progresso.PercentualConclusao : 0), 1)
                        : 0
                };
            })
            .OrderBy(material => material.Titulo, comparadorPtBr)
            .ToList();

        var avaliacoesDoModulo = avaliacoesPorModuloId.TryGetValue(modulo.Id, out var listaAvaliacoes)
            ? listaAvaliacoes
            : new List<Avaliacao>();

        var avaliacoesDto = avaliacoesDoModulo
            .Select(avaliacao =>
            {
                var estatistica = estatisticasPorAvaliacaoId.TryGetValue(avaliacao.Id, out var valor)
                    ? valor
                    : (Participantes: 0, MediaNota: 0m);

                return new AvaliacaoDesempenhoResponseDto
                {
                    AvaliacaoId = avaliacao.Id,
                    Titulo = avaliacao.Titulo,
                    TipoAvaliacao = avaliacao.TipoAvaliacao,
                    StatusPublicacao = avaliacao.StatusPublicacao,
                    TotalParticipantes = estatistica.Participantes,
                    MediaNota = Math.Round(estatistica.MediaNota, 2),
                    NotaMaxima = avaliacao.NotaMaxima,
                    PercentualConclusao = totalAlunos > 0
                        ? Math.Round((decimal)estatistica.Participantes / totalAlunos * 100, 1)
                        : 0,
                    PercentualAproveitamento = avaliacao.NotaMaxima > 0
                        ? Math.Round(estatistica.MediaNota / avaliacao.NotaMaxima * 100, 1)
                        : 0
                };
            })
            .OrderBy(avaliacao => avaliacao.Titulo, comparadorPtBr)
            .ToList();

        return new ModuloDesempenhoResponseDto
        {
            ModuloId = modulo.Id,
            Titulo = modulo.Titulo,
            TotalMateriais = materiaisDto.Count,
            ProgressoMedio = Math.Round(progressoMedioModulo, 1),
            PercentualConclusao = totalAlunos > 0 ? Math.Round((decimal)concluidosNoModulo / totalAlunos * 100, 1) : 0,
            DesempenhoMedio = progressosComMedia.Count > 0 ? Math.Round(progressosComMedia.Average(progresso => progresso.MediaModulo), 2) : 0,
            Materiais = materiaisDto,
            Avaliacoes = avaliacoesDto
        };
    }
}
