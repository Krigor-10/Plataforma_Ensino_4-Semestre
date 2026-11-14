using System.Text.RegularExpressions;
using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Common;

/* Extrai as acoes "[[ir:rota|rotulo]]" e o marcador "[[sem_resposta]]" do
   texto cru devolvido pelo modelo, valida a rota contra a lista permitida
   do app do aluno e devolve o texto ja limpo dos marcadores (nunca mostrado
   ao aluno como veio). Rotas aqui sao as mesmas chaves de APP_SECTIONS
   (frontend/src/data/appConfig.js) navegaveis pelo Aluno - "chamados" entra
   quando a tela existir (fase 2). */
public static class ChatbotAcoesParser
{
    public static readonly IReadOnlySet<string> RotasPermitidas = new HashSet<string>
    {
        "dashboard",
        "conteudos",
        "avaliacoes",
        "matriculas",
        "meus-cursos",
        "cursos-matriculados",
        "certificados"
    };

    private const int MaximoDeAcoes = 2;

    private static readonly Regex RegexAcao = new(@"\[\[ir:([^\|\]]+)\|([^\]]+)\]\]", RegexOptions.Compiled);
    private static readonly Regex RegexSemResposta = new(@"\[\[sem_resposta\]\]", RegexOptions.Compiled);

    public static (string TextoLimpo, List<AcaoChatbotDto> Acoes, bool SemResposta) Processar(string textoBruto)
    {
        var semResposta = RegexSemResposta.IsMatch(textoBruto);

        var acoes = RegexAcao.Matches(textoBruto)
            .Select(match => new AcaoChatbotDto
            {
                Rota = match.Groups[1].Value.Trim(),
                Rotulo = match.Groups[2].Value.Trim()
            })
            .Where(acao => RotasPermitidas.Contains(acao.Rota))
            .Take(MaximoDeAcoes)
            .ToList();

        var textoLimpo = RegexSemResposta.Replace(RegexAcao.Replace(textoBruto, string.Empty), string.Empty).Trim();

        return (textoLimpo, acoes, semResposta);
    }
}
