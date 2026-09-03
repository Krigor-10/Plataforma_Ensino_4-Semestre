using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface IAcessoAcademicoService
{
    Task<bool> TemAcessoLiberadoAsync(Matricula matricula);
}
