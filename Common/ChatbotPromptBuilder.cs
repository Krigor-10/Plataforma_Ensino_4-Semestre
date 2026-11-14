using System.Text.Json;

namespace PlataformaEnsino.API.Common;

/* Monta o pedido pro Assistente CodeRyse (fluxo-chatbot Fase 1): bloco de
   sistema fixo (papel+regras -> formato -> base de conhecimento, nessa
   ordem, sem nada que mude a cada pedido) e a lista de ferramentas, sempre
   identicos entre pedidos pra bater o cache (cache_control so no ultimo
   bloco do sistema). O contexto da tela entra no texto do USUARIO, depois
   do ponto de cache - nunca no sistema. */
public static class ChatbotPromptBuilder
{
    private const string CaminhoBaseConhecimento = "docs/chatbot/BASE-conhecimento-suporte.md";

    private const string PapelERegras =
        "Você é o Assistente CodeRyse, o assistente de suporte da plataforma CodeRyse Academy. " +
        "Trate quem está conversando por \"você\", em português, de forma amigável e direta.\n\n" +
        "Seu escopo é só: (1) dúvidas de uso da plataforma e (2) a situação do próprio aluno que está " +
        "conversando (certificado, avaliação bloqueada, pagamento, progresso). Use as ferramentas disponíveis " +
        "para consultar os dados reais do aluno antes de responder sobre a situação dele - nunca invente ou " +
        "suponha um status.\n\n" +
        "Você NÃO explica o conteúdo das aulas (dúvida de matéria), NÃO responde questões de avaliação e NÃO " +
        "executa nenhuma ação na plataforma (não matricula, não emite certificado, não altera nada) - você só " +
        "explica e indica para onde ir. Se a pergunta for sobre conteúdo de aula ou sobre uma avaliação " +
        "específica, diga que isso não é algo que você pode ajudar e sugira falar com o professor ou abrir um " +
        "chamado com o suporte.";

    private const string FormatoDasRespostas =
        "Responda de forma direta e objetiva, sem rodeios. Pode usar as ferramentas quantas vezes precisar " +
        "(em paralelo quando fizer sentido) antes de responder.\n\n" +
        "No final da resposta, você pode incluir no máximo 2 ações, cada uma no formato exato " +
        "[[ir:rota|rótulo]] (por exemplo: [[ir:certificados|Ir para Certificados]]). Use só rotas que " +
        "realmente existem no aplicativo do aluno - se não tiver certeza da rota, não inclua a ação.\n\n" +
        "Se depois de consultar as ferramentas e a base de conhecimento você não encontrar uma base real para " +
        "responder, inclua o marcador [[sem_resposta]] em algum ponto da resposta (ele é removido antes de " +
        "mostrar a mensagem) e, no texto, sugira abrir um chamado com o suporte.";

    private static string? _baseConhecimentoCache;
    private static DateTime _baseConhecimentoUltimaEscritaCache;

    /// <summary>Carregada uma vez por processo; recarrega so se o arquivo mudar (mtime) - sem reiniciar a API.</summary>
    public static string ObterBaseConhecimento()
    {
        var caminhoCompleto = Path.Combine(AppContext.BaseDirectory, CaminhoBaseConhecimento);
        if (!File.Exists(caminhoCompleto))
        {
            // Tenta o diretorio de trabalho atual tambem (dotnet run x dotnet test
            // publicam/copiam pra pastas diferentes).
            caminhoCompleto = Path.Combine(Directory.GetCurrentDirectory(), CaminhoBaseConhecimento);
        }

        if (!File.Exists(caminhoCompleto))
        {
            throw new InvalidOperationException("Base de conhecimento do Assistente CodeRyse nao encontrada.");
        }

        var ultimaEscrita = File.GetLastWriteTimeUtc(caminhoCompleto);
        if (_baseConhecimentoCache is null || ultimaEscrita != _baseConhecimentoUltimaEscritaCache)
        {
            _baseConhecimentoCache = File.ReadAllText(caminhoCompleto);
            _baseConhecimentoUltimaEscritaCache = ultimaEscrita;
        }

        return _baseConhecimentoCache;
    }

    /// <summary>Os 3 blocos do "system", na ordem fixa - cache_control so no ultimo.</summary>
    public static object[] MontarBlocosDeSistema()
    {
        return new object[]
        {
            new { type = "text", text = PapelERegras },
            new { type = "text", text = FormatoDasRespostas },
            new
            {
                type = "text",
                text = ObterBaseConhecimento(),
                cache_control = new { type = "ephemeral" }
            }
        };
    }

