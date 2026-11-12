using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Services;

/// <summary>
/// Fonte unica de verdade pra "esse aluno pode consumir o conteudo desta
/// matricula agora": exige matricula Aprovada e, se o curso era pago no
/// momento da matricula, exige tambem um Pagamento com Status == Pago
/// vinculado a ela. Le <see cref="Matricula.ValorNaMatricula"/> — o preco
/// CONGELADO na matricula, nunca o Curso.Preco atual — pra um curso que
/// vira pago depois (ex.: fluxo Gratuito -&gt; pacote pago) nao tirar o
/// acesso de quem entrou de graca. Nunca persistido — sempre computado na
/// hora, pra nunca poder ficar dessincronizado de Matricula/Pagamento.
/// </summary>
public class AcessoAcademicoService : IAcessoAcademicoService
{
    private readonly PlataformaContext _context;

    public AcessoAcademicoService(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<bool> TemAcessoLiberadoAsync(Matricula matricula)
    {
        if (matricula.Status != StatusMatricula.Aprovada || matricula.ValorNaMatricula <= 0)
        {
            return MatriculaTemAcessoLiberado(matricula, pagamentoConfirmado: false);
        }

        var pagamentoConfirmado = await _context.Pagamentos
            .AnyAsync(pagamento => pagamento.MatriculaId == matricula.Id && pagamento.Status == StatusPagamento.Pago);

        return MatriculaTemAcessoLiberado(matricula, pagamentoConfirmado);
    }

    /// <summary>
    /// Nucleo puro da regra de acesso (sem EF) — reaproveitado tambem pelo
    /// filtro em memoria de AvaliacaoService.ListarAvaliacoesPorAlunoAsync,
    /// que ja pre-carrega os pagamentos confirmados num HashSet. Os outros 3
    /// pontos que leem a mesma regra (ProgressoAlunoService, ConteudoDidaticoRepository,
    /// ModuloRepository) continuam com o predicado duplicado em IQueryable —
    /// EF Core nao traduz uma chamada de metodo C# dentro de Where/Any pra SQL.
    /// </summary>
    public static bool MatriculaTemAcessoLiberado(Matricula matricula, bool pagamentoConfirmado)
    {
        if (matricula.Status != StatusMatricula.Aprovada)
        {
            return false;
        }

        return matricula.ValorNaMatricula <= 0 || pagamentoConfirmado;
    }
}
