using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

public class CursoService : ICursoService
{
    private readonly PlataformaContext _context;
    private readonly IGenericRepository<Curso> _cursoRepository;
    private readonly IGenericRepository<Coordenador> _coordenadorRepository;
    private readonly INotificacaoService _notificacaoService;
    private readonly ICertificadoService _certificadoService;

    public CursoService(
        PlataformaContext context,
        IGenericRepository<Curso> cursoRepository,
        IGenericRepository<Coordenador> coordenadorRepository,
        INotificacaoService notificacaoService,
        ICertificadoService certificadoService)
    {
        _context = context;
        _cursoRepository = cursoRepository;
        _coordenadorRepository = coordenadorRepository;
        _notificacaoService = notificacaoService;
        _certificadoService = certificadoService;
    }

    public async Task<Curso> CriarCursoAsync(CriarCursoDto dto, int criadoPorId)
    {
        ValidarTitulo(dto.Titulo);

        var novoCurso = new Curso
        {
            Titulo = dto.Titulo.Trim(),
            Descricao = dto.Descricao?.Trim() ?? string.Empty,
            Preco = dto.Preco,
            ModeloCurso = dto.ModeloCurso ?? InferirModeloPorPreco(dto.Preco),
            CriadoPor = criadoPorId,
            CodigoRegistro = await GerarCodigoCursoAsync()
        };

        await _cursoRepository.AdicionarAsync(novoCurso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return novoCurso;
    }

    public async Task<Curso> AtualizarCursoAsync(int id, AtualizarCursoDto dto)
    {
        ValidarTitulo(dto.Titulo);

        var curso = await _cursoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        curso.Titulo = dto.Titulo.Trim();
        curso.Descricao = dto.Descricao?.Trim() ?? string.Empty;
        curso.Preco = dto.Preco;

        if (dto.ModeloCurso.HasValue)
        {
            curso.ModeloCurso = dto.ModeloCurso.Value;
        }

        // 27/11: curso Python ficou travado e "A venda" depois de trocar de
        // Gratuito publicado para Acompanhado. Ver Curso.LimparPublicacao.
        if (curso.ModeloCurso == ModeloCurso.Acompanhado)
        {
            curso.LimparPublicacao();
        }

        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return curso;
    }

    private static ModeloCurso InferirModeloPorPreco(decimal preco) =>
        preco <= 0 ? ModeloCurso.Gratuito : ModeloCurso.PagoPacote;

    public async Task<Curso> ObterCursoPorIdAsync(int id)
    {
        return await _cursoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Curso não encontrado.");
    }

    public async Task<IEnumerable<Curso>> ListarTodosCursosAsync()
    {
        return await _context.Cursos.AsNoTracking().ToListAsync();
    }

    public async Task<IEnumerable<Curso>> ListarCursosPorProfessorAsync(int professorId)
    {
        return await _context.Cursos
            .Where(curso => _context.ProfessoresCursos.Any(vinculo =>
                vinculo.ProfessorId == professorId &&
                vinculo.CursoId == curso.Id))
            .OrderBy(curso => curso.Titulo)
            .ToListAsync();
    }

    public async Task VincularProfessorAsync(int cursoId, int professorId)
    {
        _ = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        var professorExiste = await _context.Professores.AnyAsync(professor => professor.Id == professorId);
        if (!professorExiste)
        {
            throw new KeyNotFoundException("Professor não encontrado.");
        }

        var jaVinculado = await _context.ProfessoresCursos
            .AnyAsync(vinculo => vinculo.CursoId == cursoId && vinculo.ProfessorId == professorId);
        if (jaVinculado)
        {
            return;
        }

        _context.ProfessoresCursos.Add(new ProfessorCurso { CursoId = cursoId, ProfessorId = professorId });
        await _context.SaveChangesAsync();
    }

    public async Task DesvincularProfessorAsync(int cursoId, int professorId)
    {
        var vinculo = await _context.ProfessoresCursos
            .FirstOrDefaultAsync(item => item.CursoId == cursoId && item.ProfessorId == professorId)
            ?? throw new KeyNotFoundException("Vinculo entre professor e curso nao encontrado.");

        _context.ProfessoresCursos.Remove(vinculo);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<Professor>> ListarProfessoresVinculadosAsync(int cursoId)
    {
        _ = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        return await _context.Professores
            .Where(professor => _context.ProfessoresCursos.Any(vinculo =>
                vinculo.ProfessorId == professor.Id &&
                vinculo.CursoId == cursoId))
            .OrderBy(professor => professor.Nome)
            .ToListAsync();
    }

    public async Task<bool> ProfessorPertenceAoCursoAsync(int professorId, int cursoId)
    {
        return await _context.ProfessoresCursos
            .AnyAsync(vinculo => vinculo.ProfessorId == professorId && vinculo.CursoId == cursoId);
    }

    public async Task AdicionarModuloAsync(int cursoId, Modulo novoModulo)
    {
        ArgumentNullException.ThrowIfNull(novoModulo);

        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado para adicionar o módulo.");

        novoModulo.CodigoRegistro = await GerarCodigoModuloAsync();
        curso.AdicionarModulo(novoModulo);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    public async Task AtribuirCoordenadorAsync(int cursoId, int coordenadorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (coordenadorId == 0)
        {
            curso.RemoverCoordenador();
            _cursoRepository.Atualizar(curso);
            await _cursoRepository.SalvarAlteracoesAsync();
            return;
        }

        var coordenador = await _coordenadorRepository.ObterPorIdAsync(coordenadorId)
            ?? throw new KeyNotFoundException("Coordenador não encontrado.");

        curso.AtribuirCoordenador(coordenador);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    /// <summary>
    /// Trava edicao de conteudo/avaliacao/modulo: qualquer modelo de curso com
    /// EncerradoEm preenchido fica congelado, inclusive um PagoPacote que veio
    /// do fluxo Gratuito->pacote (so volta a editar depois do coordenador
    /// reabrir). Em Gratuito/Acompanhado tambem trava assim que o professor
    /// conclui (ConcluidoPeloProfessorEm), antes mesmo do encerramento - so
    /// volta a editar com "Devolver ao professor" ou reabrindo. Regra
    /// centralizada em <see cref="Curso.AceitaEdicao"/>, a mesma usada pelo
    /// recalculo de progresso (ProgressoAlunoService). Nao confundir com
    /// <see cref="GarantirCursoAbertoParaMatriculaAsync"/>, que tem uma regra
    /// diferente pra matricula nova.
    /// </summary>
    public async Task GarantirCursoAbertoParaEdicaoAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.AceitaEdicao())
        {
            return;
        }

        if (curso.PublicadoParaVendaEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso esta publicado para os alunos e o conteudo esta travado. Para alterar, peca ao Admin para tirar do catalogo/da venda.");
        }

        if (curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso foi encerrado e nao aceita mais alteracoes de conteudo, avaliacoes ou modulos.");
        }

        throw new InvalidOperationException(curso.ModeloCurso == ModeloCurso.PagoPacote
            ? "Este curso foi concluido pelo professor e esta aguardando a publicacao. Para alterar, peca ao coordenador para devolver o curso."
            : "Este curso foi concluido pelo professor e esta aguardando o encerramento. Para alterar, peca ao coordenador para devolver o curso.");
    }

    /// <summary>
    /// Trava matricula nova: so bloqueia Gratuito/Acompanhado encerrados. Um
    /// PagoPacote nunca bloqueia aqui — "so compra o que esta a venda" e regra
    /// separada (ver venda/publicar), independente do conteudo estar travado.
    /// </summary>
    public async Task GarantirCursoAbertoParaMatriculaAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        // Pacote 7 (decisao D3): Acompanhado recusa depois de encerrado;
        // Gratuito so aceita publicado (no catalogo). O Pago tem a checagem
        // propria na compra (MatriculaService.ComprarCursoAsync).
        if (curso.ModeloCurso == ModeloCurso.Acompanhado && curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso foi encerrado e nao aceita mais matriculas novas.");
        }

        if (curso.ModeloCurso == ModeloCurso.Gratuito && !curso.PublicadoParaVendaEm.HasValue)
        {
            throw new InvalidOperationException("Este curso nao esta disponivel no momento.");
        }
    }

    public async Task ConcluirCursoComoProfessorAsync(int cursoId, int professorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        // Pacote 7: o Pago criado direto tambem e concluido pelo professor
        // (vai direto ao Admin, "Pronto para publicar", decisao D11) - so
        // enquanto nao estiver publicado nem encerrado.
        var ehPago = curso.ModeloCurso == ModeloCurso.PagoPacote;
        if (ehPago && (curso.PublicadoParaVendaEm.HasValue || curso.EncerradoEm.HasValue))
        {
            throw new InvalidOperationException("Este curso ja esta publicado ou encerrado e nao pode ser concluido de novo.");
        }

        if (!await ProfessorPertenceAoCursoAsync(professorId, cursoId))
        {
            throw new InvalidOperationException("O professor informado nao esta vinculado a este curso.");
        }

        // Decisao D9 da auditoria de 26/11: sem coordenador ninguem encerra
        // o curso depois (o Admin nao encerra), entao ele ficaria parado.
        // O Pago nao passa pelo coordenador (D11).
        if (!ehPago && !curso.CoordenadorId.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso ainda nao tem coordenador. Peca ao Admin para atribuir um coordenador antes de concluir.");
        }

        if (curso.ConcluidoPeloProfessorEm.HasValue)
        {
            throw new InvalidOperationException("Este curso ja foi marcado como concluido pelo professor.");
        }

        curso.ConcluirPeloProfessor(professorId);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        if (ehPago)
        {
            var adminIds = await _context.Admins.AsNoTracking().Select(admin => admin.Id).ToListAsync();
            foreach (var adminId in adminIds)
            {
                await _notificacaoService.NotificarAsync(
                    adminId,
                    "Curso pronto para publicar",
                    $"O professor concluiu o curso \"{curso.Titulo}\". Confira o preco e coloque a venda quando estiver pronto.",
                    TipoNotificacao.CursoConcluidoPeloProfessor,
                    $"/app/cursos/{cursoId}");
            }

            return;
        }

        if (curso.CoordenadorId.HasValue)
        {
            await _notificacaoService.NotificarAsync(
                curso.CoordenadorId.Value,
                "Curso pronto para encerramento",
                $"O professor concluiu o curso \"{curso.Titulo}\". Revise e encerre quando estiver pronto pra liberar os certificados.",
                TipoNotificacao.CursoConcluidoPeloProfessor,
                "/app/cursos");
        }
    }

    public async Task EncerrarCursoAsync(int cursoId, int coordenadorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        // Pacote 7 (decisao D11): so Acompanhado e Gratuito passam pelo
        // encerramento do coordenador. O Pago concluido vai direto ao Admin
        // (publicar), e reabrir um Pago desfaz a conclusao.
        var modeloAceito = curso.ModeloCurso == ModeloCurso.Acompanhado
            || curso.ModeloCurso == ModeloCurso.Gratuito;

        if (!modeloAceito)
        {
            throw new InvalidOperationException("Este curso nao pode ser encerrado.");
        }

        if (curso.CoordenadorId != coordenadorId)
        {
            throw new InvalidOperationException("Apenas o coordenador responsavel por este curso pode encerra-lo.");
        }

        if (!curso.ConcluidoPeloProfessorEm.HasValue)
        {
            throw new InvalidOperationException("O professor ainda nao concluiu este curso.");
        }

        if (curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException("Este curso ja esta encerrado.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        curso.Encerrar(coordenadorId);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        if (curso.ModeloCurso == ModeloCurso.Acompanhado)
        {
            // Curso Acompanhado: o aluno nunca pede o certificado - o encerramento
            // e o gatilho da emissao automatica pra quem ja cumpre os requisitos
            // (ver ICertificadoService.EmitirCertificadosDoCursoAsync). Na mesma
            // transacao do encerramento pra nao sobrar curso encerrado sem
            // certificados se a emissao falhar no meio do caminho. Gratuito e
            // PagoPacote nao emitem em lote aqui — certificado deles segue a
            // regra normal de pendencias (ICertificadoService.ObterPendenciasAsync).
            await _certificadoService.EmitirCertificadosDoCursoAsync(cursoId);
        }

        await transaction.CommitAsync();

        // Fora da transacao (mesmo padrao do aviso ao coordenador em
        // ConcluirCursoComoProfessorAsync): falha ao notificar nao pode desfazer
        // o encerramento. Link abre o curso especifico, nao a lista.
        var adminIds = await _context.Admins.AsNoTracking().Select(admin => admin.Id).ToListAsync();
        foreach (var adminId in adminIds)
        {
            await _notificacaoService.NotificarAsync(
                adminId,
                "Curso encerrado",
                $"O curso \"{curso.Titulo}\" foi encerrado.",
                TipoNotificacao.CursoEncerrado,
                $"/app/cursos/{cursoId}");
        }
    }

    public async Task ReabrirCursoAsync(int cursoId, int coordenadorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.CoordenadorId != coordenadorId)
        {
            throw new InvalidOperationException("Apenas o coordenador responsavel por este curso pode reabri-lo.");
        }

        if (!curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException("Este curso nao esta encerrado.");
        }

        // Correcao Adendo 2 item 1: um pacote que os alunos ja estao comprando
        // nao pode ser reaberto por baixo dos pes deles - o Admin precisa
        // tirar da venda primeiro (PublicarParaVendaAsync/DespublicarDaVendaAsync).
        if (curso.PublicadoParaVendaEm.HasValue)
        {
            throw new InvalidOperationException("Tire o curso da venda/do catalogo antes de reabrir.");
        }

        // Gratuito/Acompanhado: reabrir tambem devolve ao professor - sem isso
        // o curso voltaria "Aguardando encerramento" para sempre (ConcluidoPeloProfessorEm
        // continuaria preenchido) e o professor nunca conseguiria concluir de
        // novo. Pacote (inclusive vindo do fluxo Gratuito->pacote) nao tem essa
        // devolucao - so o EncerradoEm volta, como sempre.
        // Pacote 7: vale tambem pro Pago (pacote convertido), senao a marca
        // de conclusao deixaria o curso travado depois de reaberto.
        var desfazConclusaoAoReabrir = true;

        curso.Reabrir();
        if (desfazConclusaoAoReabrir)
        {
            curso.DesfazerConclusao();
        }

        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        if (desfazConclusaoAoReabrir)
        {
            await NotificarProfessoresDoCursoAsync(
                cursoId,
                "Curso reaberto para ajustes",
                $"O curso \"{curso.Titulo}\" foi reaberto e volta a aceitar ajustes. Conclua novamente quando terminar.");
        }
    }

    /// <summary>
    /// "Devolver" desfaz ConcluidoPeloProfessorEm sem passar por Encerrar -
    /// destrava a edicao e devolve o curso pra "Em andamento" direto de
    /// "Aguardando encerramento", sem o coordenador precisar encerrar e
    /// reabrir so pra isso. So Gratuito/Acompanhado tem esse ciclo; pacote
    /// nao tem conclusao de professor "em andamento" pra devolver.
    /// </summary>
    public async Task DevolverAoProfessorAsync(int cursoId, int coordenadorId, string? motivo)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.PublicadoParaVendaEm.HasValue)
        {
            throw new InvalidOperationException("Tire o curso da venda/do catalogo antes de devolver ao professor.");
        }

        if (curso.CoordenadorId != coordenadorId)
        {
            throw new InvalidOperationException("Apenas o coordenador responsavel por este curso pode devolve-lo ao professor.");
        }

        if (curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException("Este curso ja foi encerrado. Reabra o curso em vez de devolve-lo.");
        }

        if (!curso.ConcluidoPeloProfessorEm.HasValue)
        {
            throw new InvalidOperationException("Este curso ainda nao foi concluido pelo professor.");
        }

        var motivoTratado = string.IsNullOrWhiteSpace(motivo) ? null : motivo.Trim();
        if (motivoTratado is { Length: > 500 })
        {
            throw new ArgumentException("O motivo deve ter no maximo 500 caracteres.");
        }

        curso.DesfazerConclusao();
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        var mensagem = motivoTratado is null
            ? $"O curso \"{curso.Titulo}\" foi devolvido para ajustes."
            : $"O curso \"{curso.Titulo}\" foi devolvido para ajustes. Motivo: {motivoTratado}";

        await NotificarProfessoresDoCursoAsync(cursoId, "Curso devolvido para ajustes", mensagem);
    }

