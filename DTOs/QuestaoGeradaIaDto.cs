namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Mesma forma de CriarQuestaoAvaliacaoDto, so que com metadados efemeros da geracao
/// por IA (pagina/trecho de origem, aviso, origem do conteudo, incerteza de gabarito).
/// Esses campos existem so para a tela de revisao do professor - nunca sao persistidos
/// (decisao de design: citacao de pagina/trecho fica fora do banco, ver proposta
/// aprovada). Como herda de CriarQuestaoAvaliacaoDto, o mesmo objeto pode ser devolvido
/// na revisao e reenviado direto para POST /questoes/lote sem nenhuma conversao - o
/// model binding ali simplesmente ignora os campos abaixo.
/// </summary>
public class QuestaoGeradaIaDto : CriarQuestaoAvaliacaoDto
{
    public int? PaginaReferencia { get; set; }

    public string? TrechoReferencia { get; set; }

    public string? Aviso { get; set; }

    /// <summary>
    /// "extraida" quando a IA copiou uma questao ja pronta do material (modo
    /// extracao fiel) ou "gerada" quando ela compos uma questao nova a partir de
    /// conteudo teorico sem questao pronta. Sem valor fixo/enum no banco porque
    /// nunca e persistido - so informa o professor na revisao.
    /// </summary>
    public string? Origem { get; set; }

    /// <summary>
    /// True quando o material nao permitiu identificar o gabarito com seguranca.
    /// ValidadorQuestaoIaService recalcula este campo de forma defensiva (nao confia
    /// so no que a IA mandou) com base na contagem real de alternativas marcadas
    /// como corretas - ver AvaliacaoService.ValidarDadosQuestao(exigirGabarito).
    /// </summary>
    public bool GabaritoIncerto { get; set; }
}
