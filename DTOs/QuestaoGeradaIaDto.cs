namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Mesma forma de CriarQuestaoAvaliacaoDto, so que com metadados efemeros da geracao
/// por IA (pagina/trecho de origem, aviso). Esses tres campos existem so para a tela
/// de revisao do professor - nunca sao persistidos (decisao de design: citacao de
/// pagina/trecho fica fora do banco, ver proposta aprovada). Como herda de
/// CriarQuestaoAvaliacaoDto, o mesmo objeto pode ser devolvido na revisao e reenviado
/// direto para POST /questoes/lote sem nenhuma conversao - o model binding ali
/// simplesmente ignora PaginaReferencia/TrechoReferencia/Aviso.
/// </summary>
public class QuestaoGeradaIaDto : CriarQuestaoAvaliacaoDto
{
    public int? PaginaReferencia { get; set; }

    public string? TrechoReferencia { get; set; }

    public string? Aviso { get; set; }
}
