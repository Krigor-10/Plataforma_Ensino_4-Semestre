namespace PlataformaEnsino.API.Interfaces;

public record ResultadoExtracaoMaterial(
    IReadOnlyList<string> TextoPorPagina,
    int QuantidadePaginas,
    bool TemTextoExtraivel,
    IReadOnlyList<string> Avisos);

public interface IExtratorTextoMaterialService
{
    /// <summary>
    /// Extrai o texto de um material (.pdf ou .docx). A extensao decide a estrategia
    /// usada (PdfPig para PDF, DocumentFormat.OpenXml para DOCX). DOCX nao tem o
    /// problema de "escaneado sem texto" do PDF - TemTextoExtraivel sempre vem true
    /// para DOCX, a heuristica so roda no caminho PDF.
    /// </summary>
    Task<ResultadoExtracaoMaterial> ExtrairTextoAsync(Stream conteudo, string extensao, CancellationToken cancellationToken);
}
