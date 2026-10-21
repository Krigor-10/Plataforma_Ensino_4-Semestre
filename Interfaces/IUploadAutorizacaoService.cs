namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Gate de autorizacao por conteudo pra downloads de material pago servidos
/// via "/uploads/{subpasta}/{nomeArquivo}" (Program.cs). O middleware de
/// autenticacao ja garante que o usuario esta logado - este servico decide
/// se ESTE aluno especifico pode baixar ESTE arquivo especifico, evitando
/// que um aluno autenticado mas sem matricula/pagamento confirmado naquele
/// curso baixe material pago so por conhecer a URL.
/// </summary>
public interface IUploadAutorizacaoService
{
    Task<bool> AlunoPodeAcessarArquivoAsync(string subpasta, string nomeArquivo, int alunoId);
}
