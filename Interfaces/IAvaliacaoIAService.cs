using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public record ResultadoGeracaoIA(
    IReadOnlyList<QuestaoGeradaIaDto> Questoes,
    IReadOnlyList<string> Avisos,
    bool LimitacaoDetectada);

public interface IAvaliacaoIAService
{
    /// <summary>
    /// Gera questoes a partir do material-fonte (texto ja extraido, ou os bytes
    /// crus do documento quando nao ha texto extraivel - ver MaterialParaIaDto).
    /// O resultado NUNCA e persistido aqui - e so um rascunho para a tela de revisao
    /// do professor, que decide o que confirmar via POST .../questoes/lote.
    /// Lanca InvalidOperationException (422) se a IA nao estiver configurada ou
    /// estiver indisponivel.
    /// </summary>
    Task<ResultadoGeracaoIA> GerarQuestoesAsync(MaterialParaIaDto material, GerarQuestoesIaRequestDto configuracao, CancellationToken cancellationToken);
}
