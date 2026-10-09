using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public record ResultadoGeracaoIA(
    IReadOnlyList<QuestaoGeradaIaDto> Questoes,
    IReadOnlyList<string> Avisos,
    bool LimitacaoDetectada);

public interface IAvaliacaoIAService
{
    /// <summary>
    /// Gera questoes a partir do texto ja extraido do material (nunca do arquivo
    /// binario - a extracao e responsabilidade de IExtratorTextoMaterialService).
    /// O resultado NUNCA e persistido aqui - e so um rascunho para a tela de revisao
    /// do professor, que decide o que confirmar via POST .../questoes/lote.
    /// Lanca InvalidOperationException (422) se a IA nao estiver configurada ou
    /// estiver indisponivel.
    /// </summary>
    Task<ResultadoGeracaoIA> GerarQuestoesAsync(string textoFonte, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken);
}
