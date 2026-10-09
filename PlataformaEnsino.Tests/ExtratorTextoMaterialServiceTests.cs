using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class ExtratorTextoMaterialServiceTests
{
    private readonly ExtratorTextoMaterialService _service = new();

    [Fact]
    public async Task ExtrairTextoAsync_PdfComTextoNativo_RetornaTextoExtraivel()
    {
        using var pdf = CriarPdfComTexto("Conteudo de prova sobre fotossintese e respiracao celular em plantas e animais.");

        var resultado = await _service.ExtrairTextoAsync(pdf, ".pdf", CancellationToken.None);

        Assert.True(resultado.TemTextoExtraivel);
        Assert.Equal(1, resultado.QuantidadePaginas);
        Assert.Contains("fotossintese", resultado.TextoPorPagina[0], StringComparison.OrdinalIgnoreCase);
        Assert.Empty(resultado.Avisos);
    }

    [Fact]
    public async Task ExtrairTextoAsync_PdfSemTextoSuficiente_SinalizaNaoExtraivel()
    {
        using var pdf = CriarPdfComTexto(string.Empty);

        var resultado = await _service.ExtrairTextoAsync(pdf, ".pdf", CancellationToken.None);

        Assert.False(resultado.TemTextoExtraivel);
        Assert.NotEmpty(resultado.Avisos);
    }

    [Fact]
    public async Task ExtrairTextoAsync_Docx_RetornaTextoDoCorpo()
    {
        using var docx = CriarDocxComTexto("Material de apoio sobre estruturas de dados e algoritmos.");

        var resultado = await _service.ExtrairTextoAsync(docx, ".docx", CancellationToken.None);

        Assert.True(resultado.TemTextoExtraivel);
        Assert.Equal(1, resultado.QuantidadePaginas);
        Assert.Contains("estruturas de dados", resultado.TextoPorPagina[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExtrairTextoAsync_PdfComJavaScriptEmbutido_Rejeita()
    {
        using var pdf = CriarPdfComTexto("Conteudo normal da prova, mas com /JavaScript escondido em algum lugar do arquivo.");

        var resultado = await _service.ExtrairTextoAsync(pdf, ".pdf", CancellationToken.None);

        Assert.False(resultado.TemTextoExtraivel);
        Assert.Contains(resultado.Avisos, aviso => aviso.Contains("JavaScript"));
    }

    [Fact]
    public async Task ExtrairTextoAsync_ZipRenomeadoParaDocx_Rejeita()
    {
        // Zip valido, mas sem a estrutura de um documento Word (sem word/document.xml)
        // - simula um .xlsx/.zip qualquer renomeado para .docx.
        using var zipFalso = new MemoryStream();
        using (var arquivo = new System.IO.Compression.ZipArchive(zipFalso, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            var entrada = arquivo.CreateEntry("conteudo.txt");
            using var escritor = new StreamWriter(entrada.Open());
            escritor.Write("isso nao e um documento Word");
        }
        zipFalso.Position = 0;

        var resultado = await _service.ExtrairTextoAsync(zipFalso, ".docx", CancellationToken.None);

        Assert.False(resultado.TemTextoExtraivel);
        Assert.Contains(resultado.Avisos, aviso => aviso.Contains("nao e um DOCX valido"));
    }

    [Fact]
    public async Task ExtrairTextoAsync_ExtensaoNaoSuportada_LancaArgumentException()
    {
        using var stream = new MemoryStream();

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.ExtrairTextoAsync(stream, ".txt", CancellationToken.None));
    }

    private static MemoryStream CriarPdfComTexto(string texto)
    {
        // PDF minimo valido de 1 pagina, escrito a mao byte a byte (PdfPig e so
        // leitor, nao tem API de escrita). A tabela xref precisa dos offsets REAIS
        // de cada objeto - por isso o arquivo e montado incrementalmente, anotando
        // a posicao exata antes de escrever cada "N 0 obj".
        var conteudoPagina = string.IsNullOrEmpty(texto)
            ? string.Empty
            : $"BT /F1 12 Tf 72 712 Td ({EscaparTextoPdf(texto)}) Tj ET";
        var bytesConteudo = System.Text.Encoding.ASCII.GetBytes(conteudoPagina);

        using var buffer = new MemoryStream();
        void Escrever(string texto)
        {
            var bytes = System.Text.Encoding.ASCII.GetBytes(texto + "\n");
            buffer.Write(bytes, 0, bytes.Length);
        }

        var offsets = new long[6];
        Escrever("%PDF-1.4");

        offsets[1] = buffer.Position;
        Escrever("1 0 obj");
        Escrever("<< /Type /Catalog /Pages 2 0 R >>");
        Escrever("endobj");

        offsets[2] = buffer.Position;
        Escrever("2 0 obj");
        Escrever("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        Escrever("endobj");

        offsets[3] = buffer.Position;
        Escrever("3 0 obj");
        Escrever("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
        Escrever("endobj");

        offsets[4] = buffer.Position;
        Escrever("4 0 obj");
        Escrever("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        Escrever("endobj");

        offsets[5] = buffer.Position;
        Escrever("5 0 obj");
        Escrever($"<< /Length {bytesConteudo.Length} >>");
        Escrever("stream");
        Escrever(conteudoPagina);
        Escrever("endstream");
        Escrever("endobj");

        var offsetXref = buffer.Position;
        Escrever("xref");
        Escrever("0 6");
        Escrever("0000000000 65535 f ");
        for (var i = 1; i <= 5; i++)
        {
            Escrever($"{offsets[i]:D10} 00000 n ");
        }
        Escrever("trailer");
        Escrever("<< /Size 6 /Root 1 0 R >>");
        Escrever("startxref");
        Escrever(offsetXref.ToString());
        Escrever("%%EOF");

        buffer.Position = 0;
        return new MemoryStream(buffer.ToArray());
    }

    private static string EscaparTextoPdf(string texto) =>
        texto.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");

    private static MemoryStream CriarDocxComTexto(string texto)
    {
        var stream = new MemoryStream();

        using (var documento = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document, true))
        {
            var parteDocumento = documento.AddMainDocumentPart();
            parteDocumento.Document = new Document();
            var corpo = parteDocumento.Document.AppendChild(new Body());
            corpo.AppendChild(new Paragraph(new Run(new Text(texto))));
        }

        stream.Position = 0;
        return stream;
    }
}
