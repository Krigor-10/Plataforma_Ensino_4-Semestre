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

    public async Task GarantirCursoAbertoAsync(int cursoId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.ModeloCurso == ModeloCurso.Acompanhado && curso.EncerradoEm.HasValue)
        {
            throw new InvalidOperationException(
                "Este curso foi encerrado e nao aceita mais conteudo, avaliacoes ou matriculas novas.");
        }
    }

    public async Task ConcluirCursoComoProfessorAsync(int cursoId, int professorId)
    {
        var curso = await _cursoRepository.ObterPorIdAsync(cursoId)
            ?? throw new KeyNotFoundException("Curso não encontrado.");

        if (curso.ModeloCurso != ModeloCurso.Acompanhado)
        {
            throw new InvalidOperationException("Apenas cursos do modelo Acompanhado podem ser concluidos pelo professor.");
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

        if (curso.ModeloCurso != ModeloCurso.Acompanhado)
        {
            throw new InvalidOperationException("Apenas cursos do modelo Acompanhado podem ser encerrados.");
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

        // Curso Acompanhado: o aluno nunca pede o certificado - o encerramento
        // e o gatilho da emissao automatica pra quem ja cumpre os requisitos
        // (ver ICertificadoService.EmitirCertificadosDoCursoAsync). Na mesma
        // transacao do encerramento pra nao sobrar curso encerrado sem
        // certificados se a emissao falhar no meio do caminho.
        await _certificadoService.EmitirCertificadosDoCursoAsync(cursoId);

        await transaction.CommitAsync();
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

        curso.Reabrir();
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