    private async Task NotificarProfessoresDoCursoAsync(int cursoId, string titulo, string mensagem)
    {
        var professorIds = await _context.ProfessoresCursos
            .Where(vinculo => vinculo.CursoId == cursoId)
            .Select(vinculo => vinculo.ProfessorId)
            .ToListAsync();

        foreach (var professorId in professorIds)
        {
            await _notificacaoService.NotificarAsync(
                professorId,
                titulo,
                mensagem,
                TipoNotificacao.CursoDevolvidoAoProfessor,
                $"/app/cursos/{cursoId}");
        }
    }

    /// <summary>
    /// Transforma um Gratuito-encerrado em pacote pago (ou edita preco/descricao
    /// de um pacote ja existente) - metadado do curso, nao conteudo, entao nao e
    /// bloqueado pelo "travado" (GarantirCursoAbertoParaEdicaoAsync). Nao toca
    /// EncerradoEm/ConcluidoPeloProfessorEm nem publica a venda.
    /// </summary>
    public async Task<Curso> DefinirPacoteAsync(int cursoId, AtualizarPacoteCursoDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        // Pacote 8 da auditoria de 26/11 (D1, D4, D8b): Acompanhado e Gratuito
        // ENCERRADOS viram Pago ou Gratuito; um Pago so edita preco/descricao.
        var destino = dto.ModeloDestino ?? ModeloCurso.PagoPacote;
        if (destino == ModeloCurso.Acompanhado)
        {
            throw new InvalidOperationException("Um curso so pode ser convertido em Pago ou Gratuito.");
        }

        if (curso.ModeloCurso == ModeloCurso.PagoPacote)
        {
            if (destino != ModeloCurso.PagoPacote)
            {
                throw new InvalidOperationException("Um pacote pago nao pode ser convertido em Gratuito.");
            }

            GarantirPrecoDoPacote(dto.Preco);
            curso.Preco = dto.Preco;
        }
        else
        {
            if (!curso.EncerradoEm.HasValue)
            {
                throw new InvalidOperationException(
                    "Somente um curso Acompanhado ou Gratuito encerrado pode ser convertido em Pago ou Gratuito.");
            }

            // Pacote 7: um Gratuito no catalogo viraria Pago "a venda" na hora.
            if (curso.PublicadoParaVendaEm.HasValue)
            {
                throw new InvalidOperationException("Tire o curso do catalogo antes de converte-lo em pacote pago.");
            }

            if (destino != curso.ModeloCurso)
            {
                if (destino == ModeloCurso.PagoPacote)
                {
                    GarantirPrecoDoPacote(dto.Preco);
                }

                await GarantirSemQuestaoDissertativaAsync(cursoId);
                curso.ConverterPara(destino, destino == ModeloCurso.PagoPacote ? dto.Preco : 0m);
            }
        }

        if (dto.Descricao is not null)
        {
            curso.Descricao = dto.Descricao.Trim();
        }

        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return curso;
    }