    /// <summary>Contexto da tela (enviado pelo frontend) + a pergunta, como prefixo curto no texto do usuario - sempre DEPOIS do ponto de cache do sistema.</summary>
    public static string MontarTextoDoUsuario(string? tela, int? cursoId, string? cursoTitulo, string pergunta)
    {
        if (string.IsNullOrWhiteSpace(tela))
        {
            return pergunta;
        }

        var prefixo = cursoId.HasValue && !string.IsNullOrWhiteSpace(cursoTitulo)
            ? $"[Tela: {tela} | Curso: {cursoTitulo}]"
            : $"[Tela: {tela}]";

        return $"{prefixo}\n{pergunta}";
    }

    /// <summary>Ferramentas, em ordem fixa - estaveis entre pedidos pra nao invalidar o cache (ver prompt-caching.md da skill da Anthropic).</summary>
    public static object[] MontarFerramentas()
    {
        static object EsquemaSemParametros() => new { type = "object", properties = new { }, required = Array.Empty<string>(), additionalProperties = false };

        return new object[]
        {
            new
            {
                name = "meus_cursos",
                description = "Lista os cursos em que o aluno que esta conversando esta matriculado: id, titulo, modelo do curso, situacao da matricula, percentual de progresso e se ha pagamento pendente. Use quando o aluno perguntar sobre quais cursos tem, status geral ou pagamento pendente sem especificar qual curso.",
                input_schema = EsquemaSemParametros(),
                strict = true
            },
            new
            {
                name = "progresso_do_curso",
                description = "Devolve o progresso do aluno em um curso especifico: modulos (liberado ou bloqueado, com motivo implicito na ordem), conteudos concluidos e pendentes e percentual de cada modulo. Use quando o aluno perguntar sobre progresso, modulo bloqueado ou o que falta fazer em um curso.",
                input_schema = new
                {
                    type = "object",
                    properties = new { cursoId = new { type = "integer", description = "Id do curso, um dos ids devolvidos por meus_cursos." } },
                    required = new[] { "cursoId" },
                    additionalProperties = false
                },
                strict = true
            },
            new
            {
                name = "situacao_avaliacoes",
                description = "Devolve as avaliacoes (quizzes e provas) de um curso especifico: se cada uma esta liberada ou bloqueada (com o motivo), tentativas usadas e restantes, prazo e a ultima nota. Nunca inclui enunciado nem gabarito. Use quando o aluno perguntar por que uma avaliacao esta bloqueada, quantas tentativas tem ou qual foi a nota.",
                input_schema = new
                {
                    type = "object",
                    properties = new { cursoId = new { type = "integer", description = "Id do curso, um dos ids devolvidos por meus_cursos." } },
                    required = new[] { "cursoId" },
                    additionalProperties = false
                },
                strict = true
            },
            new
            {
                name = "situacao_certificado",
                description = "Diz se o aluno pode emitir o certificado de um curso especifico e, se nao puder, lista as pendencias que faltam resolver. Use quando o aluno perguntar sobre certificado.",
                input_schema = new
                {
                    type = "object",
                    properties = new { cursoId = new { type = "integer", description = "Id do curso, um dos ids devolvidos por meus_cursos." } },
                    required = new[] { "cursoId" },
                    additionalProperties = false
                },
                strict = true
            },
            new
            {
                name = "meus_pagamentos",
                description = "Lista os pagamentos do aluno: curso, valor, status (Pendente, Pago ou Cancelado), data da compra e data do pagamento. Use quando o aluno perguntar sobre cobranca, pagamento ou nota fiscal.",
                input_schema = EsquemaSemParametros(),
                strict = true
            },
            new
            {
                name = "buscar_no_catalogo",
                description = "Busca cursos pelo titulo no catalogo publico (ate 5 resultados), devolvendo titulo, modelo e preco. Use quando o aluno perguntar sobre um curso que ainda nao tem ou quiser saber o preco de outro curso.",
                input_schema = new
                {
                    type = "object",
                    properties = new { termo = new { type = "string", description = "Parte do titulo do curso buscado." } },
                    required = new[] { "termo" },
                    additionalProperties = false
                },
                strict = true
            }
        };
    }

    /// <summary>
    /// O corpo do pedido pra rodada "de verdade" (com ferramentas e cache) -
    /// extraido pra um metodo proprio pra ChatbotPromptBuilderTests poder
    /// verificar, sem bater na API, que "system"+"tools" saem identicos entre
    /// chamadas (cache) e que NAO ha fallbacks/temperature/top_p/top_k no corpo
    /// (decisao do FASE-1: Haiku 5.5 nao tem troca automatica de modelo).
    /// </summary>
    public static object MontarCorpoRequisicao(string modelo, string esforco, int maxTokens, bool stream, IReadOnlyList<object> mensagens)
    {
        return new
        {
            model = modelo,
            max_tokens = maxTokens,
            stream,
            output_config = new { effort = esforco },
            tools = MontarFerramentas(),
            tool_choice = new { type = "auto" },
            system = MontarBlocosDeSistema(),
            messages = mensagens
        };
    }

    public static string SerializarCorpoRequisicao(object corpo) => JsonSerializer.Serialize(corpo);
}
