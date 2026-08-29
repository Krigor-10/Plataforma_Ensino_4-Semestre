using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ConteudoDidaticoService : IConteudoDidaticoService
{
    private readonly IConteudoDidaticoRepository _conteudoRepository;
    private readonly IGenericRepository<Aluno> _alunoRepository;
    private readonly IGenericRepository<Professor> _professorRepository;
    private readonly IGenericRepository<Turma> _turmaRepository;
    private readonly IGenericRepository<Modulo> _moduloRepository;
    private readonly INotificacaoService _notificacaoService;
    private readonly PlataformaContext _context;

    public ConteudoDidaticoService(
        IConteudoDidaticoRepository conteudoRepository,
        IGenericRepository<Aluno> alunoRepository,
        IGenericRepository<Professor> professorRepository,
        IGenericRepository<Turma> turmaRepository,
        IGenericRepository<Modulo> moduloRepository,
        INotificacaoService notificacaoService,
        PlataformaContext context)
    {
        _conteudoRepository = conteudoRepository;
        _alunoRepository = alunoRepository;
        _professorRepository = professorRepository;
        _turmaRepository = turmaRepository;
        _moduloRepository = moduloRepository;
        _notificacaoService = notificacaoService;
        _context = context;
    }

    public async Task<IEnumerable<ConteudoDidatico>> ListarConteudosPorProfessorAsync(int professorId)
    {
        await ValidarProfessorAsync(professorId);
        return await _conteudoRepository.ListarPorProfessorAsync(professorId);
    }

    public async Task<IEnumerable<ConteudoDidatico>> ListarConteudosPorAlunoAsync(int alunoId)
    {
        await ValidarAlunoAsync(alunoId);
        return await _conteudoRepository.ListarPublicadosPorAlunoAsync(alunoId);
    }

    public async Task<ConteudoDidatico> ObterConteudoPorProfessorAsync(int id, int professorId)
    {
        await ValidarProfessorAsync(professorId);

        var conteudo = await _conteudoRepository.ObterDetalhePorIdAsync(id)
            ?? throw new KeyNotFoundException("Conteudo didatico nao encontrado.");

        if (conteudo.ProfessorAutorId != professorId)
        {
            throw new KeyNotFoundException("Conteudo didatico nao encontrado.");
        }

        return conteudo;
    }

    public async Task<ConteudoDidatico> CriarConteudoAsync(int professorId, CriarConteudoDidaticoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        await ValidarProfessorAsync(professorId);

        var turma = await ValidarTurmaDoProfessorAsync(professorId, dto.TurmaId);
        var modulo = await ValidarModuloAsync(dto.ModuloId);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);

        var conteudo = new ConteudoDidatico
        {
            TurmaId = turma.Id,
            ModuloId = modulo.Id
        };
        conteudo.DefinirProfessorAutor(professorId);
        conteudo.RegistrarCriacao(DateTime.UtcNow);

        AplicarDados(
            conteudo,
            dto.Titulo,
            dto.Descricao,
            dto.TipoConteudo,
            dto.CorpoTexto,
            dto.ArquivoUrl,
            dto.LinkUrl,
            dto.OrdemExibicao,
            dto.PesoProgresso);
        conteudo.DefinirStatusPublicacao(dto.StatusPublicacao, DateTime.UtcNow);

        await _conteudoRepository.AdicionarAsync(conteudo);
        await _conteudoRepository.SalvarAlteracoesAsync();

        if (conteudo.StatusPublicacao == StatusPublicacao.Publicado)
        {
            await NotificarAlunosDaTurmaAsync(turma.Id, conteudo.Titulo);
        }

        return await _conteudoRepository.ObterDetalhePorIdAsync(conteudo.Id) ?? conteudo;
    }

    public async Task<ConteudoDidatico> AtualizarConteudoAsync(int id, int professorId, AtualizarConteudoDidaticoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var conteudo = await ObterConteudoPorProfessorAsync(id, professorId);
        var statusAnterior = conteudo.StatusPublicacao;
        var turma = await ValidarTurmaDoProfessorAsync(professorId, dto.TurmaId);
        var modulo = await ValidarModuloAsync(dto.ModuloId);

        ValidarCompatibilidadeTurmaModulo(turma, modulo);

        conteudo.TurmaId = turma.Id;
        conteudo.ModuloId = modulo.Id;
        conteudo.MarcarAtualizacao(DateTime.UtcNow);

        AplicarDados(
            conteudo,
            dto.Titulo,
            dto.Descricao,
            dto.TipoConteudo,
            dto.CorpoTexto,
            dto.ArquivoUrl,
            dto.LinkUrl,
            dto.OrdemExibicao,
            dto.PesoProgresso);
        conteudo.DefinirStatusPublicacao(dto.StatusPublicacao, DateTime.UtcNow);

        _conteudoRepository.Atualizar(conteudo);
        await _conteudoRepository.SalvarAlteracoesAsync();

        if (statusAnterior != StatusPublicacao.Publicado && conteudo.StatusPublicacao == StatusPublicacao.Publicado)
        {
            await NotificarAlunosDaTurmaAsync(turma.Id, conteudo.Titulo);
        }

        return await _conteudoRepository.ObterDetalhePorIdAsync(id) ?? conteudo;
    }

    private async Task NotificarAlunosDaTurmaAsync(int turmaId, string tituloConteudo)
    {
        var alunoIds = await _context.Matriculas
            .Where(m => m.TurmaId == turmaId && m.Status == StatusMatricula.Aprovada)
            .Select(m => m.AlunoId)
            .ToListAsync();

        await _notificacaoService.NotificarVariosAsync(
            alunoIds,
            "Novo conteudo publicado",
            $"O conteudo \"{tituloConteudo}\" foi publicado na sua turma.",
            TipoNotificacao.ConteudoPublicado,
            "/app/conteudos");
    }

    public async Task ExcluirConteudoAsync(int id, int professorId)
    {
        var conteudo = await ObterConteudoPorProfessorAsync(id, professorId);

        _conteudoRepository.Deletar(conteudo);
        await _conteudoRepository.SalvarAlteracoesAsync();
    }

    private async Task ValidarProfessorAsync(int professorId)
    {
        _ = await _professorRepository.ObterPorIdAsync(professorId)
            ?? throw new KeyNotFoundException("Professor nao encontrado.");
    }

    private async Task ValidarAlunoAsync(int alunoId)
    {
        _ = await _alunoRepository.ObterPorIdAsync(alunoId)
            ?? throw new KeyNotFoundException("Aluno nao encontrado.");
    }

    private async Task<Turma> ValidarTurmaDoProfessorAsync(int professorId, int turmaId)
    {
        var turma = await _turmaRepository.ObterPorIdAsync(turmaId)
            ?? throw new KeyNotFoundException("Turma nao encontrada.");

        if (turma.ProfessorId != professorId)
        {
            throw new InvalidOperationException("A turma informada nao esta vinculada ao professor autenticado.");
        }

        return turma;
    }

    private async Task<Modulo> ValidarModuloAsync(int moduloId)
    {
        return await _moduloRepository.ObterPorIdAsync(moduloId)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
    }

    private static void ValidarCompatibilidadeTurmaModulo(Turma turma, Modulo modulo)
    {
        if (turma.CursoId != modulo.CursoId)
        {
            throw new InvalidOperationException("O modulo selecionado nao pertence ao mesmo curso da turma informada.");
        }
    }

    private static void AplicarDados(
        ConteudoDidatico conteudo,
        string titulo,
        string descricao,
        TipoConteudoDidatico tipoConteudo,
        string corpoTexto,
        string arquivoUrl,
        string linkUrl,
        int ordemExibicao,
        decimal pesoProgresso)
    {
        var tituloNormalizado = (titulo ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(tituloNormalizado))
        {
            throw new ArgumentException("O titulo do conteudo e obrigatorio.");
        }

        if (ordemExibicao < 0)
        {
            throw new ArgumentException("A ordem de exibicao nao pode ser negativa.");
        }

        if (pesoProgresso <= 0)
        {
            throw new ArgumentException("O peso de progresso deve ser maior que zero.");
        }

        var descricaoNormalizada = (descricao ?? string.Empty).Trim();
        var corpoTextoNormalizado = (corpoTexto ?? string.Empty).Trim();
        var arquivoUrlNormalizado = (arquivoUrl ?? string.Empty).Trim();
        var linkUrlNormalizado = (linkUrl ?? string.Empty).Trim();

        switch (tipoConteudo)
        {
            case TipoConteudoDidatico.Texto:
                if (string.IsNullOrWhiteSpace(corpoTextoNormalizado))
                {
                    throw new ArgumentException("Informe o corpo do texto para esse tipo de conteudo.");
                }

                arquivoUrlNormalizado = string.Empty;
                linkUrlNormalizado = string.Empty;
                break;

            case TipoConteudoDidatico.Pdf:
            case TipoConteudoDidatico.Video:
            case TipoConteudoDidatico.Imagem:
                if (string.IsNullOrWhiteSpace(arquivoUrlNormalizado))
                {
                    throw new ArgumentException("Envie um arquivo para esse tipo de conteudo.");
                }

                corpoTextoNormalizado = string.Empty;
                linkUrlNormalizado = string.Empty;
                break;

            case TipoConteudoDidatico.Link:
                if (string.IsNullOrWhiteSpace(linkUrlNormalizado))
                {
                    throw new ArgumentException("Informe a URL do recurso para esse tipo de conteudo.");
                }

                corpoTextoNormalizado = string.Empty;
                arquivoUrlNormalizado = string.Empty;
                break;

            default:
                throw new ArgumentException("Tipo de conteudo invalido.");
        }

        conteudo.Titulo = tituloNormalizado;
        conteudo.Descricao = descricaoNormalizada;
        conteudo.TipoConteudo = tipoConteudo;
        conteudo.CorpoTexto = corpoTextoNormalizado;
        conteudo.ArquivoUrl = arquivoUrlNormalizado;
        conteudo.LinkUrl = linkUrlNormalizado;
        conteudo.OrdemExibicao = ordemExibicao;
        conteudo.PesoProgresso = decimal.Round(pesoProgresso, 2, MidpointRounding.AwayFromZero);
    }
}