    private static void GarantirPrecoDoPacote(decimal preco)
    {
        if (preco <= 0)
        {
            throw new ArgumentException("O preco do pacote deve ser maior que zero.");
        }
    }

    /// <summary>
    /// Decisao D8b: dissertativa precisa de correcao, e curso convertido nao
    /// tem professor acompanhando. Ate a correcao pela IA existir (D8), so
    /// converte curso com avaliacoes publicadas 100% objetivas.
    /// </summary>
    private async Task GarantirSemQuestaoDissertativaAsync(int cursoId)
    {
        var temDissertativa = await _context.QuestoesPublicadas.AnyAsync(questao =>
            questao.TipoQuestao == TipoQuestao.Dissertativa &&
            _context.Avaliacoes.Any(avaliacao =>
                avaliacao.Id == questao.AvaliacaoId &&
                avaliacao.CursoId == cursoId &&
                avaliacao.StatusPublicacao == StatusPublicacao.Publicado));

        if (temDissertativa)
        {
            throw new InvalidOperationException(
                "Este curso tem questao dissertativa em avaliacao publicada. Enquanto a correcao automatica nao existir, so cursos com questoes objetivas podem ser convertidos.");
        }
    }

    public async Task PublicarParaVendaAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        // Pacote 7 da auditoria de 26/11 (regra de 25/11 + D2/D3/D11):
        // Gratuito e Pago so chegam ao aluno completos.
        if (curso.ModeloCurso == ModeloCurso.Acompanhado)
        {
            throw new InvalidOperationException("Curso acompanhado nao usa publicacao. Depois de encerrado, ele pode ser convertido em Pago ou Gratuito.");
        }

