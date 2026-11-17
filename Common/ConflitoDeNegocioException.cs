namespace PlataformaEnsino.API.Common;

/// <summary>
/// O recurso existe e pertence a quem pediu, mas o estado ATUAL dele impede
/// a operacao (ex.: desistir de uma compra sem pagamento pendente) - mapeado
/// pelo ApiExceptionMiddleware para 409, distinto de KeyNotFoundException
/// (404, recurso nao existe/nao pertence a quem pediu) e de
/// InvalidOperationException (422, violacao de regra de negocio em geral).
/// </summary>
public class ConflitoDeNegocioException : Exception
{
    public ConflitoDeNegocioException(string message) : base(message)
    {
    }
}
