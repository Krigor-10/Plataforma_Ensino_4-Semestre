using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

public interface ICertificadoService
{
    Task<Matricula> EmitirCertificadoAsync(int alunoId, int matriculaId);
    Task<IEnumerable<Matricula>> ListarCertificadosDoAlunoAsync(int alunoId);
    Task<Matricula> ObterCertificadoPorCodigoAsync(string codigo);
}
