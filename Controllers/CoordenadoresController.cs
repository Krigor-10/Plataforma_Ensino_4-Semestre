using Microsoft.AspNetCore.Mvc;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public class CoordenadoresController : ControllerBase
    {
        private readonly ICoordenadorService _coordenadorService;

        public CoordenadoresController(ICoordenadorService coordenadorService)
        {
            _coordenadorService = coordenadorService;
        }

        // GET: api/Coordenadores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CoordenadorResponseDto>>> GetCoordenadores()
        {
            var coordenadores = await _coordenadorService.ListarCoordenadoresAsync();
            return Ok(coordenadores.Select(MapResponse));
        }

        // POST: api/Coordenadores
        [HttpPost]
        public async Task<ActionResult<CoordenadorResponseDto>> PostCoordenador([FromBody] CriarCoordenadorDto dto)
        {
            var coordenador = await _coordenadorService.CriarCoordenadorAsync(dto);
            return Ok(MapResponse(coordenador));
        }

        private static CoordenadorResponseDto MapResponse(Coordenador coordenador) =>
            new CoordenadorResponseDto
            {
                CodigoRegistro = coordenador.CodigoRegistro
            }.PreencherCamposBase(coordenador);
    }
}
