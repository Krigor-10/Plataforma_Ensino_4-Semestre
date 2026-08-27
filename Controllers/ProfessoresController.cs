using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Coordenador")]
    public class ProfessoresController : ControllerBase
    {
        private readonly IProfessorService _professorService;

        public ProfessoresController(IProfessorService professorService)
        {
            _professorService = professorService;
        }

        // GET: api/Professores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProfessorResponseDto>>> GetProfessores()
        {
            var professores = await _professorService.ListarProfessoresAsync();
            return Ok(professores.Select(MapResponse));
        }

        // POST: api/Professores
        [HttpPost]
        public async Task<ActionResult<ProfessorResponseDto>> PostProfessor([FromBody] CriarProfessorDto dto)
        {
            var professor = await _professorService.CriarProfessorAsync(dto);
            return Ok(MapResponse(professor));
        }

        private static ProfessorResponseDto MapResponse(Professor professor)
        {
            return new ProfessorResponseDto
            {
                Id = professor.Id,
                CodigoRegistro = professor.CodigoRegistro,
                Nome = professor.Nome,
                Email = professor.Email,
                Cpf = professor.Cpf,
                Telefone = professor.Telefone,
                Cep = professor.Cep,
                Rua = professor.Rua,
                Numero = professor.Numero,
                Bairro = professor.Bairro,
                Cidade = professor.Cidade,
                Estado = professor.Estado,
                TipoUsuario = professor.TipoUsuario,
                DataCadastro = professor.DataCadastro,
                Ativo = professor.Ativo,
                Especialidade = professor.Especialidade
            };
        }
    }
}
