using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlunosController : ControllerBase
    {
        private readonly IAlunoService _alunoService;

        public AlunosController(IAlunoService alunoService)
        {
            _alunoService = alunoService;
        }

        // GET: api/Alunos
        [HttpGet]
        [Authorize(Roles = "Admin,Coordenador")]
        public async Task<ActionResult<IEnumerable<Aluno>>> GetAlunos()
        {
            return Ok(await _alunoService.ListarAlunosAsync());
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

        private static AlunoResponseDto MapResponse(Aluno aluno)
        {
            return new AlunoResponseDto
            {
                Id = aluno.Id,
                Nome = aluno.Nome,
                Email = aluno.Email,
                Cpf = aluno.Cpf,
                Telefone = aluno.Telefone,
                Cep = aluno.Cep,
                Rua = aluno.Rua,
                Numero = aluno.Numero,
                Bairro = aluno.Bairro,
                Cidade = aluno.Cidade,
                Estado = aluno.Estado,
                TipoUsuario = aluno.TipoUsuario,
                DataCadastro = aluno.DataCadastro,
                Ativo = aluno.Ativo,
                Matricula = aluno.Matricula,
                TurmaAtual = string.Empty
            };
        }
    }
}
