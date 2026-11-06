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
    private readonly IGenericRepository<Modulo> _moduloRepository;
    private readonly INotificacaoService _notificacaoService;
    private readonly ICursoService _cursoService;
    private readonly PlataformaContext _context;

    public ConteudoDidaticoService(
        IConteudoDidaticoRepository conteudoRepository,
        IGenericRepository<Aluno> alunoRepository,
        IGenericRepository<Professor> professorRepository,
        IGenericRepository<Modulo> moduloRepository,
        INotificacaoService notificacaoService,
        ICursoService cursoService,
        PlataformaContext context)
    {
        _conteudoRepository = conteudoRepository;
        _alunoRepository = alunoRepository;
        _professorRepository = professorRepository;
        _moduloRepository = moduloRepository;
        _notificacaoService = notificacaoService;
        _cursoService = cursoService;
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

        var modulo = await ValidarModuloAsync(dto.ModuloId);
        await ValidarProfessorNoCursoAsync(professorId, modulo.CursoId);
        await _cursoService.GarantirCursoAbertoAsync(modulo.CursoId);

        var conteudo = new ConteudoDidatico
        {
            ModuloId = modulo.Id
        };
        conteudo.DefinirProfessorAutor(professorId);
        conteudo.DefinirCurso(modulo.CursoId);
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
            await NotificarAlunosDoCursoAsync(conteudo.CursoId, conteudo.Titulo);
        }

        return await _conteudoRepository.ObterDetalhePorIdAsync(conteudo.Id) ?? conteudo;
    }

    public async Task<ConteudoDidatico> AtualizarConteudoAsync(int id, int professorId, AtualizarConteudoDidaticoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var conteudo = await ObterConteudoPorProfessorAsync(id, professorId);
        var statusAnterior = conteudo.StatusPublicacao;
        var modulo = await ValidarModuloAsync(dto.ModuloId);
        await ValidarProfessorNoCursoAsync(professorId, modulo.CursoId);
        await _cursoService.GarantirCursoAbertoAsync(modulo.CursoId);

        conteudo.ModuloId = modulo.Id;
        conteudo.DefinirCurso(modulo.CursoId);
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
            await NotificarAlunosDoCursoAsync(conteudo.CursoId, conteudo.Titulo);
        }

        return await _conteudoRepository.ObterDetalhePorIdAsync(id) ?? conteudo;
    }

    private async Task NotificarAlunosDoCursoAsync(int cursoId, string tituloConteudo)
    {
        var alunoIds = await _context.Matriculas
            .Where(m => m.CursoId == cursoId && m.Status == StatusMatricula.Aprovada)
            .Select(m => m.AlunoId)
            .ToListAsync();

        await _notificacaoService.NotificarVariosAsync(
            alunoIds,
            "Novo conteudo publicado",
            $"O conteudo \"{tituloConteudo}\" foi publicado no seu curso.",
            TipoNotificacao.ConteudoPublicado,
            "/app/conteudos");
    }

    public async Task<bool> ExcluirConteudoAsync(int id, int professorId)
    {
        var conteudo = await ObterConteudoPorProfessorAsync(id, professorId);

        if (conteudo.ExcluidoEm is not null)
        {
            throw new KeyNotFoundException("Conteudo didatico nao encontrado.");
        }

        var possuiAvaliacaoVinculada = await _context.Avaliacoes.AnyAsync(avaliacao => avaliacao.ConteudoDidaticoId == id);
        if (possuiAvaliacaoVinculada)
        {
            throw new InvalidOperationException("Este conteudo possui uma avaliacao vinculada e nao pode ser excluido.");
        }

        // Arquivar em vez de excluir (fisico ou soft-delete invisivel via ExcluidoEm) quando ja
        // ha progresso de aluno: o Arquivado ja e o mecanismo "lixeira" da tela de Conteudos (visivel
        // via "Ver arquivados", com restaurar), ao contrario do ExcluidoEm que nao tem UI nenhuma.
        // Preserva o motivo original de nao apagar a linha: ProgressoConteudoAluno->ConteudoDidatico
        // e Cascade (ver ProgressoConfiguration), entao apagar a linha apagaria o progresso do aluno
        // junto, sem recalcular ProgressoModulo/ProgressoCurso.
        var possuiProgressoDeAluno = await _context.ProgressosConteudosAlunos
            .AnyAsync(progresso => progresso.ConteudoDidaticoId == id);
        if (possuiProgressoDeAluno)
        {
            conteudo.DefinirStatusPublicacao(StatusPublicacao.Arquivado);
            _conteudoRepository.Atualizar(conteudo);
            await _conteudoRepository.SalvarAlteracoesAsync();
            return true;
        }

        _conteudoRepository.Deletar(conteudo);
        await _conteudoRepository.SalvarAlteracoesAsync();
        return false;
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

    private async Task ValidarProfessorNoCursoAsync(int professorId, int cursoId)
    {
        if (!await _cursoService.ProfessorPertenceAoCursoAsync(professorId, cursoId))
        {
            throw new InvalidOperationException("O curso do modulo informado nao esta vinculado ao professor autenticado.");
        }
    }

    private async Task<Modulo> ValidarModuloAsync(int moduloId)
    {
        return await _moduloRepository.ObterPorIdAsync(moduloId)
            ?? throw new KeyNotFoundException("Modulo nao encontrado.");
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
