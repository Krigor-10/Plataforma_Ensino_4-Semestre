using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers
{
    [Route("api/v1/[controller]")]
    [ApiController]
    public class AlunosController : ControllerBase
    {
        private readonly IAlunoService _alunoService;

        public AlunosController(IAlunoService alunoService)
        {
            _alunoService = alunoService;
        }

        // GET: api/Alunos
        // Sem "pagina": retorna a lista completa (comportamento atual, sem quebrar clientes existentes).
        // Com "pagina": retorna so aquela pagina e expoe o total em X-Total-Count.
        [HttpGet]
        [Authorize(Roles = "Admin,Coordenador")]
        public async Task<ActionResult<IEnumerable<AlunoResponseDto>>> GetAlunos([FromQuery] int? pagina, [FromQuery] int? tamanhoPagina)
        {
            var (itens, totalItens) = await _alunoService.ListarAlunosAsync(pagina, tamanhoPagina);

            if (pagina.HasValue)
            {
                Response.Headers["X-Total-Count"] = totalItens.ToString();
            }

            return Ok(itens);
        }

        // POST: api/Alunos
        [HttpPost]
        [Authorize(Roles = "Admin,Coordenador")]
        public async Task<ActionResult<AlunoResponseDto>> PostAluno([FromBody] CriarAlunoDto dto)
        {
            var aluno = await _alunoService.CriarAlunoAsync(dto);
            return Ok(MapResponse(aluno));
        }

        // POST: api/Alunos/cadastro-completo
        [HttpPost("cadastro-completo")]
        public async Task<IActionResult> CadastroCompleto([FromBody] CadastroAlunoDto dto)
        {
            await _alunoService.CadastrarAlunoCompletoAsync(dto);

            return Ok(new
            {
                mensagem = "Cadastro realizado com sucesso. Solicitação pendente de aprovação."
            });
        }

        private static AlunoResponseDto MapResponse(Aluno aluno) =>
            new AlunoResponseDto
            {
                Matricula = aluno.Matricula,
                TurmaAtual = string.Empty
            }.PreencherCamposBase(aluno);
    }
}
