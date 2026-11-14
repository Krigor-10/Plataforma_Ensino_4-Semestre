using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class ChamadoSuporteService : IChamadoSuporteService
{
    private const int TamanhoMaximoDoResumo = 300;

    private readonly PlataformaContext _context;
    private readonly IChatbotIAService _chatbotIAService;
    private readonly INotificacaoService _notificacaoService;
    private readonly ILogger<ChamadoSuporteService> _logger;

    public ChamadoSuporteService(
        PlataformaContext context,
        IChatbotIAService chatbotIAService,
        INotificacaoService notificacaoService,
        ILogger<ChamadoSuporteService> logger)
    {
        _context = context;
        _chatbotIAService = chatbotIAService;
        _notificacaoService = notificacaoService;
        _logger = logger;
    }

    public async Task<ChamadoSuporteResponseDto> AbrirAsync(int alunoId, AbrirChamadoDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Texto))
        {
            throw new ArgumentException("Descreva o problema antes de abrir o chamado.");
        }

        // Rota: assunto de um curso com coordenador vai pro Coordenador daquele
        // curso; conta/pagamento/plataforma ou curso sem coordenador vai pro Admin.
        int? coordenadorDestinoId = null;
        if (dto.CursoId.HasValue)
        {
            coordenadorDestinoId = await _context.Cursos
                .Where(curso => curso.Id == dto.CursoId.Value)
                .Select(curso => curso.CoordenadorId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var resumo = await MontarResumoAsync(dto.ConversaId, dto.Texto, cancellationToken);

        var chamado = ChamadoSuporte.Abrir(alunoId, dto.CursoId, coordenadorDestinoId, resumo, dto.ConversaId);
        _context.ChamadosSuporte.Add(chamado);
        await _context.SaveChangesAsync(cancellationToken);

        _context.MensagensChamado.Add(MensagemChamado.Criar(chamado.Id, alunoId, dto.Texto));
        await _context.SaveChangesAsync(cancellationToken);

        await NotificarDestinoAsync(chamado, "Novo chamado de suporte", resumo, TipoNotificacao.ChamadoNovo);

        return await ObterDtoAsync(chamado.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<ChamadoSuporteResponseDto>> ListarMeusAsync(int alunoId)
    {
        var chamados = await ConsultaBase()
            .Where(chamado => chamado.AlunoId == alunoId)
            .OrderByDescending(chamado => chamado.AtualizadoEm)
            .ToListAsync();

        return chamados.Select(MapearChamado).ToList();
    }

    public async Task<ChamadoSuporteResponseDto> ObterPorIdAsync(int chamadoId, ClaimsPrincipal usuario)
    {
        var chamado = await ConsultaBase().FirstOrDefaultAsync(chamado => chamado.Id == chamadoId)
            ?? throw new KeyNotFoundException("Chamado nao encontrado.");

        VerificarAcesso(usuario, chamado);
        return MapearChamado(chamado);
    }

    public async Task<IReadOnlyList<ChamadoSuporteResponseDto>> ListarParaStaffAsync(ClaimsPrincipal usuario, StatusChamadoSuporte? status)
    {
        var consulta = ConsultaBase();

        if (!usuario.IsInRole("Admin"))
        {
            var coordenadorId = usuario.ObterUsuarioId();
            consulta = consulta.Where(chamado => chamado.CoordenadorDestinoId == coordenadorId);
        }

        if (status.HasValue)
        {
            consulta = consulta.Where(chamado => chamado.Status == status.Value);
        }

        var chamados = await consulta.OrderByDescending(chamado => chamado.AtualizadoEm).ToListAsync();
        return chamados.Select(MapearChamado).ToList();
    }

    public async Task<ChamadoSuporteResponseDto> ResponderAsync(int chamadoId, ClaimsPrincipal usuario, ResponderChamadoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Texto))
        {
            throw new ArgumentException("A mensagem nao pode ser vazia.");
        }

        var chamado = await _context.ChamadosSuporte.FirstOrDefaultAsync(chamado => chamado.Id == chamadoId)
            ?? throw new KeyNotFoundException("Chamado nao encontrado.");

        VerificarAcesso(usuario, chamado);

        var autorId = usuario.ObterUsuarioId()
            ?? throw new InvalidOperationException("Nao foi possivel identificar o usuario autenticado.");

        _context.MensagensChamado.Add(MensagemChamado.Criar(chamadoId, autorId, dto.Texto));

        if (usuario.IsInRole("Aluno"))
        {
            // Resposta do dono reabre a conversa - volta pra Aberto e avisa quem
            // responde pelo chamado (Admin ou o Coordenador do curso).
            chamado.MarcarComoAberto();
            await _context.SaveChangesAsync();
            await NotificarDestinoAsync(chamado, "Nova mensagem em chamado de suporte", Truncar(dto.Texto, 200), TipoNotificacao.ChamadoNovaMensagem);
        }
        else
        {
            chamado.MarcarComoRespondido();
            await _context.SaveChangesAsync();
            await _notificacaoService.NotificarAsync(
                chamado.AlunoId,
                "Seu chamado de suporte foi respondido",
                Truncar(dto.Texto, 200),
                TipoNotificacao.ChamadoNovaMensagem,
                $"/chamados/{chamadoId}");
        }

        return await ObterDtoAsync(chamadoId);
    }

    public async Task ResolverAsync(int chamadoId, ClaimsPrincipal usuario)
    {
        if (usuario.IsInRole("Aluno"))
        {
            // Mesma mensagem de "nao encontrado" de proposito - um aluno nunca
            // deveria sequer saber se o chamado existe quando a acao nao e dele.
            throw new KeyNotFoundException("Chamado nao encontrado.");
        }

        var chamado = await _context.ChamadosSuporte.FirstOrDefaultAsync(chamado => chamado.Id == chamadoId)
            ?? throw new KeyNotFoundException("Chamado nao encontrado.");

        VerificarAcesso(usuario, chamado);
        chamado.Resolver();
        await _context.SaveChangesAsync();
    }

    public async Task ReabrirAsync(int chamadoId, int alunoId)
    {
        var chamado = await _context.ChamadosSuporte
            .FirstOrDefaultAsync(chamado => chamado.Id == chamadoId && chamado.AlunoId == alunoId)
            ?? throw new KeyNotFoundException("Chamado nao encontrado.");

        chamado.Reabrir();
        await _context.SaveChangesAsync();

        await NotificarDestinoAsync(chamado, "Chamado de suporte reaberto", Truncar(chamado.Resumo, 200), TipoNotificacao.ChamadoNovaMensagem);
    }

    private IQueryable<ChamadoSuporte> ConsultaBase() =>
        _context.ChamadosSuporte
            .AsNoTracking()
            .Include(chamado => chamado.Aluno)
            .Include(chamado => chamado.Curso)
            .Include(chamado => chamado.Mensagens)
                .ThenInclude(mensagem => mensagem.Autor);

    private async Task<ChamadoSuporteResponseDto> ObterDtoAsync(int chamadoId, CancellationToken cancellationToken = default)
    {
        var chamado = await ConsultaBase().FirstOrDefaultAsync(chamado => chamado.Id == chamadoId, cancellationToken)
            ?? throw new KeyNotFoundException("Chamado nao encontrado.");
        return MapearChamado(chamado);
    }

    private static void VerificarAcesso(ClaimsPrincipal usuario, ChamadoSuporte chamado)
    {
        if (usuario.IsInRole("Admin"))
        {
            return;
        }

        if (usuario.IsInRole("Aluno"))
        {
            if (chamado.AlunoId == usuario.ObterUsuarioId())
            {
                return;
            }
        }
        else if (usuario.IsInRole("Coordenador") && chamado.CoordenadorDestinoId == usuario.ObterUsuarioId())
        {
            return;
        }

        throw new KeyNotFoundException("Chamado nao encontrado.");
    }

    private async Task NotificarDestinoAsync(ChamadoSuporte chamado, string titulo, string mensagem, TipoNotificacao tipo)
    {
        var link = $"/chamados/{chamado.Id}";
        if (chamado.CoordenadorDestinoId.HasValue)
        {
            await _notificacaoService.NotificarAsync(chamado.CoordenadorDestinoId.Value, titulo, mensagem, tipo, link);
            return;
        }

        var idsDosAdmins = await _context.Admins.Select(admin => admin.Id).ToListAsync();
        if (idsDosAdmins.Count > 0)
        {
            await _notificacaoService.NotificarVariosAsync(idsDosAdmins, titulo, mensagem, tipo, link);
        }
    }

    private async Task<string> MontarResumoAsync(int? conversaId, string textoDoChamado, CancellationToken cancellationToken)
    {
        if (!conversaId.HasValue)
        {
            return Truncar(textoDoChamado, TamanhoMaximoDoResumo);
        }

        var mensagensDaConversaEntidades = await _context.MensagensChatbot
            .AsNoTracking()
            .Where(mensagem => mensagem.ConversaId == conversaId.Value)
            .OrderBy(mensagem => mensagem.CriadoEm)
            .ToListAsync(cancellationToken);

        if (mensagensDaConversaEntidades.Count == 0)
        {
            return Truncar(textoDoChamado, TamanhoMaximoDoResumo);
        }

        var mensagensDaConversa = mensagensDaConversaEntidades
            .Select(mensagem => (Papel: mensagem.Papel == PapelMensagemChatbot.Usuario ? "user" : "assistant", mensagem.Texto))
            .ToList();

        try
        {
            var resumo = await _chatbotIAService.ResumirConversaAsync(mensagensDaConversa, cancellationToken);
            return string.IsNullOrWhiteSpace(resumo) ? MontarResumoDeFallback(mensagensDaConversa) : Truncar(resumo, TamanhoMaximoDoResumo);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Falha ao gerar o resumo automatico do chamado - usando as ultimas mensagens do aluno como fallback.");
            return MontarResumoDeFallback(mensagensDaConversa);
        }
    }

    private static string MontarResumoDeFallback(List<(string Papel, string Texto)> mensagens)
    {
        var ultimasMensagensDoAluno = mensagens
            .Where(mensagem => mensagem.Papel == "user")
            .TakeLast(3)
            .Select(mensagem => mensagem.Texto);

        return Truncar(string.Join(" / ", ultimasMensagensDoAluno), TamanhoMaximoDoResumo);
    }

    private static string Truncar(string texto, int tamanho) => texto.Length > tamanho ? texto[..tamanho] : texto;

    private static ChamadoSuporteResponseDto MapearChamado(ChamadoSuporte chamado)
    {
        return new ChamadoSuporteResponseDto
        {
            Id = chamado.Id,
            AlunoId = chamado.AlunoId,
            AlunoNome = chamado.Aluno?.Nome ?? string.Empty,
            CursoId = chamado.CursoId,
            CursoTitulo = chamado.Curso?.Titulo,
            CoordenadorDestinoId = chamado.CoordenadorDestinoId,
            Status = chamado.Status,
            Resumo = chamado.Resumo,
            CriadoEm = chamado.CriadoEm,
            AtualizadoEm = chamado.AtualizadoEm,
            ResolvidoEm = chamado.ResolvidoEm,
            Mensagens = chamado.Mensagens
                .OrderBy(mensagem => mensagem.CriadoEm)
                .Select(mensagem => new MensagemChamadoResponseDto
                {
                    Id = mensagem.Id,
                    AutorId = mensagem.AutorId,
                    AutorNome = mensagem.Autor?.Nome ?? string.Empty,
                    Texto = mensagem.Texto,
                    CriadoEm = mensagem.CriadoEm
                })
                .ToList()
        };
    }
}
