using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface ICoordenadorService
{
    Task<IEnumerable<Coordenador>> ListarCoordenadoresAsync();
    Task<Coordenador> CriarCoordenadorAsync(CriarCoordenadorDto dto);
    Task<Coordenador> AtualizarCoordenadorAsync(int id, AtualizarCoordenadorDto dto);
    Task ExcluirCoordenadorAsync(int id);
}
