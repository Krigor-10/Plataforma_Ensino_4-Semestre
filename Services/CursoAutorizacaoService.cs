using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class CursoAutorizacaoService : ICursoAutorizacaoService
{
    private readonly PlataformaContext _context;

    public CursoAutorizacaoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<bool> PodeGerenciarCursoAsync(ClaimsPrincipal usuario, int cursoId)
    {
        if (usuario.IsInRole("Admin"))
        {
            return true;
        }

        var usuarioId = usuario.ObterUsuarioId();
        if (!usuarioId.HasValue)
        {
            return false;
        }

        var curso = await _context.Cursos
            .AsNoTracking()
            .Where(c => c.Id == cursoId)
            .Select(c => new { c.CoordenadorId })
            .FirstOrDefaultAsync();

        // Curso inexistente: deixa o servico de CRUD correspondente reportar o 404 —
        // aqui so decide posse, nao existencia. Curso sem coordenador atribuido
        // ("aguardando coordenador") so pode ser gerenciado por Admin.
        return curso is not null && curso.CoordenadorId == usuarioId.Value;
    }

    public async Task<bool> PodeGerenciarModuloAsync(ClaimsPrincipal usuario, int moduloId)
    {
        if (usuario.IsInRole("Admin"))
        {
            return true;
        }

        var modulo = await _context.Modulos
            .AsNoTracking()
            .Where(m => m.Id == moduloId)
            .Select(m => new { m.CursoId })
            .FirstOrDefaultAsync();

        if (modulo is null)
        {
            return true;
        }

        return await PodeGerenciarCursoAsync(usuario, modulo.CursoId);
    }

    public async Task<bool> PodeGerenciarTurmaAsync(ClaimsPrincipal usuario, int turmaId)
    {
        if (usuario.IsInRole("Admin"))
        {
            return true;
        }

        var turma = await _context.Turmas
            .AsNoTracking()
            .Where(t => t.Id == turmaId)
            .Select(t => new { t.CursoId })
            .FirstOrDefaultAsync();

        if (turma is null)
        {
            return true;
        }

        return await PodeGerenciarCursoAsync(usuario, turma.CursoId);
    }
}