        if (curso.PublicadoParaVendaEm.HasValue)
        {
            return;
        }

        if (curso.ModeloCurso == ModeloCurso.Gratuito && !curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException("O professor precisa concluir e o coordenador precisa encerrar o curso antes de publicar.");
        }

        if (curso.ModeloCurso == ModeloCurso.PagoPacote)
        {
            if (curso.Preco <= 0)
            {
                throw new InvalidOperationException("Defina um preco maior que zero antes de publicar o pacote para venda.");
            }

            if (!curso.ConcluidoPeloProfessorEm.HasValue)
            {
                throw new InvalidOperationException("O professor precisa concluir o curso antes de publicar.");
            }
        }

        var temConteudoPublicado = await _context.ConteudosDidaticos.AnyAsync(conteudo =>
            conteudo.CursoId == cursoId &&
            conteudo.StatusPublicacao == StatusPublicacao.Publicado &&
            conteudo.ExcluidoEm == null);
        if (!temConteudoPublicado)
        {
            throw new InvalidOperationException("Publique pelo menos um conteudo antes de colocar o curso no catalogo.");
        }

        curso.PublicarParaVenda();
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    public async Task DespublicarDaVendaAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        curso.DespublicarDaVenda();
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
    }

    public async Task<Curso> DefinirImagemAsync(int cursoId, string imagemUrl)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        curso.ImagemUrl = imagemUrl;
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return curso;
    }

    private static void ValidarTitulo(string titulo)
    {
        if (string.IsNullOrWhiteSpace(titulo))
        {
            throw new ArgumentException("O título do curso é obrigatório.");
        }
    }

    private Task<string> GerarCodigoCursoAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarCurso,
            codigo => _context.Cursos.AnyAsync(curso => curso.CodigoRegistro == codigo),
            "o curso");

    private Task<string> GerarCodigoModuloAsync() =>
        CodigoRegistroGenerator.GerarCodigoUnicoAsync(
            CodigoRegistroGenerator.GerarModulo,
            codigo => _context.Modulos.AnyAsync(modulo => modulo.CodigoRegistro == codigo),
            "o modulo");
}
