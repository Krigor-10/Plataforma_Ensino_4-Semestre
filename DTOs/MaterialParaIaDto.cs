namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Material-fonte que sera enviado ao provedor de IA: ou texto ja extraido
/// (caminho normal), ou os bytes crus do documento para o modelo ler
/// diretamente via visao (fallback para PDF escaneado sem texto extraivel).
/// Nunca os dois ao mesmo tempo - use DeTexto ou DeDocumento.
/// </summary>
public sealed class MaterialParaIaDto
{
    public string? TextoFonte { get; private init; }
    public byte[]? DocumentoBytes { get; private init; }
    public string? MediaType { get; private init; }

    public bool EhDocumento => DocumentoBytes is not null;

    public static MaterialParaIaDto DeTexto(string texto) => new() { TextoFonte = texto };

    public static MaterialParaIaDto DeDocumento(byte[] bytes, string mediaType) =>
        new() { DocumentoBytes = bytes, MediaType = mediaType };
}
