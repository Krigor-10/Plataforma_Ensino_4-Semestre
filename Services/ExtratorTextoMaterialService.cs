using System.IO.Compression;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using PlataformaEnsino.API.Interfaces;
using UglyToad.PdfPig;

namespace PlataformaEnsino.API.Services;

public class ExtratorTextoMaterialService : IExtratorTextoMaterialService
{
    // Abaixo desta media de caracteres por pagina, o PDF e tratado como "sem texto
    // extraivel" (provavelmente escaneado/imagem) - nao tentamos OCR, so avisamos.
    private const int MediaCaracteresPorPaginaMinima = 60;

    // Limite grosseiro de paginas - nao e sobre custo de IA (isso e tratado a parte
    // no servico de geracao), e sobre nao deixar um PDF gigante travar a extracao
    // em si dentro do mesmo request HTTP.
    private const int QuantidadeMaximaPaginas = 60;

    // Assinaturas de conteudo ativo embutido em PDF (JavaScript, acoes automaticas).
    // Varredura de bytes crus, no mesmo espirito do magic-bytes check ja usado em
    // ArmazenamentoArquivoServiceBase - nao executamos nada do PDF, so procuramos
    // esses tokens antes de processar.
    private static readonly string[] AssinaturasConteudoAtivoPdf = { "/JavaScript", "/JS", "/OpenAction", "/AA" };

    public Task<ResultadoExtracaoMaterial> ExtrairTextoAsync(Stream conteudo, string extensao, CancellationToken cancellationToken)
    {
        var extensaoNormalizada = (extensao ?? string.Empty).Trim().ToLowerInvariant();

        return extensaoNormalizada switch
        {
            ".pdf" => Task.FromResult(ExtrairDePdf(conteudo)),
            ".docx" => Task.FromResult(ExtrairDeDocx(conteudo)),
            _ => throw new ArgumentException($"Extensao '{extensao}' nao suportada para extracao de texto.")
        };
    }

    private static ResultadoExtracaoMaterial ExtrairDePdf(Stream conteudo)
    {
        using var buffer = new MemoryStream();
        conteudo.CopyTo(buffer);
        var bytes = buffer.ToArray();

        if (ContemConteudoAtivo(bytes))
        {
            return Rejeitar("Este PDF contem JavaScript ou acoes automaticas embutidas e nao pode ser processado por seguranca.");
        }

        List<string> textoPorPagina;
        int quantidadePaginas;

        try
        {
            using var stream = new MemoryStream(bytes);
            using var documento = PdfDocument.Open(stream);

            quantidadePaginas = documento.NumberOfPages;
            if (quantidadePaginas > QuantidadeMaximaPaginas)
            {
                return Rejeitar($"Este PDF tem {quantidadePaginas} paginas, acima do limite de {QuantidadeMaximaPaginas} paginas permitido.");
            }

            textoPorPagina = documento.GetPages()
                .Select(pagina => pagina.Text ?? string.Empty)
                .ToList();
        }
        catch (Exception ex)
        {
            var mensagemEncriptado = ex.GetType().Name.Contains("Encrypt", StringComparison.OrdinalIgnoreCase) ||
                ex.Message.Contains("encrypt", StringComparison.OrdinalIgnoreCase);

            return Rejeitar(mensagemEncriptado
                ? "Este PDF esta protegido por senha e nao pode ser processado."
                : $"Nao foi possivel abrir o PDF: {ex.Message}");
        }

        if (textoPorPagina.Count == 0)
        {
            return Rejeitar("O PDF nao tem nenhuma pagina.");
        }

        var totalCaracteres = textoPorPagina.Sum(pagina => pagina.Trim().Length);
        var mediaPorPagina = (double)totalCaracteres / textoPorPagina.Count;
        var temTextoExtraivel = mediaPorPagina >= MediaCaracteresPorPaginaMinima;

        var avisos = temTextoExtraivel
            ? Array.Empty<string>()
            : new[] { "Este PDF parece ser uma versao escaneada, sem texto selecionavel suficiente para gerar questoes." };

        return new ResultadoExtracaoMaterial(textoPorPagina, quantidadePaginas, temTextoExtraivel, avisos);
    }

    private static bool ContemConteudoAtivo(byte[] bytes)
    {
        // Latin1 preserva 1 byte = 1 char, suficiente para procurar tokens ASCII
        // dentro do PDF sem se preocupar com encoding de verdade do arquivo.
        var textoCru = Encoding.Latin1.GetString(bytes);
        return AssinaturasConteudoAtivoPdf.Any(assinatura => textoCru.Contains(assinatura, StringComparison.Ordinal));
    }

    private static ResultadoExtracaoMaterial Rejeitar(string motivo) =>
        new(TextoPorPagina: Array.Empty<string>(), QuantidadePaginas: 0, TemTextoExtraivel: false, Avisos: new[] { motivo });

    private static ResultadoExtracaoMaterial ExtrairDeDocx(Stream conteudo)
    {
        using var buffer = new MemoryStream();
        conteudo.CopyTo(buffer);
        var bytes = buffer.ToArray();

        if (!ContemDocumentoWordValido(bytes))
        {
            return Rejeitar("Este arquivo nao e um DOCX valido (nao contem a estrutura esperada de um documento Word).");
        }

        string texto;

        try
        {
            using var stream = new MemoryStream(bytes);
            using var documento = WordprocessingDocument.Open(stream, isEditable: false);
            texto = documento.MainDocumentPart?.Document?.Body?.InnerText ?? string.Empty;
        }
        catch (Exception ex)
        {
            return Rejeitar($"Nao foi possivel abrir o DOCX: {ex.Message}");
        }

        // DOCX nao tem um conceito estrutural fixo de "pagina" (paginacao depende de
        // layout/renderizacao, nao do arquivo) - tratamos o documento inteiro como uma
        // unica "pagina" em vez de inventar uma paginacao falsa.
        var avisos = string.IsNullOrWhiteSpace(texto)
            ? new[] { "O DOCX nao tem texto para extrair." }
            : Array.Empty<string>();

        return new ResultadoExtracaoMaterial(
            TextoPorPagina: new[] { texto },
            QuantidadePaginas: 1,
            TemTextoExtraivel: !string.IsNullOrWhiteSpace(texto),
            Avisos: avisos);
    }

    private static bool ContemDocumentoWordValido(byte[] bytes)
    {
        // A assinatura binaria de .docx e a mesma de qualquer ZIP (PK\x03\x04) - nao
        // basta checar os primeiros bytes como se faz com PDF. Confirma de verdade
        // abrindo o zip e procurando a parte que só um documento Word tem, evitando
        // que um .xlsx/.zip renomeado passe pela validacao.
        try
        {
            using var stream = new MemoryStream(bytes);
            using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
            return zip.GetEntry("word/document.xml") is not null;
        }
        catch (InvalidDataException)
        {
            return false;
        }
    }
}
