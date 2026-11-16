using System.Net;

namespace PlataformaEnsino.API.Common;

/// <summary>
/// Erro de negocio que precisa de um codigo estavel alem da mensagem, pro
/// frontend decidir a UI certa sem depender do texto (docs/bugs/PROMPT-
/// agente-envio-avaliacao-alterada-durante-resposta.md). Usado so no envio
/// de respostas do aluno quando a avaliacao foi removida/retirada do ar/
/// alterada entre o aluno abrir e enviar.
/// </summary>
public class ErroEnvioAvaliacaoException : Exception
{
    public HttpStatusCode StatusCode { get; }
    public string Codigo { get; }

    public ErroEnvioAvaliacaoException(HttpStatusCode statusCode, string codigo, string message) : base(message)
    {
        StatusCode = statusCode;
        Codigo = codigo;
    }
}
