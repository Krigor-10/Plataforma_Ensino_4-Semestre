using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
[Authorize(Roles = "Aluno")]
public class PagamentosController : ControllerBase
{
    private readonly IPagamentoService _pagamentoService;

    public PagamentosController(IPagamentoService pagamentoService)
    {
        _pagamentoService = pagamentoService;
    }

    [HttpGet("aluno")]
    public async Task<IActionResult> ListarMeusPagamentos()
    {
        var alunoId = ObterUsuarioIdAutenticado();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var pagamentos = await _pagamentoService.ListarPagamentosDoAlunoAsync(alunoId.Value);
        return Ok(pagamentos);
    }

    [HttpPost("{matriculaId:int}/confirmar")]
    public async Task<IActionResult> ConfirmarPagamento(int matriculaId)
    {
        var alunoId = ObterUsuarioIdAutenticado();
        if (!alunoId.HasValue)
        {
            return Unauthorized(new { mensagem = "Nao foi possivel identificar o aluno autenticado." });
        }

        var pagamento = await _pagamentoService.ConfirmarPagamentoAsync(matriculaId, alunoId.Value);
        return Ok(pagamento);
    }

    private int? ObterUsuarioIdAutenticado() => User.ObterUsuarioId();
}
