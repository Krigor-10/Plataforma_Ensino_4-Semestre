using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class CertificadoService : ICertificadoService
{
    private readonly PlataformaContext _context;
    private readonly IAcessoAcademicoService _acessoAcademicoService;
    private readonly IConfiguration? _configuration;
    private readonly IHostEnvironment? _ambiente;
    private readonly ILogger<CertificadoService>? _logger;
    private readonly INotificacaoService? _notificacaoService;

    // configuration/ambiente/logger/notificacaoService sao opcionais so pra
    // nao obrigar os ~30 testes existentes (que instanciam CertificadoService
    // direto, sem DI) a passar um fake de cada - em produção o ASP.NET Core
    // sempre injeta os de verdade via Program.cs. Quando nulos (testes antigos
    // que nao passam esses argumentos), AprovacaoCertificadoSimuladaHabilitada()
    // volta false (mesmo comportamento de sempre) e a notificacao da emissao
    // automatica simplesmente nao dispara.
    public CertificadoService(
        PlataformaContext context,
        IAcessoAcademicoService acessoAcademicoService,
        IConfiguration? configuration = null,
        IHostEnvironment? ambiente = null,
        ILogger<CertificadoService>? logger = null,
        INotificacaoService? notificacaoService = null)
    {
        _context = context;
        _acessoAcademicoService = acessoAcademicoService;
        _configuration = configuration;
        _ambiente = ambiente;
        _logger = logger;
        _notificacaoService = notificacaoService;
    }

    /// <summary>
    /// Modo de teste pra validar o fluxo de emissao de certificado sem
    /// depender de uma nota real >= 7 - existe SO pra homologacao/dev.
    /// Dupla trava, nenhuma delas vindo do cliente: (1) o ambiente nao pode
    /// ser Production, hard-coded, mesmo que a config diga true por engano;
    /// (2) a flag "RecursosTeste:AprovacaoCertificadoSimulada" precisa estar
    /// true no appsettings/variavel de ambiente do SERVIDOR (nunca um valor
    /// que o aluno manda na requisicao). So baseado nisso, a avaliacao ainda
    /// precisa ter sido corrigida de verdade pra essa aprovacao simulada
    /// valer - ver uso em ObterSinaisAsync.
    /// </summary>
    private bool AprovacaoCertificadoSimuladaHabilitada()
    {
        if (_ambiente is null || _ambiente.IsProduction())
        {
            return false;
        }

        return _configuration?.GetValue("RecursosTeste:AprovacaoCertificadoSimulada", false) ?? false;
    }

    public async Task<Matricula> EmitirCertificadoAsync(int alunoId, int matriculaId)
    {
        var matricula = await ObterMatriculaComDetalhesAsync(m => m.Id == matriculaId)
            ?? throw new KeyNotFoundException("Matricula nao encontrada.");

        if (matricula.AlunoId != alunoId)
        {
            throw new KeyNotFoundException("Matricula nao encontrada.");
        }

        var pendencias = await ObterPendenciasAsync(matricula);
        if (pendencias.Count > 0)
        {
            throw pendencias[0].CriarExcecao();
        }

        if (matricula.CertificadoEmitidoEm is null)
        {
            matricula.EmitirCertificado();

            // Anexa só a matrícula raiz (grafo carregado via Include fica Unchanged)
            // e marca apenas essa propriedade como modificada, evitando updates
            // indesejados em Aluno/Curso/Turma/ProgressoCursoAluno.
            _context.Matriculas.Attach(matricula);
            _context.Entry(matricula).Property(m => m.CertificadoEmitidoEm).IsModified = true;
            await _context.SaveChangesAsync();
        }

        return matricula;
    }

    /// <summary>
    /// Emissao automatica, silenciosa e idempotente - ver doc na interface.
    /// Nunca propaga excecao: so registra no log e segue, porque e sempre
    /// um efeito colateral de uma operacao que ja foi concluida com sucesso
    /// (concluir conteudo, lancar nota, confirmar pagamento etc.).
    /// </summary>
    public async Task TentarEmitirAutomaticamenteAsync(int matriculaId)
    {
        try
        {
            // Carregada RASTREADA (nao AsNoTracking, diferente de
            // ObterMatriculaComDetalhesAsync) de proposito: este metodo e
            // sempre chamado depois de outra operacao que ja tocou essa
            // mesma matricula no MESMO DbContext da requisicao (concluir
            // conteudo, lancar nota, confirmar pagamento...). Com
            // AsNoTracking + Attach (o padrao de EmitirCertificadoAsync,
            // que sempre e o primeiro a tocar a matricula na requisicao),
            // o EF lancaria "already tracked by another instance". Aqui, se
            // ja houver uma instancia rastreada com esse Id, o EF devolve
            // ELA MESMA (resolucao de identidade) - sem conflito, sem
            // Attach/Entry nenhum.
            var matricula = await _context.Matriculas
                .Include(m => m.Aluno)
                .Include(m => m.Curso)
                .Include(m => m.ProgressosCurso)
                .FirstOrDefaultAsync(m => m.Id == matriculaId);

            if (matricula is null || matricula.CertificadoEmitidoEm is not null)
            {
                return;
            }

            var pendencias = await ObterPendenciasAsync(matricula);
            if (pendencias.Count > 0)
            {
                return;
            }

            matricula.EmitirCertificado();
            await _context.SaveChangesAsync();

            await NotificarCertificadoEmitidoAsync(matricula);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Falha ao tentar emitir automaticamente o certificado da matricula {MatriculaId}.", matriculaId);
        }
    }

    private async Task NotificarCertificadoEmitidoAsync(Matricula matricula)
    {
        if (_notificacaoService is null)
        {
            return;
        }

        var tituloCurso = matricula.Curso?.Titulo ?? "seu curso";
        await _notificacaoService.NotificarAsync(
            matricula.AlunoId,
            "Certificado emitido",
            $"Seu certificado de {tituloCurso} foi emitido.",
            TipoNotificacao.CertificadoEmitido,
            "/app/certificados");
    }

    public async Task<ResultadoEmissaoLoteCertificados> EmitirCertificadosDoCursoAsync(int cursoId)
    {
        var matriculas = await _context.Matriculas
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.ProgressosCurso)
            .Where(m => m.CursoId == cursoId && m.Status == StatusMatricula.Aprovada)
            .ToListAsync();

        var emitidos = 0;
        var bloqueados = 0;

        foreach (var matricula in matriculas)
        {
            var pendencias = await ObterPendenciasAsync(matricula);
            if (pendencias.Count > 0)
            {
                bloqueados++;
                continue;
            }

            var jaTinhaCertificado = matricula.CertificadoEmitidoEm is not null;
            matricula.EmitirCertificado();
            if (!jaTinhaCertificado)
            {
                emitidos++;
                await NotificarCertificadoEmitidoAsync(matricula);
            }
        }

        await _context.SaveChangesAsync();

        return new ResultadoEmissaoLoteCertificados(emitidos, bloqueados);
    }

    public async Task<IReadOnlyList<string>> VerificarRequisitosAsync(Matricula matricula)
    {
        ArgumentNullException.ThrowIfNull(matricula);
        var pendencias = await ObterPendenciasAsync(matricula);
        return pendencias.Select(pendencia => pendencia.Mensagem).ToList();
    }

    public async Task<IReadOnlyList<StatusCertificadoMatricula>> ListarStatusCertificadosDoAlunoAsync(int alunoId)
    {
        var matriculas = await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.ProgressosCurso)
            .Where(m => m.AlunoId == alunoId && m.Status == StatusMatricula.Aprovada)
            .ToListAsync();

        var resultado = new List<StatusCertificadoMatricula>(matriculas.Count);
        foreach (var matricula in matriculas)
        {
            var sinais = await ObterSinaisAsync(matricula);
            var pendencias = sinais.CertificadoJaEmitido
                ? new List<Pendencia>()
                : MontarPendencias(matricula, sinais);

            resultado.Add(new StatusCertificadoMatricula(matricula, pendencias.Select(p => p.Mensagem).ToList(), CalcularSituacao(sinais)));
        }

        return resultado;
    }

    // Par mensagem/fabrica-de-excecao: VerificarRequisitosAsync expõe só a
    // mensagem (pra tela/modo demo), EmitirCertificadoAsync usa a mesma lista
    // pra lancar a excecao certa (ArgumentException/InvalidOperationException)
    // na primeira pendencia - preserva o tipo e a mensagem que os 19 testes
    // de CertificadoServiceTests ja esperavam antes dessa extracao.
    private sealed record Pendencia(string Mensagem, Func<Exception> CriarExcecao);

    /// <summary>
    /// Sinais individuais usados tanto pra montar as mensagens de pendencia
    /// (ObterPendenciasAsync) quanto pra calcular a Situacao de uma unica vez
    /// so (CalcularSituacao) - sem repetir as consultas ao banco pros dois.
    /// </summary>
    private sealed record SinaisCertificado(
        bool CertificadoJaEmitido,
        bool AcessoLiberado,
        bool CursoConcluido,
        bool AvaliacaoPendenteCorrecao,
        bool PossuiAvaliacaoFormalPublicada,
        bool NotaAbaixoDoMinimoBloqueante,
        bool AcompanhadoNaoEncerrado);

    private async Task<SinaisCertificado> ObterSinaisAsync(Matricula matricula)
    {
        // Certificado ja emitido vale pra sempre - uma avaliacao nova
        // publicada depois nao pode tirar um certificado que ja foi
        // entregue (docs/certificados-mobile/PROMPT-agente-certificados-
        // mobile.md, item 1/Causa 1). Nenhum outro sinal importa nesse caso.
        if (matricula.CertificadoEmitidoEm is not null)
        {
            return new SinaisCertificado(true, true, true, false, false, false, false);
        }

        var acessoLiberado = await _acessoAcademicoService.TemAcessoLiberadoAsync(matricula);

        var progresso = matricula.ProgressosCurso.FirstOrDefault();
        var cursoConcluido = progresso is not null && progresso.PercentualConclusao >= 100;

        // PercentualConclusao so conta conteudo+quiz (ver ProgressoAlunoService.RecalcularCursoAsync);
        // Prova/Exercicio nao entra no progresso, entao precisa ser checado a parte aqui
        // pra impedir certificado com avaliacao somativa publicada e ainda sem correcao.
        var avaliacaoPendenteCorrecao = await _context.Avaliacoes
            .AsNoTracking()
            .Where(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.CursoId == matricula.CursoId &&
                // Defesa pra dados antigos: avaliacao publicada sem questao
                // (brecha ja fechada na criacao) e tratada como nao publicada.
                avaliacao.Questoes.Count > 0)
            .Select(avaliacao => avaliacao.Id)
            .Where(avaliacaoId => !_context.LancamentosNotasAlunos
                .Any(lancamento => lancamento.MatriculaId == matricula.Id && lancamento.AvaliacaoId == avaliacaoId))
            .AnyAsync();

        // Nota minima de aprovacao: so se aplica a cursos com avaliacao formal
        // publicada (Prova/Exercicio) - cursos so com quiz/conteudo nunca calculam
        // NotaFinal (fica no default 0, ver ProgressoAlunoService.RecalcularMediaCursoAsync)
        // e nao devem ser bloqueados por essa regra. Concluir a avaliacao (checado
        // acima) nao significa estar aprovado - a media precisa bater o minimo.
        var possuiAvaliacaoFormalPublicada = await _context.Avaliacoes
            .AsNoTracking()
            .AnyAsync(avaliacao =>
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado &&
                avaliacao.TipoAvaliacao != TipoAvaliacao.Quiz &&
                avaliacao.CursoId == matricula.CursoId &&
                avaliacao.Questoes.Count > 0);

        var notaAbaixoDoMinimoBloqueante = false;
        if (possuiAvaliacaoFormalPublicada && matricula.NotaFinal < 7m)
        {
            // Aprovacao simulada (modo de teste, ver AprovacaoCertificadoSimuladaHabilitada)
            // so vale depois que a avaliacao formal foi realmente corrigida
            // (!avaliacaoPendenteCorrecao, checado acima) - nunca aprova quem
            // ainda nem fez a prova. A nota real (matricula.NotaFinal) nao e
            // alterada, so essa pendencia especifica deixa de bloquear.
            if (!avaliacaoPendenteCorrecao && AprovacaoCertificadoSimuladaHabilitada())
            {
                _logger?.LogWarning(
                    "[MODO DE TESTE] Aprovacao simulada aplicada na matricula {MatriculaId} (aluno {AlunoId}, curso {CursoId}): nota real {NotaFinal} fica abaixo do minimo 7,00, mas RecursosTeste:AprovacaoCertificadoSimulada esta habilitada em ambiente nao-producao - pendencia de nota minima ignorada so pra este fluxo de homologacao.",
                    matricula.Id, matricula.AlunoId, matricula.CursoId, matricula.NotaFinal);
            }
            else
            {
                notaAbaixoDoMinimoBloqueante = true;
            }
        }

        // Curso Acompanhado tem conteudo liberado aos poucos pelo professor —
        // "100% concluido" so e um criterio estavel depois que o coordenador
        // encerra o curso (ver CursoService.EncerrarCursoAsync). Gratuito/
        // PagoPacote ja nascem com todo o conteudo pronto, sem esse gate.
        var acompanhadoNaoEncerrado = matricula.Curso is not null
            && matricula.Curso.ModeloCurso == ModeloCurso.Acompanhado
            && !matricula.Curso.EncerradoEm.HasValue;

        return new SinaisCertificado(
            false,
            acessoLiberado,
            cursoConcluido,
            avaliacaoPendenteCorrecao,
            possuiAvaliacaoFormalPublicada,
            notaAbaixoDoMinimoBloqueante,
            acompanhadoNaoEncerrado);
    }

    private static List<Pendencia> MontarPendencias(Matricula matricula, SinaisCertificado sinais)
    {
        var pendencias = new List<Pendencia>();

        if (matricula.Status != StatusMatricula.Aprovada)
        {
            const string mensagem = "A matrícula ainda não foi aprovada.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        if (!sinais.AcessoLiberado)
        {
            const string mensagem = "O pagamento deste curso ainda não foi confirmado.";
            pendencias.Add(new Pendencia(mensagem, () => new InvalidOperationException(mensagem)));
        }

        if (!sinais.CursoConcluido)
        {
            const string mensagem = "O curso ainda não foi concluído.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        if (sinais.AvaliacaoPendenteCorrecao)
        {
            const string mensagem = "Há avaliações (prova/exercício) pendentes de correção para concluir o curso.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        if (sinais.NotaAbaixoDoMinimoBloqueante)
        {
            const string mensagem = "A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        if (sinais.AcompanhadoNaoEncerrado)
        {
            const string mensagem = "Este curso ainda não foi encerrado pelo coordenador.";
            pendencias.Add(new Pendencia(mensagem, () => new ArgumentException(mensagem)));
        }

        return pendencias;
    }

    /// <summary>
    /// Resume os sinais numa unica string pra tela (GET /Certificados/status),
    /// na ordem exata do prompt: a primeira regra que bater vale. "Emitido"
    /// vem sempre primeiro - um certificado entregue nao pode virar outra
    /// situacao por uma pendencia nova.
    /// </summary>
    private static string CalcularSituacao(SinaisCertificado sinais)
    {
        if (sinais.CertificadoJaEmitido)
        {
            return "Emitido";
        }

        if (!sinais.AcessoLiberado)
        {
            return "AguardandoPagamento";
        }

        if (!sinais.CursoConcluido)
        {
            return "EmAndamento";
        }

        if (sinais.AvaliacaoPendenteCorrecao)
        {
            return "AguardandoCorrecao";
        }

        if (sinais.NotaAbaixoDoMinimoBloqueante)
        {
            return "NotaAbaixoDoMinimo";
        }

        if (sinais.AcompanhadoNaoEncerrado)
        {
            return "AguardandoEncerramento";
        }

        return "Disponivel";
    }

    private async Task<List<Pendencia>> ObterPendenciasAsync(Matricula matricula)
    {
        // Mesmo short-circuit de ObterSinaisAsync: certificado ja emitido
        // devolve sem checar pendencia nenhuma - EmitirCertificadoAsync (que
        // usa este metodo) fica idempotente mesmo quando uma avaliacao nova
        // some depois (docs/certificados-mobile/PROMPT-agente-certificados-
        // mobile.md, item 2).
        if (matricula.CertificadoEmitidoEm is not null)
        {
            return new List<Pendencia>();
        }

        if (matricula.Status != StatusMatricula.Aprovada)
        {
            const string mensagem = "A matrícula ainda não foi aprovada.";
            return new List<Pendencia> { new(mensagem, () => new ArgumentException(mensagem)) };
        }

        var sinais = await ObterSinaisAsync(matricula);
        return MontarPendencias(matricula, sinais);
    }

    public async Task<IEnumerable<Matricula>> ListarCertificadosDoAlunoAsync(int alunoId)
    {
        return await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Where(m => m.AlunoId == alunoId && m.CertificadoEmitidoEm != null)
            .OrderByDescending(m => m.CertificadoEmitidoEm)
            .ToListAsync();
    }

    public async Task<Matricula> ObterCertificadoPorCodigoAsync(string codigo)
    {
        var codigoNormalizado = (codigo ?? string.Empty).Trim();

        var matricula = await ObterMatriculaComDetalhesAsync(m => m.CodigoRegistro == codigoNormalizado);

        if (matricula is null || matricula.CertificadoEmitidoEm is null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado.");
        }

        return matricula;
    }

    private async Task<Matricula?> ObterMatriculaComDetalhesAsync(System.Linq.Expressions.Expression<Func<Matricula, bool>> filtro)
    {
        return await _context.Matriculas
            .AsNoTracking()
            .Include(m => m.Aluno)
            .Include(m => m.Curso)
            .Include(m => m.ProgressosCurso)
            .FirstOrDefaultAsync(filtro);
    }
}
