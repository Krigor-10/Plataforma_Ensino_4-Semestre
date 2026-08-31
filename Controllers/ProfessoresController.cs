using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
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

        // PUT: api/Professores/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ProfessorResponseDto>> PutProfessor(int id, [FromBody] AtualizarProfessorDto dto)
        {
            var professor = await _professorService.AtualizarProfessorAsync(id, dto);
            return Ok(MapResponse(professor));
        }

        // DELETE: api/Professores/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteProfessor(int id)
        {
            await _professorService.ExcluirProfessorAsync(id);
            return NoContent();
        }

        private static ProfessorResponseDto MapResponse(Professor professor) =>
            new ProfessorResponseDto
            {
                CodigoRegistro = professor.CodigoRegistro,
                Especialidade = professor.Especialidade
            }.PreencherCamposBase(professor);
    }
}
