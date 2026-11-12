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
    /// reabrir). Nao confundir com <see cref="GarantirCursoAbertoParaMatriculaAsync"/>,
    /// que tem uma regra diferente pra matricula nova.
    /// </summary>
    public async Task GarantirCursoAbertoParaEdicaoAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso foi encerrado e nao aceita mais alteracoes de conteudo, avaliacoes ou modulos.");
        }
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

        var modeloComCicloDeVida = curso.ModeloCurso == ModeloCurso.Acompanhado || curso.ModeloCurso == ModeloCurso.Gratuito;
        if (modeloComCicloDeVida && curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso foi encerrado e nao aceita mais matriculas novas.");
        }
    }

    public async Task ConcluirCursoComoProfessorAsync(int cursoId, int professorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.ModeloCurso != ModeloCurso.Acompanhado && curso.ModeloCurso != ModeloCurso.Gratuito)
        {
            throw new InvalidOperationException("Apenas cursos do modelo Acompanhado ou Gratuito podem ser concluidos pelo professor.");
        }

        if (!await ProfessorPertenceAoCursoAsync(professorId, cursoId))
        {
            throw new InvalidOperationException("O professor informado nao esta vinculado a este curso.");
        }

        if (curso.ConcluidoPeloProfessorEm.HasValue)
        {
            throw new InvalidOperationException("Este curso ja foi marcado como concluido pelo professor.");
        }

        curso.ConcluirPeloProfessor(professorId);
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

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

        // Acompanhado/Gratuito: ciclo de vida normal. PagoPacote so pode
        // reencerrar se veio do fluxo Gratuito->pacote (ConcluidoPeloProfessorEm
        // preenchido) — um pacote criado direto nunca passa por aqui.
        var modeloAceito = curso.ModeloCurso == ModeloCurso.Acompanhado
            || curso.ModeloCurso == ModeloCurso.Gratuito
            || (curso.ModeloCurso == ModeloCurso.PagoPacote && curso.ConcluidoPeloProfessorEm.HasValue);

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
        if (curso.ModeloCurso == ModeloCurso.PagoPacote && curso.PublicadoParaVendaEm.HasValue)
        {
            throw new InvalidOperationException("Tire o curso da venda antes de reabrir.");
        }

        curso.Reabrir();
        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();
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

        var podeDefinirPacote = curso.ModeloCurso == ModeloCurso.PagoPacote
            || (curso.ModeloCurso == ModeloCurso.Gratuito && curso.EncerradoEm.HasValue);

        if (!podeDefinirPacote)
        {
            throw new InvalidOperationException(
                "Somente um curso Gratuito encerrado ou ja do modelo Pago pode ter preco/descricao de pacote definidos.");
        }

        if (dto.Preco <= 0)
        {
            throw new ArgumentException("O preco do pacote deve ser maior que zero.");
        }

        curso.ModeloCurso = ModeloCurso.PagoPacote;
        curso.Preco = dto.Preco;
        if (dto.Descricao is not null)
        {
            curso.Descricao = dto.Descricao.Trim();
        }

        _cursoRepository.Atualizar(curso);
        await _cursoRepository.SalvarAlteracoesAsync();

        return curso;
    }

    public async Task PublicarParaVendaAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.ModeloCurso != ModeloCurso.PagoPacote)
        {
            throw new InvalidOperationException("Somente um pacote pago pode ser publicado para venda.");
        }

        if (curso.Preco <= 0)
        {
            throw new InvalidOperationException("Defina um preco maior que zero antes de publicar o pacote para venda.");
        }

        // So exige "travado" (EncerradoEm) pra um pacote que veio do fluxo
        // Gratuito->pacote (ConcluidoPeloProfessorEm preenchido). Um pacote
        // criado direto pelo Admin nunca passou por conclusao/encerramento e
        // publica sem essa exigencia.
        if (curso.ConcluidoPeloProfessorEm.HasValue && !curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException("Encerre o curso antes de publica-lo para venda.");
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
