using Microsoft.AspNetCore.Http;
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
    private readonly IAcessoAcademicoService _acessoAcademicoService;
    private readonly IArmazenamentoArquivoService _armazenamentoService;
    private readonly IExtratorTextoMaterialService _extratorTextoService;
    private readonly IAvaliacaoIAService _avaliacaoIAService;

    public AvaliacaoService(
        PlataformaContext context,
        IProgressoAlunoService progressoAlunoService,
        INotificacaoService notificacaoService,
        IAcessoAcademicoService acessoAcademicoService,
        IArmazenamentoArquivoService armazenamentoService,
        IExtratorTextoMaterialService extratorTextoService,
        IAvaliacaoIAService avaliacaoIAService)
    {
        _context = context;
        _progressoAlunoService = progressoAlunoService;
        _notificacaoService = notificacaoService;
        _acessoAcademicoService = acessoAcademicoService;
        _armazenamentoService = armazenamentoService;
        _extratorTextoService = extratorTextoService;
        _avaliacaoIAService = avaliacaoIAService;
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
            .ThenBy(avaliacao => avaliacao.Modulo != null ? avaliacao.Modulo.Titulo : string.Empty)
            .ThenBy(avaliacao => avaliacao.DataAbertura ?? avaliacao.CriadoEm)
            .ThenBy(avaliacao => avaliacao.Titulo)
            .ToListAsync();
    }

    public async Task<IEnumerable<AvaliacaoAlunoResponseDto>> ListarAvaliacoesPorAlunoAsync(int alunoId)
    {
        await ValidarAlunoAsync(alunoId);

        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Include(matricula => matricula.Curso)
            .Where(matricula =>
                matricula.AlunoId == alunoId &&
                matricula.Status == StatusMatricula.Aprovada &&
                matricula.TurmaId.HasValue)
            .ToListAsync();

        if (matriculas.Count == 0)
        {
            return Enumerable.Empty<AvaliacaoAlunoResponseDto>();
        }

        // Cursos pagos so entram na lista com pagamento confirmado — gratuitos
        // (Preco <= 0) nunca geram Pagamento, entao a matricula aprovada basta.
        var matriculaIdsComPagamentoConfirmado = await _context.Pagamentos
            .Where(pagamento => pagamento.Status == StatusPagamento.Pago)
            .Select(pagamento => pagamento.MatriculaId)
            .ToListAsync();

        matriculas = matriculas
            .Where(matricula => matricula.Curso!.Preco <= 0 || matriculaIdsComPagamentoConfirmado.Contains(matricula.Id))
            .ToList();

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
            .ThenBy(avaliacao => avaliacao.Modulo != null ? avaliacao.Modulo.Titulo : string.Empty)
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
        var modulo = await ValidarModuloAsync(dto.ModuloId, dto.TipoAvaliacao);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);
        var material = await ValidarMaterialAsync(dto.ConteudoDidaticoId, turma, modulo);

        var avaliacao = new Avaliacao
        {
            TurmaId = turma.Id,
            ModuloId = modulo?.Id,
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
        var modulo = await ValidarModuloAsync(dto.ModuloId, dto.TipoAvaliacao);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);
        var material = await ValidarMaterialAsync(dto.ConteudoDidaticoId, turma, modulo);

        avaliacao.TurmaId = turma.Id;
        avaliacao.ModuloId = modulo?.Id;
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
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco!)
                .ThenInclude(questaoBanco => questaoBanco.Anexos)
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
            ReferenciasBibliograficas = (dto.ReferenciasBibliograficas ?? string.Empty).Trim(),
            Ativa = true,
            CriadoEm = DateTime.UtcNow
        };

        questaoBanco.Alternativas = MontarAlternativasBanco(dto);
        questaoBanco.Afirmativas = MontarAfirmativasBanco(dto);
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
                ReferenciasBibliograficasSnapshot = questaoBanco.ReferenciasBibliograficas,
                Pontos = decimal.Round(dto.Pontos, 2, MidpointRounding.AwayFromZero),
                Alternativas = MontarAlternativasPublicadas(questaoBanco.Alternativas),
                Afirmativas = MontarAfirmativasPublicadas(questaoBanco.Afirmativas)
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
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco)
            .FirstAsync(questao => questao.Id == questaoPublicada.Id);
    }

    public async Task<IEnumerable<QuestaoPublicada>> AdicionarQuestoesEmLoteAsync(int avaliacaoId, int professorId, CriarQuestoesEmLoteDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        if (dto.Questoes.Count == 0)
        {
            throw new ArgumentException("Informe ao menos uma questao para adicionar.");
        }

        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);

        // Valida TODAS as questoes antes de persistir qualquer uma - tudo-ou-nada,
        // sem risco de o professor confirmar N questoes na revisao e o backend
        // gravar so parte delas porque uma no meio da lista falhou validacao.
        foreach (var questaoDto in dto.Questoes)
        {
            ValidarDadosQuestao(questaoDto);
        }

        const int tentativasMaximas = 3;
        List<QuestaoPublicada>? questoesPublicadas = null;

        for (var tentativa = 1; tentativa <= tentativasMaximas; tentativa++)
        {
            var proximaOrdem = await _context.QuestoesPublicadas
                .Where(questao => questao.AvaliacaoId == avaliacaoId)
                .Select(questao => (int?)questao.Ordem)
                .MaxAsync() ?? 0;

            questoesPublicadas = new List<QuestaoPublicada>();

            foreach (var questaoDto in dto.Questoes)
            {
                var questaoBanco = new QuestaoBanco
                {
                    ProfessorAutorId = professorId,
                    TituloInterno = questaoDto.TituloInterno.Trim(),
                    Contexto = (questaoDto.Contexto ?? string.Empty).Trim(),
                    Enunciado = questaoDto.Enunciado.Trim(),
                    TipoQuestao = questaoDto.TipoQuestao,
                    Tema = (questaoDto.Tema ?? string.Empty).Trim(),
                    Subtema = (questaoDto.Subtema ?? string.Empty).Trim(),
                    Dificuldade = questaoDto.Dificuldade,
                    ExplicacaoPosResposta = (questaoDto.ExplicacaoPosResposta ?? string.Empty).Trim(),
                    ReferenciasBibliograficas = (questaoDto.ReferenciasBibliograficas ?? string.Empty).Trim(),
                    Ativa = true,
                    CriadoEm = DateTime.UtcNow
                };
                questaoBanco.Alternativas = MontarAlternativasBanco(questaoDto);
                questaoBanco.Afirmativas = MontarAfirmativasBanco(questaoDto);

                proximaOrdem += 1;

                var questaoPublicada = new QuestaoPublicada
                {
                    AvaliacaoId = avaliacaoId,
                    QuestaoBanco = questaoBanco,
                    Ordem = proximaOrdem,
                    ContextoSnapshot = questaoBanco.Contexto,
                    EnunciadoSnapshot = questaoBanco.Enunciado,
                    TipoQuestao = questaoBanco.TipoQuestao,
                    ExplicacaoSnapshot = questaoBanco.ExplicacaoPosResposta,
                    ReferenciasBibliograficasSnapshot = questaoBanco.ReferenciasBibliograficas,
                    Pontos = decimal.Round(questaoDto.Pontos, 2, MidpointRounding.AwayFromZero),
                    Alternativas = MontarAlternativasPublicadas(questaoBanco.Alternativas),
                    Afirmativas = MontarAfirmativasPublicadas(questaoBanco.Afirmativas)
                };

                await _context.QuestoesBanco.AddAsync(questaoBanco);
                await _context.QuestoesPublicadas.AddAsync(questaoPublicada);
                questoesPublicadas.Add(questaoPublicada);
            }

            try
            {
                await _context.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException) when (tentativa < tentativasMaximas)
            {
                foreach (var questaoPublicada in questoesPublicadas)
                {
                    _context.Entry(questaoPublicada).State = EntityState.Detached;
                    if (questaoPublicada.QuestaoBanco is not null)
                    {
                        _context.Entry(questaoPublicada.QuestaoBanco).State = EntityState.Detached;
                    }
                }
                questoesPublicadas = null;
            }
        }

        if (questoesPublicadas is null)
        {
            throw new InvalidOperationException("Nao foi possivel definir a ordem das questoes agora. Tente novamente.");
        }

        var idsGerados = questoesPublicadas.Select(questao => questao.Id).ToList();
        return await _context.QuestoesPublicadas
            .AsNoTracking()
            .Include(questao => questao.Alternativas)
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco)
            .Where(questao => idsGerados.Contains(questao.Id))
            .OrderBy(questao => questao.Ordem)
            .ToListAsync();
    }

    public async Task<QuestaoPublicada> AtualizarQuestaoAsync(int avaliacaoId, int questaoId, int professorId, AtualizarQuestaoAvaliacaoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);
        ValidarDadosQuestao(dto);

        var questaoPublicada = await _context.QuestoesPublicadas
            .Include(questao => questao.Alternativas)
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco)
            .FirstOrDefaultAsync(questao => questao.Id == questaoId && questao.AvaliacaoId == avaliacaoId)
            ?? throw new KeyNotFoundException("Questao da avaliacao nao encontrada.");

        // Mesma guarda ja usada em ExcluirAvaliacaoAsync: depois que um aluno
        // respondeu, a questao nao pode mudar de baixo dos pes de uma correcao ja
        // registrada.
        var possuiTentativas = await _context.TentativasAvaliacao.AnyAsync(tentativa => tentativa.AvaliacaoId == avaliacaoId);
        if (possuiTentativas)
        {
            throw new InvalidOperationException("Esta avaliacao ja possui tentativas de alunos registradas e as questoes nao podem mais ser editadas.");
        }

        var questaoBanco = questaoPublicada.QuestaoBanco
            ?? throw new InvalidOperationException("Questao de origem nao encontrada.");

        questaoBanco.TituloInterno = dto.TituloInterno.Trim();
        questaoBanco.Contexto = (dto.Contexto ?? string.Empty).Trim();
        questaoBanco.Enunciado = dto.Enunciado.Trim();
        questaoBanco.TipoQuestao = dto.TipoQuestao;
        questaoBanco.Tema = (dto.Tema ?? string.Empty).Trim();
        questaoBanco.Subtema = (dto.Subtema ?? string.Empty).Trim();
        questaoBanco.Dificuldade = dto.Dificuldade;
        questaoBanco.ExplicacaoPosResposta = (dto.ExplicacaoPosResposta ?? string.Empty).Trim();
        questaoBanco.ReferenciasBibliograficas = (dto.ReferenciasBibliograficas ?? string.Empty).Trim();

        // Substitui as listas por completo em vez de casar item a item com o que ja
        // existia - mais simples, e seguro porque a guarda acima garante que ainda
        // nao ha nenhuma resposta de aluno presa a essas alternativas/afirmativas.
        _context.AlternativasQuestoesBanco.RemoveRange(questaoBanco.Alternativas);
        _context.AfirmativasQuestoesBanco.RemoveRange(questaoBanco.Afirmativas);
        questaoBanco.Alternativas = MontarAlternativasBanco(dto);
        questaoBanco.Afirmativas = MontarAfirmativasBanco(dto);

        _context.AlternativasQuestoesPublicadas.RemoveRange(questaoPublicada.Alternativas);
        _context.AfirmativasQuestoesPublicadas.RemoveRange(questaoPublicada.Afirmativas);

        questaoPublicada.ContextoSnapshot = questaoBanco.Contexto;
        questaoPublicada.EnunciadoSnapshot = questaoBanco.Enunciado;
        questaoPublicada.TipoQuestao = questaoBanco.TipoQuestao;
        questaoPublicada.ExplicacaoSnapshot = questaoBanco.ExplicacaoPosResposta;
        questaoPublicada.ReferenciasBibliograficasSnapshot = questaoBanco.ReferenciasBibliograficas;
        questaoPublicada.Pontos = decimal.Round(dto.Pontos, 2, MidpointRounding.AwayFromZero);
        questaoPublicada.Alternativas = MontarAlternativasPublicadas(questaoBanco.Alternativas);
        questaoPublicada.Afirmativas = MontarAfirmativasPublicadas(questaoBanco.Afirmativas);

        await _context.SaveChangesAsync();

        return await _context.QuestoesPublicadas
            .AsNoTracking()
            .Include(questao => questao.Alternativas)
            .Include(questao => questao.Afirmativas)
            .Include(questao => questao.QuestaoBanco)
            .FirstAsync(questao => questao.Id == questaoPublicada.Id);
    }

    public async Task ReordenarQuestoesAsync(int avaliacaoId, int professorId, ReordenarQuestoesDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);

        var questaoIds = dto.Posicoes.Select(posicao => posicao.QuestaoId).ToList();
        if (questaoIds.Count != questaoIds.Distinct().Count())
        {
            throw new ArgumentException("Cada questao so pode aparecer uma vez na nova ordenacao.");
        }

        var novasOrdens = dto.Posicoes.Select(posicao => posicao.NovaOrdem).ToList();
        if (novasOrdens.Count != novasOrdens.Distinct().Count())
        {
            throw new ArgumentException("As novas posicoes nao podem se repetir.");
        }

        var questoes = await _context.QuestoesPublicadas
            .Where(questao => questao.AvaliacaoId == avaliacaoId && questaoIds.Contains(questao.Id))
            .ToListAsync();

        if (questoes.Count != questaoIds.Count)
        {
            throw new KeyNotFoundException("Uma ou mais questoes informadas nao pertencem a esta avaliacao.");
        }

        var totalQuestoes = await _context.QuestoesPublicadas.CountAsync(questao => questao.AvaliacaoId == avaliacaoId);
        if (questaoIds.Count != totalQuestoes)
        {
            throw new ArgumentException("Informe a nova posicao de todas as questoes da avaliacao.");
        }

        if (!novasOrdens.OrderBy(ordem => ordem).SequenceEqual(Enumerable.Range(1, totalQuestoes)))
        {
            throw new ArgumentException("As novas posicoes devem formar uma sequencia de 1 a N sem repeticoes nem lacunas.");
        }

        // Offset temporario antes de aplicar a ordem final - sem isso, trocar duas
        // questoes de posicao colide consigo mesmo no indice unico (AvaliacaoId, Ordem)
        // no meio da operacao.
        var offsetTemporario = totalQuestoes + 1000;
        foreach (var questao in questoes)
        {
            questao.Ordem += offsetTemporario;
        }
        await _context.SaveChangesAsync();

        var posicaoPorQuestaoId = dto.Posicoes.ToDictionary(posicao => posicao.QuestaoId, posicao => posicao.NovaOrdem);
        foreach (var questao in questoes)
        {
            questao.Ordem = posicaoPorQuestaoId[questao.Id];
        }
        await _context.SaveChangesAsync();
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

        if (avaliacao.TipoAvaliacao == TipoAvaliacao.Quiz)
        {
            // Quiz e formativo - a conclusao (envio) conta pro progresso do
            // modulo/curso independente de dissertativa, ja que nao gera nota
            // e por isso nao precisa esperar correcao manual.
            await _progressoAlunoService.RecalcularProgressoQuizAsync(matricula.Id, avaliacao.Id);
        }
        else if (!possuiDissertativa)
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

    public async Task<RevisaoTentativaResponseDto> ObterRevisaoTentativaAsync(int tentativaId, int alunoId)
    {
        await ValidarAlunoAsync(alunoId);

        var tentativa = await _context.TentativasAvaliacao
            .AsNoTracking()
            .Include(item => item.Avaliacao)
            .Include(item => item.Matricula)
            .Include(item => item.Respostas)
                .ThenInclude(resposta => resposta.QuestaoPublicada!)
                    .ThenInclude(questao => questao.Alternativas)
            .Include(item => item.Respostas)
                .ThenInclude(resposta => resposta.QuestaoPublicada!)
                    .ThenInclude(questao => questao.Afirmativas)
            .FirstOrDefaultAsync(item => item.Id == tentativaId)
            ?? throw new KeyNotFoundException("Tentativa nao encontrada.");

        if (tentativa.Matricula is null || tentativa.Matricula.AlunoId != alunoId)
        {
            throw new InvalidOperationException("Esta tentativa nao pertence ao aluno autenticado.");
        }

        if (tentativa.StatusTentativa != StatusTentativaAvaliacao.Corrigida)
        {
            throw new InvalidOperationException("Esta tentativa ainda nao foi corrigida.");
        }

        var avaliacao = tentativa.Avaliacao
            ?? throw new InvalidOperationException("Avaliacao da tentativa nao encontrada.");

        var questoes = tentativa.Respostas
            .OrderBy(resposta => resposta.QuestaoPublicada!.Ordem)
            .Select(resposta =>
            {
                var questao = resposta.QuestaoPublicada!;
                return new RevisaoQuestaoResponseDto
                {
                    QuestaoId = questao.Id,
                    Ordem = questao.Ordem,
                    Contexto = questao.ContextoSnapshot,
                    Enunciado = questao.EnunciadoSnapshot,
                    TipoQuestao = questao.TipoQuestao,
                    Pontos = questao.Pontos,
                    PontosObtidos = resposta.PontosObtidos,
                    Correta = resposta.Correta,
                    AlternativaEscolhidaId = resposta.AlternativaQuestaoPublicadaId,
                    RespostaTexto = questao.TipoQuestao == TipoQuestao.Dissertativa ? resposta.RespostaTexto : string.Empty,
                    Explicacao = questao.ExplicacaoSnapshot,
                    ReferenciasBibliograficas = questao.ReferenciasBibliograficasSnapshot,
                    Alternativas = questao.Alternativas
                        .OrderBy(alternativa => alternativa.Ordem)
                        .Select(alternativa => new RevisaoAlternativaResponseDto
                        {
                            Id = alternativa.Id,
                            Letra = alternativa.Letra,
                            Texto = alternativa.Texto,
                            EhCorreta = alternativa.EhCorreta,
                            Justificativa = alternativa.JustificativaSnapshot
                        })
                        .ToList(),
                    Afirmativas = questao.Afirmativas
                        .OrderBy(afirmativa => afirmativa.Ordem)
                        .Select(afirmativa => new RevisaoAfirmativaResponseDto
                        {
                            Numero = afirmativa.Numero,
                            Texto = afirmativa.Texto,
                            EhCorreta = afirmativa.EhCorreta,
                            Justificativa = afirmativa.JustificativaSnapshot
                        })
                        .ToList()
                };
            })
            .ToList();

        return new RevisaoTentativaResponseDto
        {
            TentativaId = tentativa.Id,
            AvaliacaoId = tentativa.AvaliacaoId,
            StatusTentativa = tentativa.StatusTentativa,
            NotaBruta = tentativa.NotaBruta,
            NotaMaxima = avaliacao.NotaMaxima,
            Questoes = questoes
        };
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
            .Include(item => item.Questoes)
                .ThenInclude(questao => questao.Afirmativas)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Avaliacao publicada nao encontrada.");

        var matricula = await _context.Matriculas
            .AsNoTracking()
            .Include(item => item.Curso)
            .FirstOrDefaultAsync(item =>
                item.AlunoId == alunoId &&
                item.Status == StatusMatricula.Aprovada &&
                item.TurmaId.HasValue &&
                item.TurmaId == avaliacao.TurmaId)
            ?? throw new InvalidOperationException("Esta avaliacao nao esta liberada para a matricula do aluno.");

        if (!await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula))
        {
            throw new InvalidOperationException("O pagamento deste curso ainda nao foi confirmado.");
        }

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

    public async Task<ResultadoGeracaoIA> GerarQuestoesComIaAsync(int avaliacaoId, int professorId, IFormFile arquivo, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(configuracao);

        _ = await ObterAvaliacaoPorProfessorAsync(avaliacaoId, professorId);

        if (arquivo is null || arquivo.Length == 0)
        {
            throw new ArgumentException("Envie um arquivo PDF ou DOCX com o material didatico.");
        }

        var extensao = Path.GetExtension(arquivo.FileName).ToLowerInvariant();
        if (extensao != ".pdf" && extensao != ".docx")
        {
            throw new ArgumentException("Apenas arquivos PDF ou DOCX sao aceitos para geracao por IA.");
        }

        ResultadoExtracaoMaterial resultadoExtracao;
        await using (var streamLeitura = arquivo.OpenReadStream())
        {
            resultadoExtracao = await _extratorTextoService.ExtrairTextoAsync(streamLeitura, extensao, cancellationToken);
        }

        if (!resultadoExtracao.TemTextoExtraivel)
        {
            var motivo = resultadoExtracao.Avisos.FirstOrDefault()
                ?? "O material enviado nao tem texto suficiente para gerar questoes.";
            throw new ArgumentException(motivo);
        }

        // Guardado indefinidamente, mesmo padrao dos demais uploads do sistema
        // (decisao 6 da proposta aprovada) - IFormFile.OpenReadStream() devolve um
        // stream novo a cada chamada, reaberto do inicio, entao reusar "arquivo" aqui
        // depois da extracao acima e seguro.
        await _armazenamentoService.SalvarArquivoAsync(arquivo, "avaliacoes-ia-fontes", new[] { ".pdf", ".docx" }, 20_000_000);

        var textoCompleto = string.Join("\n\n", resultadoExtracao.TextoPorPagina);
        return await _avaliacaoIAService.GerarQuestoesAsync(textoCompleto, configuracao, cancellationToken);
    }

    public async Task<AnexoQuestaoBanco> AdicionarAnexoQuestaoAsync(int questaoBancoId, int professorId, IFormFile arquivo, string titulo, TipoConteudoDidatico tipoAnexo)
    {
        await ValidarQuestaoBancoDoProfessorAsync(professorId, questaoBancoId);

        var (extensoesPermitidas, tamanhoMaximoBytes) = tipoAnexo switch
        {
            TipoConteudoDidatico.Imagem => (new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" }, 5_000_000L),
            TipoConteudoDidatico.Pdf => (new[] { ".pdf" }, 20_000_000L),
            TipoConteudoDidatico.Video => (new[] { ".mp4", ".webm", ".mov" }, 100_000_000L),
            _ => throw new ArgumentException("Tipo de anexo nao aceita upload de arquivo.")
        };

        var arquivoUrl = await _armazenamentoService.SalvarArquivoAsync(arquivo, "questoes", extensoesPermitidas, tamanhoMaximoBytes);
        var proximaOrdem = await _context.AnexosQuestoesBanco
            .Where(anexo => anexo.QuestaoBancoId == questaoBancoId)
            .Select(anexo => (int?)anexo.Ordem)
            .MaxAsync() ?? 0;

        var novoAnexo = new AnexoQuestaoBanco
        {
            QuestaoBancoId = questaoBancoId,
            Titulo = titulo.Trim(),
            TipoAnexo = tipoAnexo.ToString(),
            ArquivoUrl = arquivoUrl,
            Ordem = proximaOrdem + 1
        };

        _context.AnexosQuestoesBanco.Add(novoAnexo);
        await _context.SaveChangesAsync();

        return novoAnexo;
    }

    public async Task RemoverAnexoQuestaoAsync(int questaoBancoId, int anexoId, int professorId)
    {
        await ValidarQuestaoBancoDoProfessorAsync(professorId, questaoBancoId);

        var anexo = await _context.AnexosQuestoesBanco
            .FirstOrDefaultAsync(item => item.Id == anexoId && item.QuestaoBancoId == questaoBancoId)
            ?? throw new KeyNotFoundException("Anexo nao encontrado.");

        _context.AnexosQuestoesBanco.Remove(anexo);
        await _context.SaveChangesAsync();
    }

    private async Task ValidarQuestaoBancoDoProfessorAsync(int professorId, int questaoBancoId)
    {
        var questaoBanco = await _context.QuestoesBanco
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == questaoBancoId)
            ?? throw new KeyNotFoundException("Questao nao encontrada.");

        if (questaoBanco.ProfessorAutorId != professorId)
        {
            throw new InvalidOperationException("A questao informada nao pertence ao professor autenticado.");
        }
    }

    /// <summary>
    /// Quiz sempre precisa de um modulo (e o que decide em qual ponto da trilha do
    /// aluno ele aparece). Prova/Exercicio agora podem ficar soltos direto no curso
    /// (moduloId null) — o professor os cria sem escolher modulo, e o aluno os ve na
    /// tela geral de Avaliacoes dele, nao dentro da trilha de um modulo especifico.
    /// </summary>
    private async Task<Modulo?> ValidarModuloAsync(int? moduloId, TipoAvaliacao tipoAvaliacao)
    {
        if (!moduloId.HasValue)
        {
            if (tipoAvaliacao == TipoAvaliacao.Quiz)
            {
                throw new ArgumentException("Selecione um modulo para o quiz.");
            }

            return null;
        }

        return await _context.Modulos
            .AsNoTracking()
            .FirstOrDefaultAsync(modulo => modulo.Id == moduloId.Value)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
    }

    private static void ValidarCompatibilidadeTurmaModulo(Turma turma, Modulo? modulo)
    {
        if (modulo is not null && turma.CursoId != modulo.CursoId)
        {
            throw new InvalidOperationException("O modulo selecionado nao pertence ao mesmo curso da turma informada.");
        }
    }

    /// <summary>
    /// Vinculo opcional do quiz a um material especifico do modulo. Prova/Exercicio
    /// costumam ficar soltos no curso (sem modulo, sem material); Quiz pode ser preso
    /// a um material, mas o material precisa pertencer ao mesmo modulo/turma da
    /// avaliacao — nao confiamos so no que o frontend manda.
    /// </summary>
    private async Task<ConteudoDidatico?> ValidarMaterialAsync(int? conteudoDidaticoId, Turma turma, Modulo? modulo)
    {
        if (!conteudoDidaticoId.HasValue)
        {
            return null;
        }

        if (modulo is null)
        {
            throw new InvalidOperationException("So e possivel vincular um material a uma avaliacao que tenha modulo definido.");
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

    // internal (nao private) porque IValidadorQuestaoIaService reaproveita essa mesma
    // regra de negocio antes de aceitar qualquer questao gerada por IA.
    internal static void ValidarDadosQuestao(CriarQuestaoAvaliacaoDto dto, bool exigirGabarito = true)
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

        if (exigirGabarito && dto.Alternativas.Count(alternativa => alternativa.EhCorreta) != 1)
        {
            throw new ArgumentException("Marque exatamente uma alternativa correta.");
        }

        if (dto.Alternativas.Any(alternativa => string.IsNullOrWhiteSpace(alternativa.Letra) || string.IsNullOrWhiteSpace(alternativa.Texto)))
        {
            throw new ArgumentException("Todas as alternativas precisam de letra e texto.");
        }

        if (dto.TipoQuestao == TipoQuestao.AfirmativasCombinadas)
        {
            if (dto.Afirmativas.Count < 2)
            {
                throw new ArgumentException("Informe pelo menos duas afirmativas.");
            }

            if (dto.Afirmativas.Any(afirmativa => string.IsNullOrWhiteSpace(afirmativa.Numero) || string.IsNullOrWhiteSpace(afirmativa.Texto)))
            {
                throw new ArgumentException("Todas as afirmativas precisam de numero e texto.");
            }
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
                Justificativa = (alternativa.Justificativa ?? string.Empty).Trim(),
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

    private static List<AfirmativaQuestaoBanco> MontarAfirmativasBanco(CriarQuestaoAvaliacaoDto dto)
    {
        if (dto.TipoQuestao != TipoQuestao.AfirmativasCombinadas)
        {
            return new List<AfirmativaQuestaoBanco>();
        }

        return dto.Afirmativas
            .Select((afirmativa, index) => new AfirmativaQuestaoBanco
            {
                Numero = afirmativa.Numero.Trim(),
                Texto = afirmativa.Texto.Trim(),
                EhCorreta = afirmativa.EhCorreta,
                Justificativa = (afirmativa.Justificativa ?? string.Empty).Trim(),
                Ordem = index + 1
            })
            .ToList();
    }

    private static List<AfirmativaQuestaoPublicada> MontarAfirmativasPublicadas(IEnumerable<AfirmativaQuestaoBanco> afirmativas)
    {
        return afirmativas
            .OrderBy(afirmativa => afirmativa.Ordem)
            .Select(afirmativa => new AfirmativaQuestaoPublicada
            {
                Numero = afirmativa.Numero,
                Texto = afirmativa.Texto,
                EhCorreta = afirmativa.EhCorreta,
                JustificativaSnapshot = afirmativa.Justificativa,
                Ordem = afirmativa.Ordem
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
                .ToList(),
            Afirmativas = questao.Afirmativas
                .OrderBy(afirmativa => afirmativa.Ordem)
                .Select(afirmativa => new AfirmativaQuestaoAlunoResponseDto
                {
                    Id = afirmativa.Id,
                    Numero = afirmativa.Numero,
                    Texto = afirmativa.Texto,
                    Ordem = afirmativa.Ordem
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
