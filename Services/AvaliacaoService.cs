using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class AvaliacaoService : IAvaliacaoService
{
    private readonly PlataformaContext _context;
    private readonly IProgressoAlunoService _progressoAlunoService;
    private readonly INotificacaoService _notificacaoService;

    public AvaliacaoService(PlataformaContext context, IProgressoAlunoService progressoAlunoService, INotificacaoService notificacaoService)
    {
        _context = context;
        _progressoAlunoService = progressoAlunoService;
        _notificacaoService = notificacaoService;
    }

    public async Task<IEnumerable<Avaliacao>> ListarAvaliacoesPorProfessorAsync(int professorId)
    {
        await ValidarProfessorAsync(professorId);

        return await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao => avaliacao.ProfessorAutorId == professorId)
            .Include(avaliacao => avaliacao.Turma)
            .Include(avaliacao => avaliacao.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .Include(avaliacao => avaliacao.ConteudoDidatico)
            .Include(avaliacao => avaliacao.Questoes)
            .OrderBy(avaliacao => avaliacao.Turma!.NomeTurma)
            .ThenBy(avaliacao => avaliacao.Modulo!.Titulo)
            .ThenBy(avaliacao => avaliacao.DataAbertura ?? avaliacao.CriadoEm)
            .ThenBy(avaliacao => avaliacao.Titulo)
            .ToListAsync();
    }

    public async Task<IEnumerable<AvaliacaoAlunoResponseDto>> ListarAvaliacoesPorAlunoAsync(int alunoId)
    {
        await ValidarAlunoAsync(alunoId);

        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Where(matricula =>
                matricula.AlunoId == alunoId &&
                matricula.Status == StatusMatricula.Aprovada &&
                matricula.TurmaId.HasValue)
            .ToListAsync();

        if (matriculas.Count == 0)
        {
            return Enumerable.Empty<AvaliacaoAlunoResponseDto>();
        }

        var turmaIds = matriculas.Select(matricula => matricula.TurmaId!.Value).Distinct().ToList();
        var matriculaPorTurmaId = matriculas
            .GroupBy(matricula => matricula.TurmaId!.Value)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.First().Id);
        var matriculaIds = matriculas.Select(matricula => matricula.Id).ToList();

        var tentativas = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Where(tentativa => matriculaIds.Contains(tentativa.MatriculaId))
            .ToListAsync();
        var tentativasPorAvaliacao = tentativas
            .GroupBy(tentativa => tentativa.AvaliacaoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.OrderBy(item => item.NumeroTentativa).ToList());

        var avaliacoes = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                turmaIds.Contains(avaliacao.TurmaId))
            .Include(avaliacao => avaliacao.Turma)
            .Include(avaliacao => avaliacao.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .Include(avaliacao => avaliacao.ConteudoDidatico)
            .Include(avaliacao => avaliacao.Questoes)
            .OrderBy(avaliacao => avaliacao.DataAbertura ?? avaliacao.PublicadoEm ?? avaliacao.CriadoEm)
            .ThenBy(avaliacao => avaliacao.Turma!.NomeTurma)
            .ThenBy(avaliacao => avaliacao.Modulo!.Titulo)
            .ThenBy(avaliacao => avaliacao.Titulo)
            .ToListAsync();

        return avaliacoes.Select(avaliacao =>
            MapAvaliacaoAluno(
                avaliacao,
                matriculaPorTurmaId[avaliacao.TurmaId],
                tentativasPorAvaliacao.TryGetValue(avaliacao.Id, out var tentativasAvaliacao)
                    ? tentativasAvaliacao
                    : new List<TentativaAvaliacao>()));
    }

    public async Task<Avaliacao> ObterAvaliacaoPorProfessorAsync(int id, int professorId)
    {
        await ValidarProfessorAsync(professorId);

        var avaliacao = await ObterDetalheAsync(id)
            ?? throw new KeyNotFoundException("Avaliacao nao encontrada.");

        if (avaliacao.ProfessorAutorId != professorId)
        {
            throw new KeyNotFoundException("Avaliacao nao encontrada.");
        }

        return avaliacao;
    }

    public async Task<Avaliacao> CriarAvaliacaoAsync(int professorId, CriarAvaliacaoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        await ValidarProfessorAsync(professorId);
        var turma = await ValidarTurmaDoProfessorAsync(professorId, dto.TurmaId);
        var modulo = await ValidarModuloAsync(dto.ModuloId);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);
        var material = await ValidarMaterialAsync(dto.ConteudoDidaticoId, turma, modulo);

        var avaliacao = new Avaliacao
        {
            TurmaId = turma.Id,
            ModuloId = modulo.Id,
            ConteudoDidaticoId = material?.Id
        };
        avaliacao.DefinirAutor(professorId);

        AplicarDados(avaliacao, dto);

        await _context.Avaliacoes.AddAsync(avaliacao);
        await _context.SaveChangesAsync();

        return await ObterDetalheAsync(avaliacao.Id) ?? avaliacao;
    }

    public async Task<Avaliacao> AtualizarAvaliacaoAsync(int id, int professorId, AtualizarAvaliacaoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var avaliacao = await ObterAvaliacaoPorProfessorAsync(id, professorId);
        var turma = await ValidarTurmaDoProfessorAsync(professorId, dto.TurmaId);
        var modulo = await ValidarModuloAsync(dto.ModuloId);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);
        var material = await ValidarMaterialAsync(dto.ConteudoDidaticoId, turma, modulo);

        avaliacao.TurmaId = turma.Id;
        avaliacao.ModuloId = modulo.Id;
        avaliacao.ConteudoDidaticoId = material?.Id;
        AplicarDados(avaliacao, dto);

        _context.Avaliacoes.Update(avaliacao);
        await _context.SaveChangesAsync();

        return await ObterDetalheAsync(id) ?? avaliacao;
    }

    public async Task ExcluirAvaliacaoAsync(int id, int professorId)
    {
        var avaliacao = await ObterAvaliacaoPorProfessorAsync(id, professorId);

        var possuiTentativas = await _context.TentativasAvaliacao.AnyAsync(tentativa => tentativa.AvaliacaoId == id);
        if (possuiTentativas)
        {
            throw new InvalidOperationException(
                "Esta avaliacao ja possui tentativas de alunos registradas e nao pode ser excluida.");
        }

        _context.Avaliacoes.Remove(avaliacao);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<QuestaoPublicada>> ListarQuestoesAsync(int avaliacaoId, int professorId)
    {
        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);

        return await _context.QuestoesPublicadas
            .AsNoTracking()
            .Where(questao => questao.AvaliacaoId == avaliacaoId)
            .Include(questao => questao.Alternativas)
            .OrderBy(questao => questao.Ordem)
            .ToListAsync();
    }

    public async Task<IEnumerable<QuestaoAvaliacaoAlunoResponseDto>> ListarQuestoesPorAlunoAsync(int avaliacaoId, int alunoId)
    {
        var (avaliacao, _) = await ObterAvaliacaoPublicadaDoAlunoAsync(avaliacaoId, alunoId);

        return avaliacao.Questoes
            .OrderBy(questao => questao.Ordem)
            .Select(MapQuestaoAluno)
            .ToList();
    }

    public async Task<QuestaoPublicada> AdicionarQuestaoAsync(int avaliacaoId, int professorId, CriarQuestaoAvaliacaoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);
        ValidarDadosQuestao(dto);

        var questaoBanco = new QuestaoBanco
        {
            ProfessorAutorId = professorId,
            TituloInterno = dto.TituloInterno.Trim(),
            Contexto = (dto.Contexto ?? string.Empty).Trim(),
            Enunciado = dto.Enunciado.Trim(),
            TipoQuestao = dto.TipoQuestao,
            Tema = (dto.Tema ?? string.Empty).Trim(),
            Subtema = (dto.Subtema ?? string.Empty).Trim(),
            Dificuldade = dto.Dificuldade,
            ExplicacaoPosResposta = (dto.ExplicacaoPosResposta ?? string.Empty).Trim(),
            Ativa = true,
            CriadoEm = DateTime.UtcNow
        };

        questaoBanco.Alternativas = MontarAlternativasBanco(dto);
        await _context.QuestoesBanco.AddAsync(questaoBanco);
        await _context.SaveChangesAsync();

        const int tentativasMaximas = 3;
        QuestaoPublicada? questaoPublicada = null;

        for (var tentativa = 1; tentativa <= tentativasMaximas; tentativa++)
        {
            var proximaOrdem = await _context.QuestoesPublicadas
                .Where(questao => questao.AvaliacaoId == avaliacaoId)
                .Select(questao => (int?)questao.Ordem)
                .MaxAsync() ?? 0;

            questaoPublicada = new QuestaoPublicada
            {
                AvaliacaoId = avaliacaoId,
                QuestaoBancoId = questaoBanco.Id,
                Ordem = proximaOrdem + 1,
                ContextoSnapshot = questaoBanco.Contexto,
                EnunciadoSnapshot = questaoBanco.Enunciado,
                TipoQuestao = questaoBanco.TipoQuestao,
                ExplicacaoSnapshot = questaoBanco.ExplicacaoPosResposta,
                Pontos = decimal.Round(dto.Pontos, 2, MidpointRounding.AwayFromZero),
                Alternativas = MontarAlternativasPublicadas(questaoBanco.Alternativas)
            };

            await _context.QuestoesPublicadas.AddAsync(questaoPublicada);

            try
            {
                await _context.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException) when (tentativa < tentativasMaximas)
            {
                _context.Entry(questaoPublicada).State = EntityState.Detached;
                questaoPublicada = null;
            }
        }

        if (questaoPublicada is null)
        {
            throw new InvalidOperationException("Nao foi possivel definir a ordem da questao agora. Tente novamente.");
        }

        return await _context.QuestoesPublicadas
            .AsNoTracking()
            .Include(questao => questao.Alternativas)
            .FirstAsync(questao => questao.Id == questaoPublicada.Id);
    }

    public async Task ExcluirQuestaoAsync(int avaliacaoId, int questaoId, int professorId)
    {
        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);

        var questao = await _context.QuestoesPublicadas
            .Include(item => item.Alternativas)
            .FirstOrDefaultAsync(item => item.Id == questaoId && item.AvaliacaoId == avaliacaoId)
            ?? throw new KeyNotFoundException("Questao da avaliacao nao encontrada.");

        _context.QuestoesPublicadas.Remove(questao);
        await _context.SaveChangesAsync();
    }

    public async Task<TentativaAvaliacaoAlunoResponseDto> EnviarRespostasAlunoAsync(int avaliacaoId, int alunoId, EnviarAvaliacaoAlunoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var (avaliacao, matricula) = await ObterAvaliacaoPublicadaDoAlunoAsync(avaliacaoId, alunoId);
        ValidarPeriodoAvaliacao(avaliacao);

        var questoes = avaliacao.Questoes.OrderBy(questao => questao.Ordem).ToList();
        if (questoes.Count == 0)
        {
            throw new InvalidOperationException("A avaliacao ainda nao possui questoes publicadas.");
        }

        var respostasDto = dto.Respostas ?? new List<RespostaAvaliacaoAlunoDto>();
        if (respostasDto.Count == 0)
        {
            throw new ArgumentException("Envie as respostas da avaliacao.");
        }

        var questaoIds = questoes.Select(questao => questao.Id).ToHashSet();
        var respostasDuplicadas = respostasDto
            .GroupBy(resposta => resposta.QuestaoId)
            .Any(grupo => grupo.Count() > 1);
        if (respostasDuplicadas || respostasDto.Any(resposta => !questaoIds.Contains(resposta.QuestaoId)) || respostasDto.Count != questoes.Count)
        {
            throw new ArgumentException("Responda exatamente uma vez cada questao publicada.");
        }

        var tentativasRealizadas = await _context.TentativasAvaliacao
            .CountAsync(tentativa => tentativa.AvaliacaoId == avaliacaoId && tentativa.MatriculaId == matricula.Id);
        if (tentativasRealizadas >= avaliacao.TentativasPermitidas)
        {
            throw new InvalidOperationException("O limite de tentativas para esta avaliacao ja foi atingido.");
        }

        var respostasPorQuestao = respostasDto.ToDictionary(resposta => resposta.QuestaoId);
        var tentativa = new TentativaAvaliacao
        {
            AvaliacaoId = avaliacao.Id,
            MatriculaId = matricula.Id
        };
        var agora = DateTime.UtcNow;
        tentativa.Iniciar(tentativasRealizadas + 1, agora);

        var notaObjetiva = 0m;
        var possuiDissertativa = false;

        foreach (var questao in questoes)
        {
            var respostaDto = respostasPorQuestao[questao.Id];
            var resposta = new RespostaAluno
            {
                QuestaoPublicadaId = questao.Id,
                RespostaTexto = string.Empty
            };

            if (questao.TipoQuestao == TipoQuestao.Dissertativa)
            {
                var texto = (respostaDto.RespostaTexto ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(texto))
                {
                    throw new ArgumentException("Preencha a resposta dissertativa antes de enviar.");
                }

                possuiDissertativa = true;
                resposta.RespostaTexto = texto;
                resposta.Corrigir(null, 0);
            }
            else
            {
                if (!respostaDto.AlternativaId.HasValue)
                {
                    throw new ArgumentException("Selecione uma alternativa para cada questao objetiva.");
                }

                var alternativa = questao.Alternativas.FirstOrDefault(item => item.Id == respostaDto.AlternativaId.Value)
                    ?? throw new ArgumentException("Alternativa selecionada nao pertence a questao informada.");
                var correta = alternativa.EhCorreta;
                var pontos = correta ? questao.Pontos : 0m;

                resposta.AlternativaQuestaoPublicadaId = alternativa.Id;
                resposta.RespostaTexto = alternativa.Texto;
                resposta.Corrigir(correta, pontos);
                notaObjetiva += pontos;
            }

            resposta.RegistrarEnvio(agora);
            tentativa.Respostas.Add(resposta);
        }

        tentativa.MarcarEnvio(agora);
        if (!possuiDissertativa)
        {
            tentativa.MarcarCorrecao(decimal.Round(notaObjetiva, 2, MidpointRounding.AwayFromZero), agora);
        }

        await _context.TentativasAvaliacao.AddAsync(tentativa);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("O limite de tentativas para esta avaliacao ja foi atingido.");
        }

        if (!possuiDissertativa)
        {
            await _progressoAlunoService.RecalcularNotaAvaliacaoAsync(matricula.Id, avaliacao.Id);

            await _notificacaoService.NotificarAsync(
                alunoId,
                "Avaliacao corrigida",
                $"Sua avaliacao \"{avaliacao.Titulo}\" foi corrigida. Nota: {tentativa.NotaBruta:0.##}.",
                TipoNotificacao.AvaliacaoCorrigida,
                "/app/avaliacoes");
        }

        return MapTentativaAluno(tentativa, avaliacao);
    }

    private async Task<Avaliacao?> ObterDetalheAsync(int id)
    {
        return await _context.Avaliacoes
            .Include(avaliacao => avaliacao.Turma)
            .Include(avaliacao => avaliacao.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .Include(avaliacao => avaliacao.ConteudoDidatico)
            .Include(avaliacao => avaliacao.Questoes)
            .FirstOrDefaultAsync(avaliacao => avaliacao.Id == id);
    }

    private async Task<(Avaliacao Avaliacao, Matricula Matricula)> ObterAvaliacaoPublicadaDoAlunoAsync(int avaliacaoId, int alunoId)
    {
        await ValidarAlunoAsync(alunoId);

        var avaliacao = await _context.Avaliacoes
            .AsNoTracking()
            .Where(item => item.Id == avaliacaoId && item.StatusPublicacao == StatusPublicacao.Publicado)
            .Include(item => item.Turma)
            .Include(item => item.Modulo)
                .ThenInclude(modulo => modulo!.Curso)
            .Include(item => item.ConteudoDidatico)
            .Include(item => item.Questoes)
                .ThenInclude(questao => questao.Alternativas)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Avaliacao publicada nao encontrada.");

        var matricula = await _context.Matriculas
            .AsNoTracking()
            .FirstOrDefaultAsync(item =>
                item.AlunoId == alunoId &&
                item.Status == StatusMatricula.Aprovada &&
                item.TurmaId.HasValue &&
                item.TurmaId == avaliacao.TurmaId)
            ?? throw new InvalidOperationException("Esta avaliacao nao esta liberada para a matricula do aluno.");

        return (avaliacao, matricula);
    }

    private async Task ValidarProfessorAsync(int professorId)
    {
        var existe = await _context.Professores.AsNoTracking().AnyAsync(professor => professor.Id == professorId);
        if (!existe)
        {
            throw new KeyNotFoundException("Professor nao encontrado.");
        }
    }

    private async Task ValidarAlunoAsync(int alunoId)
    {
        var existe = await _context.Alunos.AsNoTracking().AnyAsync(aluno => aluno.Id == alunoId);
        if (!existe)
        {
            throw new KeyNotFoundException("Aluno nao encontrado.");
        }
    }

    private async Task<Turma> ValidarTurmaDoProfessorAsync(int professorId, int turmaId)
    {
        var turma = await _context.Turmas
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == turmaId)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");

        if (turma.ProfessorId != professorId)
        {
            throw new InvalidOperationException("A turma informada nao esta vinculada ao professor autenticado.");
        }

        return turma;
    }

    private async Task<Modulo> ValidarModuloAsync(int moduloId)
    {
        return await _context.Modulos
            .AsNoTracking()
            .FirstOrDefaultAsync(modulo => modulo.Id == moduloId)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
    }

    private static void ValidarCompatibilidadeTurmaModulo(Turma turma, Modulo modulo)
    {
        if (turma.CursoId != modulo.CursoId)
        {
            throw new InvalidOperationException("O modulo selecionado nao pertence ao mesmo curso da turma informada.");
        }
    }

    /// <summary>
    /// Vinculo opcional do quiz a um material especifico do modulo. Prova/Exercicio
    /// costumam ficar so no nivel do modulo (conteudoDidaticoId null); Quiz pode
    /// ser preso a um material, mas o material precisa pertencer ao mesmo
    /// modulo/turma da avaliacao — nao confiamos so no que o frontend manda.
    /// </summary>
    private async Task<ConteudoDidatico?> ValidarMaterialAsync(int? conteudoDidaticoId, Turma turma, Modulo modulo)
    {
        if (!conteudoDidaticoId.HasValue)
        {
            return null;
        }

        var material = await _context.ConteudosDidaticos
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == conteudoDidaticoId.Value)
            ?? throw new KeyNotFoundException("Material nao encontrado.");

        if (material.ModuloId != modulo.Id || material.TurmaId != turma.Id)
        {
            throw new InvalidOperationException("O material informado nao pertence ao modulo/turma da avaliacao.");
        }

        return material;
    }

    private static void AplicarDados(Avaliacao avaliacao, CriarAvaliacaoDto dto)
    {
        AplicarDadosBase(
            avaliacao,
            dto.Titulo,
            dto.Descricao,
            dto.TipoAvaliacao,
            dto.StatusPublicacao,
            dto.DataAbertura,
            dto.DataFechamento,
            dto.TentativasPermitidas,
            dto.TempoLimiteMinutos,
            dto.NotaMaxima,
            dto.PesoNota,
            dto.PesoProgresso);
    }

    private static void AplicarDados(Avaliacao avaliacao, AtualizarAvaliacaoDto dto)
    {
        AplicarDadosBase(
            avaliacao,
            dto.Titulo,
            dto.Descricao,
            dto.TipoAvaliacao,
            dto.StatusPublicacao,
            dto.DataAbertura,
            dto.DataFechamento,
            dto.TentativasPermitidas,
            dto.TempoLimiteMinutos,
            dto.NotaMaxima,
            dto.PesoNota,
            dto.PesoProgresso);
    }

    private static void AplicarDadosBase(
        Avaliacao avaliacao,
        string titulo,
        string descricao,
        TipoAvaliacao tipoAvaliacao,
        StatusPublicacao statusPublicacao,
        DateTime? dataAbertura,
        DateTime? dataFechamento,
        int tentativasPermitidas,
        int? tempoLimiteMinutos,
        decimal notaMaxima,
        decimal pesoNota,
        decimal pesoProgresso)
    {
        var tituloNormalizado = (titulo ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(tituloNormalizado))
        {
            throw new ArgumentException("O titulo da avaliacao e obrigatorio.");
        }

        if (dataAbertura.HasValue && dataFechamento.HasValue && dataFechamento.Value <= dataAbertura.Value)
        {
            throw new ArgumentException("A data de fechamento deve ser posterior a data de abertura.");
        }

        if (tempoLimiteMinutos.HasValue && tempoLimiteMinutos.Value <= 0)
        {
            throw new ArgumentException("O tempo limite deve ser maior que zero.");
        }

        if (notaMaxima <= 0)
        {
            throw new ArgumentException("A nota maxima deve ser maior que zero.");
        }

        if (pesoNota <= 0)
        {
            throw new ArgumentException("O peso de nota deve ser maior que zero.");
        }

        if (pesoProgresso <= 0)
        {
            throw new ArgumentException("O peso de progresso deve ser maior que zero.");
        }

        avaliacao.Titulo = tituloNormalizado;
        avaliacao.Descricao = (descricao ?? string.Empty).Trim();
        avaliacao.TipoAvaliacao = tipoAvaliacao;
        avaliacao.DataAbertura = dataAbertura;
        avaliacao.DataFechamento = dataFechamento;
        avaliacao.TempoLimiteMinutos = tempoLimiteMinutos;
        avaliacao.NotaMaxima = decimal.Round(notaMaxima, 2, MidpointRounding.AwayFromZero);
        avaliacao.PesoNota = decimal.Round(pesoNota, 2, MidpointRounding.AwayFromZero);
        avaliacao.PesoProgresso = decimal.Round(pesoProgresso, 2, MidpointRounding.AwayFromZero);
        avaliacao.DefinirTentativasPermitidas(tentativasPermitidas);
        AplicarStatus(avaliacao, statusPublicacao);
    }

    private static void AplicarStatus(Avaliacao avaliacao, StatusPublicacao statusPublicacao)
    {
        var agora = DateTime.UtcNow;

        switch (statusPublicacao)
        {
            case StatusPublicacao.Rascunho:
                avaliacao.VoltarParaRascunho(agora);
                break;
            case StatusPublicacao.Publicado:
                avaliacao.Publicar(agora);
                break;
            case StatusPublicacao.Arquivado:
                avaliacao.Arquivar(agora);
                break;
            default:
                throw new ArgumentException("Status de publicacao invalido.");
        }
    }

    private static void ValidarDadosQuestao(CriarQuestaoAvaliacaoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TituloInterno))
        {
            throw new ArgumentException("Informe um titulo interno para a questao.");
        }

        if (string.IsNullOrWhiteSpace(dto.Enunciado))
        {
            throw new ArgumentException("Informe o enunciado da questao.");
        }

        if (dto.Pontos <= 0)
        {
            throw new ArgumentException("A pontuacao da questao deve ser maior que zero.");
        }

        if (!Enum.IsDefined(dto.TipoQuestao))
        {
            throw new ArgumentException("Tipo de questao invalido.");
        }

        if (dto.TipoQuestao == TipoQuestao.Dissertativa)
        {
            return;
        }

        if (dto.Alternativas.Count < 2)
        {
            throw new ArgumentException("Informe pelo menos duas alternativas.");
        }

        if (dto.Alternativas.Count(alternativa => alternativa.EhCorreta) != 1)
        {
            throw new ArgumentException("Marque exatamente uma alternativa correta.");
        }

        if (dto.Alternativas.Any(alternativa => string.IsNullOrWhiteSpace(alternativa.Letra) || string.IsNullOrWhiteSpace(alternativa.Texto)))
        {
            throw new ArgumentException("Todas as alternativas precisam de letra e texto.");
        }
    }

    private static List<AlternativaQuestaoBanco> MontarAlternativasBanco(CriarQuestaoAvaliacaoDto dto)
    {
        if (dto.TipoQuestao == TipoQuestao.Dissertativa)
        {
            return new List<AlternativaQuestaoBanco>();
        }

        return dto.Alternativas
            .Select((alternativa, index) => new AlternativaQuestaoBanco
            {
                Letra = alternativa.Letra.Trim().ToUpperInvariant()[..1],
                Texto = alternativa.Texto.Trim(),
                EhCorreta = alternativa.EhCorreta,
                Justificativa = string.Empty,
                Ordem = index + 1
            })
            .ToList();
    }

    private static List<AlternativaQuestaoPublicada> MontarAlternativasPublicadas(IEnumerable<AlternativaQuestaoBanco> alternativas)
    {
        return alternativas
            .OrderBy(alternativa => alternativa.Ordem)
            .Select(alternativa => new AlternativaQuestaoPublicada
            {
                Letra = alternativa.Letra,
                Texto = alternativa.Texto,
                EhCorreta = alternativa.EhCorreta,
                JustificativaSnapshot = alternativa.Justificativa,
                Ordem = alternativa.Ordem
            })
            .ToList();
    }

    private static void ValidarPeriodoAvaliacao(Avaliacao avaliacao)
    {
        var agora = DateTime.UtcNow;
        if (avaliacao.DataAbertura.HasValue && avaliacao.DataAbertura.Value > agora)
        {
            throw new InvalidOperationException("Esta avaliacao ainda nao esta aberta para resposta.");
        }

        if (avaliacao.DataFechamento.HasValue && avaliacao.DataFechamento.Value < agora)
        {
            throw new InvalidOperationException("O periodo para responder esta avaliacao ja foi encerrado.");
        }
    }

    private static AvaliacaoAlunoResponseDto MapAvaliacaoAluno(
        Avaliacao avaliacao,
        int matriculaId,
        IReadOnlyList<TentativaAvaliacao> tentativas)
    {
        var ultimaTentativa = tentativas.OrderByDescending(tentativa => tentativa.NumeroTentativa).FirstOrDefault();
        var tentativasRealizadas = tentativas.Count;

        return new AvaliacaoAlunoResponseDto
        {
            Id = avaliacao.Id,
            MatriculaId = matriculaId,
            Titulo = avaliacao.Titulo,
            Descricao = avaliacao.Descricao,
            TurmaId = avaliacao.TurmaId,
            TurmaNome = avaliacao.Turma?.NomeTurma ?? string.Empty,
            CursoId = avaliacao.Modulo?.CursoId ?? avaliacao.Turma?.CursoId ?? 0,
            CursoTitulo = avaliacao.Modulo?.Curso?.Titulo ?? string.Empty,
            ModuloId = avaliacao.ModuloId,
            ModuloTitulo = avaliacao.Modulo?.Titulo ?? string.Empty,
            ConteudoDidaticoId = avaliacao.ConteudoDidaticoId,
            ConteudoDidaticoTitulo = avaliacao.ConteudoDidatico?.Titulo ?? string.Empty,
            TipoAvaliacao = avaliacao.TipoAvaliacao,
            StatusPublicacao = avaliacao.StatusPublicacao,
            DataAbertura = avaliacao.DataAbertura,
            DataFechamento = avaliacao.DataFechamento,
            TentativasPermitidas = avaliacao.TentativasPermitidas,
            TentativasRealizadas = tentativasRealizadas,
            TentativasRestantes = Math.Max(avaliacao.TentativasPermitidas - tentativasRealizadas, 0),
            TempoLimiteMinutos = avaliacao.TempoLimiteMinutos,
            NotaMaxima = avaliacao.NotaMaxima,
            TotalQuestoes = avaliacao.Questoes?.Count ?? 0,
            UltimaNota = ultimaTentativa?.NotaBruta,
            UltimoStatusTentativa = ultimaTentativa?.StatusTentativa,
            PublicadoEm = avaliacao.PublicadoEm
        };
    }

    private static QuestaoAvaliacaoAlunoResponseDto MapQuestaoAluno(QuestaoPublicada questao)
    {
        return new QuestaoAvaliacaoAlunoResponseDto
        {
            Id = questao.Id,
            AvaliacaoId = questao.AvaliacaoId,
            Ordem = questao.Ordem,
            Contexto = questao.ContextoSnapshot,
            Enunciado = questao.EnunciadoSnapshot,
            TipoQuestao = questao.TipoQuestao,
            Pontos = questao.Pontos,
            Alternativas = questao.Alternativas
                .OrderBy(alternativa => alternativa.Ordem)
                .Select(alternativa => new AlternativaQuestaoAlunoResponseDto
                {
                    Id = alternativa.Id,
                    Letra = alternativa.Letra,
                    Texto = alternativa.Texto,
                    Ordem = alternativa.Ordem
                })
                .ToList()
        };
    }

    private static TentativaAvaliacaoAlunoResponseDto MapTentativaAluno(TentativaAvaliacao tentativa, Avaliacao avaliacao)
    {
        return new TentativaAvaliacaoAlunoResponseDto
        {
            Id = tentativa.Id,
            AvaliacaoId = tentativa.AvaliacaoId,
            MatriculaId = tentativa.MatriculaId,
            NumeroTentativa = tentativa.NumeroTentativa,
            StatusTentativa = tentativa.StatusTentativa,
            NotaBruta = tentativa.NotaBruta,
            NotaMaxima = avaliacao.NotaMaxima,
            IniciadaEm = tentativa.IniciadaEm,
            EnviadaEm = tentativa.EnviadaEm,
            CorrigidaEm = tentativa.CorrigidaEm
        };
    }
}
