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
            var (itens, totalItens) = await _alunoService.ListarAlunosAsync(pagina, tamanhoPagina, incluirDadosInativacao: User.IsInRole("Admin"));

            if (pagina.HasValue)
            {
                Response.Headers["X-Total-Count"] = totalItens.ToString();
            }

            return Ok(itens);
        }

        // POST: api/Alunos
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AlunoResponseDto>> PostAluno([FromBody] CriarAlunoDto dto)
        {
            var aluno = await _alunoService.CriarAlunoAsync(dto);
            return Ok(MapResponse(aluno));
        }

        // PUT: api/Alunos/{id} — dados básicos/de contato (nome, e-mail,
        // telefone, RA). CPF, endereço, senha e Ativo não fazem parte do DTO
        // (docs/alunos-admin/PROMPT-agente-editar-e-inativar-aluno.md, item A2).
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AlunoResponseDto>> AtualizarAluno(int id, [FromBody] AtualizarAlunoAdminDto dto)
        {
            var resultado = await _alunoService.AtualizarDadosAdminAsync(id, dto);
            return Ok(resultado);
        }

        // POST: api/Alunos/{id}/inativar
        [HttpPost("{id:int}/inativar")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AlunoResponseDto>> InativarAluno(int id, [FromBody] InativarAlunoDto dto)
        {
            var adminId = User.ObterUsuarioId()
                ?? throw new UnauthorizedAccessException("Não foi possível identificar o administrador autenticado.");

            var resultado = await _alunoService.InativarAsync(id, adminId, dto.Motivo);
            return Ok(resultado);
        }

        // POST: api/Alunos/{id}/reativar
        [HttpPost("{id:int}/reativar")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AlunoResponseDto>> ReativarAluno(int id)
        {
            var resultado = await _alunoService.ReativarAsync(id);
            return Ok(resultado);
        }

        // POST: api/Alunos/cadastro-completo
        [HttpPost("cadastro-completo")]
        public async Task<IActionResult> CadastroCompleto([FromBody] CadastroAlunoDto dto)
        {
            var cursoEhGratuito = await _alunoService.CadastrarAlunoCompletoAsync(dto);

            var mensagem = cursoEhGratuito
                ? "Cadastro realizado com sucesso. Sua matrícula foi aprovada e seu acesso está liberado."
                : "Cadastro realizado com sucesso. Sua matrícula foi aprovada — confirme o pagamento pendente em \"Meus Cursos\" para liberar o acesso.";

            return Ok(new { mensagem });
        }

        private static AlunoResponseDto MapResponse(Aluno aluno) =>
            new AlunoResponseDto
            {
                Matricula = aluno.Matricula,
                TurmaAtual = string.Empty
            }.PreencherCamposBase(aluno);
    }
}
