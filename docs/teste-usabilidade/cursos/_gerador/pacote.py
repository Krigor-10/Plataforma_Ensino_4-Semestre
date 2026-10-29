"""Monta docs/teste-usabilidade/cursos: cursos.json + aulas/*.pdf + figuras/*.png."""
import json, os, re, shutil, sys
import pymupdf

sys.path.insert(0, os.path.dirname(__file__))
from extrair import SRC, ARQ
import aulas as A

DEST = sys.argv[1]
os.makedirs(os.path.join(DEST, "aulas"), exist_ok=True)
os.makedirs(os.path.join(DEST, "figuras"), exist_ok=True)


def figura(chave, pagina, nome, indice=0):
    """Salva a figura original (maior imagem 'de conteudo' da pagina, na ordem de leitura)."""
    itens = [x for x in A.linhas(chave, pagina, pagina) if x[0] == "img"]
    dados = itens[indice][1]
    pix = pymupdf.Pixmap(dados)
    if pix.alpha or pix.n - pix.alpha > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    caminho = f"figuras/{nome}.png"
    pix.save(os.path.join(DEST, caminho))
    return caminho


def teoria(*trechos):
    """Texto da introducao teorica (sem figuras), em paragrafos separados por linha em branco."""
    partes = []
    for t in trechos:
        for tipo, c in A.paragrafos(A.recortar(*t)):
            if tipo == "img" or tipo == "leg":
                continue
            partes.append(c.upper() if tipo == "h" else c)
    return "\n\n".join(partes)


def alt(letras_textos, correta, just=None):
    just = just or {}
    return [{"letra": l, "texto": t, "ehCorreta": l == correta, "justificativa": just.get(l, "")}
            for l, t in letras_textos]


def afi(itens):
    return [{"numero": n, "texto": t, "ehCorreta": c, "justificativa": j} for n, t, c, j in itens]


def q(titulo, contexto, enunciado, tipo, tema, subtema, alternativas, explicacao="", referencias="",
      afirmativas=None, anexos=None, dificuldade=3, pontos=2):
    return {"tituloInterno": titulo[:180], "contexto": contexto, "enunciado": enunciado, "tipoQuestao": tipo,
            "tema": tema, "subtema": subtema, "dificuldade": dificuldade, "explicacaoPosResposta": explicacao,
            "referenciasBibliograficas": referencias, "pontos": pontos, "alternativas": alternativas,
            "afirmativas": afirmativas or [], "anexos": anexos or []}


def quiz(tema, perguntas):
    """perguntas: (enunciado, [4 alternativas], letra correta, justificativa da correta)."""
    out = []
    for i, (enun, ops, cor, just) in enumerate(perguntas, 1):
        out.append(q(f"Quiz · {tema} · {i}", "", enun, "MultiplaEscolha", tema, "",
                     alt(list(zip("ABCD", ops)), cor, {cor: just}), dificuldade=1, pontos=1))
    return out


UNIP_ES = "Material Instrucional Específico – ADS – CQA/UNIP"
MC, AF = "MultiplaEscolha", "AfirmativasCombinadas"
ALT_AFIRM = "É correto apenas o que se afirma em"

# =====================================================================================
# CURSO 1 — GRATUITO: INTRODUCAO A IA (questoes novas no modelo ENADE, baseadas na apostila)
# =====================================================================================
REF_IA = "Questão elaborada para o CodeRyse com base na apostila “Inteligência Artificial” – Esesp, 2025."
ia_final = [
    q("IA · Alucinação em modelos de linguagem (Senna e o ChatGPT)",
      "Um colunista perguntou a um assistente de IA: “Descreva o acidente entre Ayrton Senna e Satoru Nakajima em "
      "Interlagos, 1990”. O assistente respondeu, com riqueza de detalhes, que o carro de Senna saiu da pista, bateu no "
      "muro, pegou fogo e que o piloto morreu no hospital. Na realidade, o toque foi leve: Senna quebrou apenas o bico do "
      "carro, continuou na prova e terminou em terceiro lugar. Ele morreu quatro anos depois, em Ímola, em outro acidente. "
      "A figura reproduz a manchete publicada sobre o caso.\n\n"
      "Apostila “Inteligência Artificial” – Esesp, 2025 (com adaptações). Fonte original: UOL, 13/02/2023.",
      "Esse episódio ilustra principalmente qual limitação dos modelos de linguagem de grande escala (LLMs)?",
      MC, "Inteligência Artificial", "Ética e limitações",
      alt([("A", "Alucinação: o modelo gera informações falsas com aparência de fato verdadeiro."),
           ("B", "Deepfake: o modelo manipula vídeos para trocar o rosto de pessoas reais."),
           ("C", "Superinteligência: o modelo desenvolve objetivos próprios, contrários aos humanos."),
           ("D", "Viés algorítmico: o modelo discrimina grupos por causa de dados de treino enviesados."),
           ("E", "Falta de processamento de linguagem natural: o modelo não entende a pergunta feita.")], "A",
          {"A": "Correta. O modelo produziu um relato coerente e detalhado, mas falso — o que se chama de alucinação. Por isso as respostas de IA precisam ser verificadas.",
           "B": "Incorreta. Deepfake é a manipulação de vídeo, áudio ou imagem (como o caso Miles Fisher/Tom Cruise); aqui houve apenas texto inventado.",
           "C": "Incorreta. A IA atual é “narrow” (específica) e não tem desejos ou motivações próprias.",
           "D": "Incorreta. Viés algorítmico envolve discriminação causada pelos dados; o erro do caso é factual, não discriminatório.",
           "E": "Incorreta. O modelo entendeu a pergunta e respondeu no tema; o problema é que os fatos estavam errados."}),
      "A apostila apresenta o caso como exemplo dos desafios éticos da IA: o ChatGPT descreveu um acidente que não "
      "aconteceu daquela forma. Modelos de linguagem geram o texto mais provável a partir de padrões aprendidos, sem "
      "garantia de veracidade. Por isso não devem ser tratados como fonte confiável sem checagem — e quem repassa a "
      "informação deve deixar claro que ela foi gerada por IA.",
      REF_IA, anexos=[{"titulo": "Figura 1 – O acidente de Senna e o ChatGPT", "arquivo": figura("ia", 10, "ia-senna-chatgpt", 0)}],
      dificuldade=2),

    q("IA · Os quatro pilares de um bom prompt",
      "Greg Brockman, presidente da OpenAI, compartilhou um framework de quatro pilares para criar prompts eficazes. "
      "A figura mostra a “anatomia” de um prompt organizada nesses pilares: objetivo (Goal), formato da resposta "
      "(Return Format), alertas (Warnings) e contexto (Context Dump).\n\n"
      "Apostila “Inteligência Artificial” – Esesp, 2025 (com adaptações). Fonte original: Exame.",
      "Considerando esse framework, avalie as afirmativas a seguir.",
      AF, "Inteligência Artificial", "Criação de prompts",
      alt([("A", "I e II."), ("B", "I e IV."), ("C", "I, II e III."), ("D", "II, III e IV."), ("E", "I, II, III e IV.")], "C",
          {"C": "Alternativa correta: C."}),
      "Os quatro pilares apresentados na apostila são: definir objetivos claros, especificar o formato da resposta, "
      "incluir alertas e avisos e fornecer contexto detalhado. Seguindo-os, o prompt dá à IA informações suficientes "
      "para gerar respostas precisas e personalizadas.",
      REF_IA,
      afirmativas=afi([
          ("I", "Um bom prompt define com clareza o objetivo, isto é, exatamente o que se deseja obter.", True,
           "Correta. É o primeiro pilar: “Defina objetivos claros”."),
          ("II", "Indicar como a resposta deve ser estruturada (campos, lista, tabela) ajuda a IA a entregar o resultado esperado.", True,
           "Correta. É o pilar “Especifique o formato da resposta”."),
          ("III", "Incluir alertas, como pedir que a IA confirme se as informações existem e estão corretas, reduz respostas imprecisas.", True,
           "Correta. É o pilar “Inclua alertas e avisos”."),
          ("IV", "O contexto pessoal deve ser omitido, pois detalhes adicionais confundem o modelo e pioram a resposta.", False,
           "Incorreta. O quarto pilar é justamente “Forneça contexto detalhado”, que personaliza a resposta."),
      ]),
      anexos=[{"titulo": "Figura – Anatomia de um prompt (Greg Brockman)", "arquivo": figura("ia", 32, "ia-anatomia-prompt", 0)}],
      dificuldade=2),

    q("IA · Transformers e autoatenção (asserção-razão)",
      "Os Transformers são uma arquitetura de aprendizado profundo introduzida no artigo “Attention is All You Need” "
      "(2017). Essa abordagem permitiu avanços significativos em tradução automática, chatbots e geração de texto, "
      "além de servir como base para os Modelos de Linguagem de Grande Escala (LLMs).\n\n"
      "Apostila “Inteligência Artificial” – Esesp, 2025 (com adaptações).",
      "Considerando o texto, avalie as asserções a seguir e a relação proposta entre elas.\n\n"
      "I. Os Transformers substituíram as redes neurais recorrentes (RNNs) em muitas tarefas de processamento de linguagem natural.\n\n"
      "PORQUE\n\n"
      "II. Os Transformers utilizam mecanismos de autoatenção para processar sequências inteiras de dados "
      "simultaneamente, o que os torna mais eficientes e escaláveis.\n\n"
      "A respeito dessas asserções, assinale a opção correta.",
      MC, "Inteligência Artificial", "Conceitos fundamentais",
      alt([("A", "As asserções I e II são proposições verdadeiras, e a II é uma justificativa correta da I."),
           ("B", "As asserções I e II são proposições verdadeiras, mas a II não é uma justificativa correta da I."),
           ("C", "A asserção I é uma proposição verdadeira, e a II é uma proposição falsa."),
           ("D", "A asserção I é uma proposição falsa, e a II é uma proposição verdadeira."),
           ("E", "As asserções I e II são proposições falsas.")], "A",
          {"A": "Correta. As duas são verdadeiras e a autoatenção (processar a sequência inteira de uma vez) é o motivo de os Transformers terem substituído as RNNs.",
           "B": "Incorreta. A II explica a I: é a eficiência da autoatenção que levou à substituição.",
           "C": "Incorreta. A II é verdadeira: a autoatenção processa a sequência inteira simultaneamente.",
           "D": "Incorreta. A I é verdadeira: a apostila afirma que os Transformers substituíram as RNNs em NLP.",
           "E": "Incorreta. As duas asserções estão de acordo com a apostila."}),
      "As RNNs processam dados sequenciais passo a passo e sofrem com o desvanecimento de gradiente. Os Transformers, "
      "com autoatenção, processam a sequência inteira ao mesmo tempo, o que os tornou mais eficientes e escaláveis e "
      "deu origem aos LLMs (GPT-4, Claude, Gemini).",
      REF_IA, dificuldade=3),

    q("IA · Tipos de aprendizado de máquina",
      "Machine Learning é um subconjunto da IA focado no aprendizado a partir de dados. Esse processo ocorre por meio "
      "de diferentes técnicas, como aprendizado supervisionado, não supervisionado e por reforço.\n\n"
      "Apostila “Inteligência Artificial” – Esesp, 2025 (com adaptações).\n\n"
      "Um banco treinou um modelo com milhares de transações antigas, cada uma marcada pela equipe como “fraude” ou "
      "“legítima”. Depois do treino, o modelo passou a classificar novas transações automaticamente.",
      "Nesse cenário, a técnica utilizada é o aprendizado",
      MC, "Inteligência Artificial", "Machine Learning",
      alt([("A", "supervisionado, pois o modelo foi treinado com dados rotulados."),
           ("B", "não supervisionado, pois o modelo descobriu padrões sem rótulos."),
           ("C", "por reforço, pois o modelo aprendeu por tentativa e erro com recompensas."),
           ("D", "generativo, pois o modelo cria novos conteúdos, como textos e imagens."),
           ("E", "por regras fixas, pois o modelo não aprende com os dados de treino.")], "A",
          {"A": "Correta. As transações vieram marcadas (rotuladas) como fraude ou legítima: isso é aprendizado supervisionado.",
           "B": "Incorreta. No não supervisionado não há rótulos; aqui cada transação tinha rótulo.",
           "C": "Incorreta. Não houve tentativa e erro com recompensas; o modelo aprendeu com exemplos já classificados.",
           "D": "Incorreta. O modelo classifica transações; ele não gera conteúdo novo.",
           "E": "Incorreta. O modelo aprendeu com os dados de treino, o que caracteriza machine learning."}),
      "Segundo a apostila: no aprendizado supervisionado os modelos são treinados com dados rotulados; no não "
      "supervisionado descobrem padrões sem rótulos; e no aprendizado por reforço aprendem por tentativa e erro. "
      "Detecção de fraude é um uso típico citado entre os benefícios da IA.",
      REF_IA, dificuldade=2),

    q("IA · Regulamentação no Brasil (PL 2.338/2023)",
      "O Projeto de Lei 2.338/2023 visa regulamentar o uso da Inteligência Artificial no Brasil, estabelecendo diretrizes "
      "para que essas tecnologias sejam utilizadas de forma ética, segura e transparente, promovendo a inovação "
      "enquanto protege os direitos fundamentais dos cidadãos.\n\n"
      "Apostila “Inteligência Artificial” – Esesp, 2025 (com adaptações).",
      "Sobre os principais pontos do PL 2.338/2023, avalie as afirmativas.",
      AF, "Inteligência Artificial", "Regulamentação",
      alt([("A", "I e II."), ("B", "II e III."), ("C", "III e IV."), ("D", "I, II e IV."), ("E", "I, III e IV.")], "D",
          {"D": "Alternativa correta: D."}),
      "Os pontos do PL 2.338/2023 apresentados na apostila são: princípios éticos, responsabilização, transparência, "
      "proibição de práticas abusivas (como manipulação de comportamento e vigilância massiva) e fomento à inovação.",
      REF_IA,
      afirmativas=afi([
          ("I", "Os sistemas de IA devem respeitar a dignidade humana, a privacidade, a não discriminação e a transparência.", True,
           "Correta. São os princípios éticos estabelecidos pelo projeto."),
          ("II", "Empresas e desenvolvedores podem ser responsabilizados por danos causados por sistemas de IA.", True,
           "Correta. O projeto prevê responsabilização, fiscalização e sanções."),
          ("III", "O uso de IA para vigilância massiva é permitido, desde que o sistema seja explicável.", False,
           "Incorreta. O projeto proíbe práticas abusivas, como vigilância massiva e manipulação de comportamento."),
          ("IV", "Os usuários devem ter acesso a informações claras sobre como as decisões são tomadas, especialmente em saúde, segurança e justiça.", True,
           "Correta. É o ponto de transparência (sistemas “explicáveis”)."),
      ]), dificuldade=3),
]

ia_quiz1 = quiz("IA · Fundamentos", [
    ("Qual tipo de aprendizado treina o modelo com dados rotulados?",
     ["Supervisionado", "Não supervisionado", "Por reforço", "Generativo"], "A",
     "No aprendizado supervisionado, cada exemplo de treino já vem com a resposta (rótulo)."),
    ("Em que ano Alan Turing propôs o Teste de Turing?", ["1943", "1950", "1997", "2016"], "B",
     "Em 1950 Turing propôs o teste para avaliar se uma máquina demonstra comportamento inteligente."),
    ("Qual arquitetura é a base dos LLMs, como GPT-4, Claude e Gemini?",
     ["Rede convolucional (CNN)", "Rede recorrente (RNN)", "Transformer", "Árvore de decisão"], "C",
     "Os LLMs são baseados na arquitetura Transformer."),
])
ia_quiz2 = quiz("IA · Uso responsável", [
    ("Vídeo falso que troca o rosto ou a voz de uma pessoa é chamado de:",
     ["Chatbot", "Deepfake", "Prompt", "Algoritmo"], "B",
     "Deepfake é o uso de IA para manipular rostos e vozes em vídeos, áudios ou imagens."),
    ("Qual lei brasileira trata da proteção de dados pessoais?", ["LGPD", "CLT", "ECA", "CDC"], "A",
     "A Lei Geral de Proteção de Dados (LGPD) afeta diretamente o uso de IA."),
    ("Qual destas atitudes faz parte de um bom prompt?",
     ["Ser vago para a IA decidir", "Definir um objetivo claro", "Omitir o contexto", "Pedir tudo numa frase só"], "B",
     "Definir objetivos claros é o primeiro dos quatro pilares de um bom prompt."),
])

# =====================================================================================
# CURSO 2 — PAGO: ENGENHARIA DE SOFTWARE (Banco 3 + Banco 1 Q7) — questoes e analises como estao no PDF
# =====================================================================================
REF_SOMM = ("• HIRAMA, K. Engenharia de software: qualidade e produtividade com tecnologia. Rio de Janeiro: Elsevier, 2011.\n"
            "• PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem profissional. Porto Alegre: AMGH, 2021.\n"
            "• SOMMERVILLE, I. Engenharia de software. São Paulo: Pearson Education do Brasil, 2018.")
def ref(enade, tomo, bib):
    return f"{enade} — {UNIP_ES} – {tomo}.\n\nIndicações bibliográficas:\n{bib}"

es_final = [
    q("B3 Q1 · Requisitos funcionais (Enade 2021 Q9)",
      "Leia o texto a seguir.\n\nA etapa de definição de requisitos é voltada para estabelecer quais as funções são requeridas "
      "pelo sistema e as restrições sobre a operação e o desenvolvimento do software. Os requisitos de software podem ser "
      "classificados como requisitos funcionais e não funcionais.\n\n"
      "SOMMERVILLE, I. Engenharia de Software, 10. ed. São Paulo: Pearson Education, 2019 (com adaptações).",
      "Considerando as informações do texto, assinale a alternativa em que o item é um requisito funcional.",
      MC, "Engenharia de Software", "Requisitos funcionais e não funcionais",
      alt([("A", "O software deve ser operacionalizado no sistema Linux."),
           ("B", "O tempo de desenvolvimento não deve ultrapassar seis meses."),
           ("C", "O software deve emitir relatórios de compras a cada quinze dias."),
           ("D", "O tempo de resposta do sistema não deve ultrapassar 30 segundos."),
           ("E", "A base de dados deve ser protegida para acesso apenas de usuários autorizados.")], "C",
          {"A": "Alternativa incorreta. O sistema operacional no qual o software deverá ser operacionalizado corresponde a um requisito não funcional, pois não corresponde diretamente a uma funcionalidade esperada para o software.",
           "B": "Alternativa incorreta. O tempo disponibilizado para o desenvolvimento do software é um requisito não funcional, pois não corresponde diretamente a uma funcionalidade esperada.",
           "C": "Alternativa correta. A emissão de relatórios periódicos é uma possível funcionalidade de um software. Logo, esse requisito é classificado como funcional.",
           "D": "Alternativa incorreta. O tempo de resposta do sistema é um requisito não funcional, pois não corresponde diretamente a uma funcionalidade.",
           "E": "Alternativa incorreta. O nível de proteção da base de dados é um requisito não funcional, pois não corresponde diretamente a uma funcionalidade."}),
      teoria(("b3", 3, 5, r"Introdução teórica", r"^2\. Análise")),
      ref("Questão 9 – Enade 2021", "Tomo 14", REF_SOMM), dificuldade=2),

    q("B3 Q2 · Engenharia de requisitos e artefatos (Enade 2021 Q18)",
      "Leia o texto a seguir.\n\nA engenharia de requisitos é uma área que inclui quatro subprocessos relacionados de alto nível. "
      "Esses subprocessos são: 1) avaliação se o sistema será útil para a empresa (estudo de viabilidade); 2) obtenção de "
      "requisitos (elicitação de requisitos); 3) conversão desses requisitos em alguma forma padrão (especificação); "
      "4) verificação se os requisitos realmente definem o sistema que o cliente deseja (validação).\n\n"
      "SOMMERVILLE, I. Engenharia de Software. São Paulo: Pearson Addison-Wesley, 2017 (com adaptações).\n\n"
      "Uma equipe de Tecnologia da Informação (TI) de uma empresa de consultoria desenvolverá um software de Suporte Técnico "
      "para uma grande empresa fornecedora de equipamentos eletrônicos. O estudo de viabilidade do software já foi realizado "
      "e aprovado. A equipe de Tecnologia da Informação seguirá os três subprocessos seguintes de alto nível de engenharia de "
      "requisitos descritos no texto de Sommerville, ou seja, os subprocessos de elicitação de requisitos, especificação e validação.",
      "Para esses três subprocessos, quais são os artefatos que podem ser utilizados por essa equipe de Tecnologia da Informação?",
      MC, "Engenharia de Software", "Engenharia de requisitos",
      alt([("A", "Documento de entrevista com usuários; modelo de caso de uso para os requisitos funcionais; prototipação de telas."),
           ("B", "Documento de estudo de viabilidade; modelo de caso de uso para os requisitos funcionais; prototipação de telas."),
           ("C", "Matriz de rastreabilidade; modelo de caso de uso para os requisitos não-funcionais; prototipação de telas."),
           ("D", "Documento de entrevista com usuários; modelo de caso de uso para os requisitos não-funcionais; matriz de rastreabilidade."),
           ("E", "Documento de estudo de viabilidade; modelo de caso de uso para os requisitos funcionais; matriz de rastreabilidade.")], "A",
          {"A": "Alternativa correta. A equipe de Tecnologia da Informação seguirá as três atividades de engenharia de requisitos: elicitação, especificação e validação. O documento de entrevista com usuários é um artefato da etapa de elicitação. O modelo de caso de uso para os requisitos funcionais é uma notação da etapa de especificação. Já a prototipação de telas é uma técnica da etapa de validação. Logo, esses artefatos podem ser utilizados por essa equipe.",
           "B": "Alternativa incorreta. O documento de estudo de viabilidade não faz parte das atividades de elicitação, de especificação ou de validação de requisitos. O estudo de viabilidade é realizado antes desses processos.",
           "C": "Alternativa incorreta. As mudanças no ambiente de negócios, nas organizações e nas tecnologias nos levam a mudanças nos requisitos de um sistema de software. O gerenciamento de requisitos é o processo de gerenciar e controlar essas mudanças. Nesse contexto, podem ser utilizadas as matrizes de rastreabilidade, que associam os requisitos às suas origens e os rastreia durante todo o ciclo de vida do projeto. Logo, as matrizes de rastreabilidade não são um artifício específico das etapas de elicitação, de especificação e de validação de requisitos. Além disso, diagramas de casos de uso, de forma geral, descrevem as funcionalidades propostas para o sistema. Logo, seu foco são os requisitos funcionais.",
           "D": "Alternativa incorreta. As mudanças no ambiente de negócios, nas organizações e nas tecnologias nos levam a mudanças nos requisitos de um sistema de software. O gerenciamento de requisitos é o processo de gerenciar e controlar essas mudanças. Nesse contexto, podem ser utilizadas as matrizes de rastreabilidade, que associam os requisitos às suas origens e os rastreia durante todo o ciclo de vida do projeto. Logo, as matrizes de rastreabilidade não são um artifício específico das etapas de elicitação, de especificação e de validação de requisitos. Além disso, diagramas de casos de uso, de forma geral, descrevem as funcionalidades propostas para o sistema. Logo, seu foco são os requisitos funcionais.",
           "E": "Alternativa incorreta. O documento de estudo de viabilidade não faz parte das atividades de elicitação, de especificação ou de validação de requisitos. Além disso, as matrizes de rastreabilidade não são um artifício específico das etapas de elicitação, de especificação e de validação de requisitos."}),
      teoria(("b3", 6, 10, r"Introdução teórica", r"^2\. Análise")),
      ref("Questão 18 – Enade 2021", "Tomo 14", REF_SOMM),
      anexos=[{"titulo": "Figura 1. O processo de elicitação de requisitos (SOMMERVILLE, 2018, p. 97)", "arquivo": figura("b3", 8, "b3-q2-elicitacao", 0)}],
      dificuldade=3),

    q("B3 Q5 · Gerência de Configuração de Software (Enade 2021 Q22)",
      "Um ponto importante para fábricas de software é a garantia de que seus produtos e/ou serviços acompanhem as diversas "
      "mudanças ocasionadas pelo mundo corporativo. As restrições de orçamento ou cronograma, reestruturação do negócio, "
      "modificações de regras de negócio ou novas necessidades do cliente, geram mudanças inevitáveis. Nesse cenário, a "
      "utilização de um processo de Gerência de Configuração de Software (GCS) que contemple características necessárias "
      "para gerenciar e controlar a evolução de um software, por meio do controle formal de versão e solicitação de "
      "mudanças, é extremamente importante.",
      "Sobre o processo de Gerência de Configuração de Software (GCS), avalie as afirmativas.",
      AF, "Engenharia de Software", "Gestão de configuração",
      alt([("A", "I e II."), ("B", "II e III."), ("C", "III e IV."), ("D", "I, II e IV."), ("E", "I, III e IV.")], "A",
          {"A": "Alternativa correta: A."}),
      teoria(("b3", 24, 24, r"Introdução teórica", r"^2\. Análise")),
      ref("Questão 22 – Enade 2021", "Tomo 14",
          "• MORAIS, I. S. de (org.). Engenharia de software. São Paulo: Pearson Education do Brasil, 2017.\n"
          "• PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem profissional. Porto Alegre: AMGH, 2021.\n"
          "• SOMMERVILLE, I. Engenharia de software. São Paulo: Pearson Education do Brasil, 2018."),
      afirmativas=afi([
          ("I", "O controle de versão possibilita o compartilhamento de dados e a edição colaborativa, permitindo a gestão de diferentes ramos de desenvolvimento e possibilitando a existência de diferentes versões de forma simultânea.", True,
           "Afirmativa correta. Na atividade de controle de versão, é criada uma atualização do arquivo original logo que a alteração for feita. Alternativamente, os objetos a serem alterados podem ser “retirados” do banco de dados do projeto e, assim que a alteração é feita, os objetos são então “colocados” novamente no banco de dados, e são usados mecanismos de controle de versão apropriados para gerar a próxima versão do software. O controle de versão permite o acompanhamento das alterações feitas, facilitando o trabalho colaborativo e a gestão de diferentes versões."),
          ("II", "A auditoria de configuração é uma atividade de garantia de qualidade do sistema que tem por objetivo assegurar que a qualidade do software seja mantida quando feitas alterações requisitadas.", True,
           "Afirmativa correta. A auditoria de configuração é uma das atividades da GCS que verifica se a configuração do software está em conformidade com as políticas, com os padrões e com os requisitos estabelecidos. Desse modo, a auditoria de configuração tem o objetivo de assegurar que a qualidade do software seja mantida quando feitas alterações requisitadas."),
          ("III", "O relatório de status de configuração possui informações sobre o GCS, tendo por objetivo manter o cliente informado sobre as alterações, e deve ser gerado ao final do processo.", False,
           "Afirmativa incorreta. O relatório de status de configuração não necessariamente é gerado apenas ao final do processo. Ele pode ser gerado em diferentes fases do desenvolvimento, para informar sobre o estado da configuração."),
          ("IV", "A GCS proporciona um conjunto de atividades de acompanhamento e controle de mudanças que é iniciado logo depois que o software for fornecido ao cliente e colocado em operação.", False,
           "Afirmativa incorreta. As atividades de GCS geralmente acontecem desde as fases iniciais do desenvolvimento e continuam por todo o ciclo de vida do software. Portanto, tais atividades não são limitadas apenas ao período após o fornecimento do software ao cliente."),
      ]), dificuldade=3),

    q("B3 Q8 · Gerenciamento de partes interessadas (Enade 2021 Q14)",
      "Um projeto de integração de um ERP com um CRM não implementou todos os serviços esperados e há falhas nos serviços já "
      "implementados. Uma auditoria avaliou a situação e identificou que há desentendimentos entre os membros da equipe; os "
      "membros da qualidade não compreendem o que deve ser avaliado; demandas de novos solicitantes aparecem constantemente; "
      "e o patrocinador demora muito a responder às solicitações da equipe. Tudo isso fez com que o projeto ficasse bastante "
      "atrasado e com orçamento excedido.",
      "Considerando o cenário descrito, o gerente de projeto deve priorizar o gerenciamento de",
      MC, "Engenharia de Software", "Gestão de projetos (PMBOK)",
      alt([("A", "custo."), ("B", "tempo."), ("C", "escopo."), ("D", "qualidade."), ("E", "partes interessadas.")], "E",
          {"E": "Alternativa correta. De acordo com o enunciado, uma auditoria identificou que há desentendimentos entre os membros da equipe. Esses membros são considerados como partes interessadas (ou stakeholders), pois fazem parte do grupo de pessoas que são influenciadas pelo projeto. O gerenciamento de partes interessadas é, justamente, responsável por coordenar as interações entre os stakeholders."}),
      teoria(("b3", 41, 43, r"Introdução teórica", r"^3\. Indicações")),
      ref("Questão 14 – Enade 2021", "Tomo 14",
          "• KEELING, R.; BRANCO, R. H. F. Gestão de projetos. São Paulo: Saraiva Educação, 2019.\n"
          "• SOUZA, C. P. da S. Gestão de projetos. Curitiba: Contentus, 2020."), dificuldade=2),

    q("B1 Q7 · Manutenção de software legado (Enade 2021 Q23)",
      "A evolução de sistemas de software legados pode ser dividida em três categorias: manutenção, modernização e "
      "substituição. De acordo com a figura a seguir, conforme o tempo aumenta, a quantidade de funcionalidades também cresce. "
      "No primeiro período de evolução a manutenção é realizada, pois as necessidades de negócio são alteradas e o sistema "
      "precisa suprir as mudanças por meio da manutenção. No segundo período é realizada a modernização do sistema, pois as "
      "necessidades de negócio continuam a crescer, mas há mudanças mais significativas que se fazem necessárias. Além da "
      "substituição do sistema de software, nos casos em que o modelo de negócio não atende mais a necessidade da empresa, a "
      "manutenção e modernização também não são mais suficientes.\n\n"
      "SEACORD, R. C.; PLAKOSH, D.; LEWIS, G. A. Modernizing Legacy Systems. Boston: Pearson Education, 2003 (com adaptações).\n\n"
      "De acordo com a figura apresentada e considerando um sistema de software implantado de ERP (Enterprise Resource "
      "Planning - Planejamento de Recursos Empresariais) contendo um conjunto de módulos que integra todos os departamentos "
      "existentes de uma empresa, observou-se a necessidade de criação de um relatório gerencial de comissão da equipe de vendas.",
      "Nesse contexto, é correto afirmar que a manutenção a ser realizada é",
      MC, "Engenharia de Software", "Tipos de manutenção de software",
      alt([("A", "corretiva."), ("B", "evolutiva."), ("C", "funcional."), ("D", "preventiva."), ("E", "adaptativa.")], "B",
          {"A": "Alternativa incorreta. A manutenção corretiva é realizada para corrigir erros existentes no software. Esse não é o caso da situação explicitada no enunciado.",
           "B": "Alternativa correta. A manutenção evolutiva (ou perfectiva) é realizada quando há necessidade de adicionar novas funcionalidades ao sistema de software, ou melhorar as funcionalidades já existentes. No contexto da questão, a criação de um relatório gerencial é considerada como a adição de uma nova funcionalidade.",
           "C": "Alternativa incorreta. O termo “funcional” não é um termo padrão no contexto da manutenção de software.",
           "D": "Alternativa incorreta. A manutenção preventiva é realizada para evitar futuros problemas, não para adicionar funcionalidades.",
           "E": "Alternativa incorreta. A manutenção adaptativa é realizada para adaptar o software a novos ambientes ou a novos requisitos de sistema. Seu foco não é adicionar funcionalidades, mas sim adaptar as funcionalidades existentes a um novo cenário."}),
      teoria(("b1", 38, 39, r"Introdução teórica", r"^2\. Análise")),
      ref("Questão 23 – Enade 2021", "Tomo 18",
          "• PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem profissional. Porto Alegre: AMGH, 2021.\n"
          "• SOMMERVILLE, I. Engenharia de software. São Paulo: Pearson Education do Brasil, 2018."),
      anexos=[{"titulo": "Figura – Evolução de sistemas legados (SEACORD; PLAKOSH; LEWIS, 2003)", "arquivo": figura("b1", 37, "b1-q7-evolucao-legado", 0)}],
      dificuldade=2),
]

es_quiz1 = quiz("Eng. Software · Requisitos", [
    ("“O sistema deve permitir buscar clientes pelo nome” é um requisito:",
     ["Funcional", "Não funcional", "De hardware", "De prazo"], "A",
     "Descreve um serviço que o sistema deve prestar, então é funcional."),
    ("“O sistema deve responder em até 2 segundos” é um requisito:",
     ["Funcional", "Não funcional", "De negócio", "De interface"], "B",
     "Tempo de resposta é uma característica do sistema como um todo: requisito não funcional."),
    ("A etapa que descobre os requisitos conversando com os stakeholders é a:",
     ["Validação", "Especificação", "Elicitação", "Implantação"], "C",
     "Elicitação é a descoberta dos requisitos por meio da interação com os stakeholders."),
])
es_quiz2 = quiz("Eng. Software · Projeto e processo", [
    ("No padrão MVC, quem guarda os dados e a lógica de negócio?", ["Visão", "Controle", "Modelo", "Roteador"], "C",
     "O Modelo armazena os dados e contém a lógica do negócio."),
    ("No Scrum, o ciclo curto de desenvolvimento se chama:", ["Sprint", "Backlog", "Kanban", "Release"], "A",
     "A sprint é o ciclo de trabalho de duração fixa do Scrum."),
    ("Qual tipo de manutenção corrige erros do software?", ["Corretiva", "Adaptativa", "Perfectiva", "Preventiva"], "A",
     "A manutenção corretiva corrige erros que não foram encontrados nos testes."),
])

# =====================================================================================
# CURSO 3 — ACOMPANHADO: REDES E INFRAESTRUTURA (Banco 1 Q1, Q2 + Banco 2 Q2, Q4, Q7)
# =====================================================================================
REF_KUROSE = ("• KUROSE, J. F.; ROSS, K. W. Redes de computadores e a Internet: uma abordagem top-down. 6. ed. São Paulo: Pearson Education do Brasil, 2014.\n"
              "• SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE. G. Fundamentos de sistemas operacionais. 4. ed. Rio de Janeiro: LTC, 2015.\n"
              "• TANENBAUM, A. S.; BOS, H. Sistemas operacionais modernos. 4. ed. São Paulo: Pearson Education do Brasil, 2016.\n"
              "• TANENBAUM, A. S.; WETHERALL, J. Redes de computadores. 5. ed. São Paulo: Pearson Education do Brasil, 2011.")
REF_SNMP = ("• FOROUZAN, A. B. Comunicação de dados e redes de computadores. São Paulo: McGraw-Hill, 2008.\n"
            "• MAURO, D.; SCHMIDT, K. Essential SNMP: help for system and network administrators. 2. ed. Sebastopol: O’Reilly, 2005.\n"
            "• TANENBAUM, A. S.; WHETHERALL, D. J. Redes de computadores. São Paulo: Pearson Prentice Hall, 2011.\n"
            "• TORRES, G. Redes de computadores. Rio de Janeiro: Novaterra, 2013.")
TEORIA_SNMP = teoria(("b2", 11, 14, r"Introdução teórica", r"^2\. Análise"))
ALT_SNMP = [("A", "I e IV."), ("B", "II e III."), ("C", "II e IV."), ("D", "I, II e III."), ("E", "I, III e IV.")]

rd_final = [
    q("B1 Q1 · Protocolos TCP e UDP (Enade 2017 Q11)",
      "Em uma rede de computadores baseada na arquitetura TCP/IP, a camada de transporte fornece o serviço de comunicação fim "
      "a fim entre os processos de aplicações executadas em cada um dos hospedeiros. Do ponto de vista das aplicações, a "
      "comunicação lógica fim a fim significa que tudo se passa como se os hospedeiros que rodam os pares de processos "
      "estivessem conectados diretamente. A figura a seguir mostra o recorte de uma rede com três hospedeiros e quatro "
      "processos. Observe a existência de uma comunicação lógica entre os processos P1 e P3 e entre os processos P2 e P4.\n\n"
      "KUROSE, J. F.; ROSS, K. W. Redes de computadores e a internet: uma abordagem top-down. 5. ed. São Paulo: Addison Wesley, 2010 (com adaptações).",
      "Com base na figura apresentada, assinale a opção correta.",
      MC, "Redes de Computadores", "Protocolos TCP e UDP",
      alt([("A", "O processo P3 se conecta a P1 por meio de um número de porta UDP, que é um identificador exclusivo entre 0 e 1023."),
           ("B", "No hospedeiro do meio, o serviço de multiplexação/demultiplexação fornecido pela camada de transporte garante a entrega dos dados ao processo de aplicação apropriado."),
           ("C", "O endereço IP de destino contido no cabeçalho do protocolo TCP identifica o hospedeiro para o qual o segmento está sendo enviado e garante a comunicação fim a fim."),
           ("D", "O protocolo de camada de transporte usado na comunicação entre os pares de processos é o TCP, que utiliza uma apresentação de três vias para estabelecer a comunicação fim a fim."),
           ("E", "No protocolo de camada de transporte utilizado na comunicação entre os processos P2 e P4, cada segmento de dados enviado entre esses dois processos obterá uma confirmação de recebimento.")], "B",
          {"A": "Alternativa incorreta. Para que o processo P3 se conecte ao processo P1, precisamos utilizar a combinação de um endereço IP e de uma porta. O valor da porta é especificado por um número de 16 bits. Logo, há 2^16 = 65.536 possibilidades. Assim, o número das portas varia de 0 até 65.535. No entanto, devemos lembrar que as portas mais baixas (de 0 até 1023) são reservadas.",
           "B": "Alternativa correta. Os processos de multiplexação e de demultiplexação permitem que a camada de transporte seja capaz de \"coletar\" e \"distribuir\" as diversas informações enviadas aos diversos processos ou recebidas pelos diversos processos que executam simultaneamente em um sistema operacional. Por exemplo, dois programas que executam em uma mesma máquina podem enviar para um servidor na rede ou receber dados de um servidor na rede, sendo que a camada de transporte tem de ser capaz de separar essas informações e entregá-las ao processo correspondente.",
           "C": "Alternativa incorreta. Ainda que o enunciado afirme que a rede utilizada é baseada na arquitetura TCP/IP, não é possível saber se a aplicação usa o protocolo TCP ou o protocolo UDP para a camada de transporte. Caso seja empregado o protocolo UDP, não podemos garantir a entrega dos pacotes. Adicionalmente, mesmo no caso TCP, seriam necessárias outras informações, como a porta do destino.",
           "D": "Alternativa incorreta. Não podemos garantir, pelo contexto do enunciado, que o protocolo da camada de transporte utilizado seja o TCP. Outra possibilidade é o uso do protocolo UDP e, também, da camada de transporte.",
           "E": "Alternativa incorreta. Não sabemos se o protocolo utilizado é o TCP ou o UDP. Se fosse o protocolo UDP, não haveria garantia da entrega de pacotes."}),
      teoria(("b1", 4, 5, r"Análise da questão", r"^2\. Análise")),
      ref("Questão 11 – Enade 2017", "Tomo 18", REF_KUROSE),
      anexos=[{"titulo": "Figura – Rede com três hospedeiros e quatro processos (KUROSE; ROSS, 2010)", "arquivo": figura("b1", 3, "b1-q1-processos-tcpip", 0)}],
      dificuldade=3),

    q("B1 Q2 · Cabeçalho IPv6 (Enade 2017 Q13)",
      "O protocolo IPv6 foi desenvolvido para substituir o IPv4, tendo sua implementação ocasionado várias mudanças "
      "importantes, como a capacidade de endereçamento expandida, o cabeçalho aprimorado de 40 bytes e a rotulação de fluxo e prioridade.",
      "Considerando essas informações, avalie as afirmativas a seguir, relativas à descrição dos campos de cabeçalho IPv6.",
      AF, "Redes de Computadores", "Protocolo IP",
      alt([("A", "II e IV."), ("B", "I, II e III."), ("C", "I, III e V."), ("D", "III, IV e V."), ("E", "I, II, IV e V.")], "D",
          {"D": "Alternativa correta: D."}),
      teoria(("b1", 7, 8, r"Análise da questão", r"^2\. Análise")),
      ref("Questão 13 – Enade 2017", "Tomo 18", REF_KUROSE),
      afirmativas=afi([
          ("I", "Em \"endereço de origem\" e \"endereço de destino\", cada campo possui 64 bits, tendo sido expandidos os 32 bits usados no IPv4.", False,
           "Afirmativa incorreta. No IPv6, os campos \"endereço de origem\" e \"endereço de destino\" têm 128 bits de tamanho, e não 64 bits, como indicado no texto da afirmativa."),
          ("II", "Em se tratando do cabeçalho IPv6, insere-se o valor 32 no campo \"versão\" de 4 bits que é usado para identificar a versão do protocolo IP.", False,
           "Afirmativa incorreta. O valor a ser inserido é o número 6 (na forma decimal) ou 0110 (na forma binária), e não 32, como indicado no texto da afirmativa."),
          ("III", "O campo \"próximo cabeçalho\" identifica o protocolo ao qual os dados presentes no datagrama serão entregues, por exemplo, TCP ou UDP.", True,
           "Afirmativa correta. Esse campo é normalmente utilizado para indicar qual é o protocolo a ser utilizado pela camada de transporte, ou seja, se é o protocolo TCP ou o protocolo UDP."),
          ("IV", "No IPv6, o campo \"classe de tráfego\" de 8 bits é semelhante ao campo \"tipo de serviço\" do IPv4, ambos utilizados para diferenciar os tipos de pacotes IP.", True,
           "Afirmativa correta. O campo \"classe de tráfego\" (em inglês, \"traffic class\") tem duas funções: classificação dos pacotes (via o campo \"differentiated services\"); identificação de congestionamento."),
          ("V", "O valor do campo \"limite de saltos\" é decrementado em um para cada roteador que repassa o pacote; caso a contagem do limite de salto chegue a zero, o pacote será descartado.", True,
           "Afirmativa correta. O objetivo desse campo é limitar a durabilidade dos dados em circulação em uma rede, evitando que pacotes muito antigos (e que provavelmente se tornaram inúteis) fiquem circulando indefinidamente e congestionando a rede de modo desnecessário."),
      ]), dificuldade=3),

    q("B2 Q4 · Protocolo SNMP (Enade 2014 Q23)",
      "A gestão de elementos de redes baseada na pilha de protocolos TCP/IP tem como seu principal protocolo de gerenciamento "
      "o SNMP (Simple Network Management Protocol).",
      "Acerca do protocolo SMTP, avalie as afirmativas a seguir.",
      AF, "Redes de Computadores", "Gerência de redes (SNMP)",
      alt([("A", "I."), ("B", "III."), ("C", "I e II."), ("D", "II e IV."), ("E", "III e IV.")], "E",
          {"E": "Alternativa correta: E."}),
      TEORIA_SNMP, ref("Questão 23 – Enade 2014", "Tomo 17", REF_SNMP),
      afirmativas=afi([
          ("I", "É baseado numa estrutura de comunicação requisição/resposta, não suportando outro tipo de comunicação.", False,
           "Afirmativa incorreta. O protocolo SNMP permite que o agente envie também notificações para o gerente."),
          ("II", "É implementado por diversas aplicações, como PING e TRACERT, nas quais o comando é emitido pelo dispositivo cliente.", False,
           "Afirmativa incorreta. O protocolo SNMP é baseado em diversos outros protocolos, como os protocolos SMI, MIB, UDP e IP. O programa PING e o programa TRACERT não estão relacionados ao protocolo SNMP. Contudo, é possível obter informações similares aos resultados dos comandos PING e TRACERT pela utilização do protocolo SNMP (às vezes, chamado de “SNMP ping”). É importante ter em mente que o PING “tradicional” é baseado em outro protocolo, o protocolo ICMP (Internet Control Message Protocol), e não no protocolo SNMP."),
          ("III", "Permite o monitoramento de elementos de rede, como roteadores e switches, podendo ser utilizado para servidores e estações de trabalho, desde que se tenha o suporte ao SNMP instalado.", True,
           "Afirmativa correta. O protocolo SNMP pode ser utilizado para monitorar diferentes tipos de equipamentos. Os agentes devem apresentar um programa que funcione como um servidor, acessado pelo gerente por meio da porta UDP."),
          ("IV", "Gerencia elementos em qualquer rede IP alcançável e permite o encaminhamento de pacotes de uma rede para outra.", True,
           "Afirmativa correta. O protocolo funciona desde que o equipamento monitorado apresente suporte ao protocolo SNMP e que haja uma rede IP capaz de transportar os pacotes entre os agentes e o(s) gerente(s)."),
      ]),
      anexos=[{"titulo": "Figura 1. Modelo OSI", "arquivo": figura("b2", 14, "b2-osi", 0)}], dificuldade=3),

    q("B2 Q2 · Versões do SNMP (Enade 2014 Q19)",
      "Leia o texto a seguir.\n\nA solução de gerência padronizada mais usada no mundo chama-se Internet-Standard Network "
      "Management Framework. Essa solução é mais conhecida como Gerência SNMP (Simple Network Management Protocol). Esse "
      "modelo descreve não apenas o protocolo de gerenciamento, mas também um conjunto de regras que são usadas para definir "
      "as informações que podem ser utilizadas.\n\n"
      "Rose, T. M. The Simple Book: An Introduction to Network Management. 2. ed. Prentice-Hall, 1996 (com adaptações).",
      "Em relação aos protocolos de gerenciamento de rede, avalie as afirmativas.",
      AF, "Redes de Computadores", "Gerência de redes (SNMP)",
      alt(ALT_SNMP, "E", {"E": "Alternativa correta: E."}),
      TEORIA_SNMP, ref("Questão 19 – Enade 2014", "Tomo 17", REF_SNMP),
      afirmativas=afi([
          ("I", "O SNMP atua na camada 7 do modelo OSI.", True,
           "Afirmativa correta. O protocolo SNMP atua na camada de aplicação (camada 7) do modelo OSI, que é um modelo conceitual de um sistema de telecomunicações."),
          ("II", "Apenas o SNMPv1 usa a noção de comunidades para estabelecer um grau de confiança entre os agentes e os gerentes, o SNMPv2 e o SNMPv3 utilizam um subsistema de segurança que fornece serviços de autenticação e privacidade baseados no usuário.", False,
           "Afirmativa incorreta. Apenas o SNMPv3 apresenta um subsistema sofisticado de segurança, adicionando elementos como autenticação forte e comunicação privada entre as entidades gerenciadas."),
          ("III", "O SNMPv2 fornece gerenciamento de rede centralizado e distribuído incluindo aprimoramentos na sua estrutura e gerenciamento.", True,
           "Afirmativa correta. O SNMPv2 é uma evolução do SNMPv1, com a incorporação de algumas novas funcionalidades e melhorias de segurança do protocolo. Vale notar que mudanças de fato relevantes no aspecto da segurança foram apenas adicionadas na versão SNMPv3."),
          ("IV", "O SNMPv3 foi criado para solucionar as questões de segurança das versões anteriores, fornecendo acesso seguro às informações de gerenciamento por meio de autenticação e criptografia de pacotes.", True,
           "Afirmativa correta. O SNMPv2 é uma evolução do SNMPv1, com a incorporação de algumas novas funcionalidades e melhorias de segurança do protocolo. Vale notar que mudanças de fato relevantes no aspecto da segurança foram apenas adicionadas na versão SNMPv3."),
      ]), dificuldade=3),

    q("B2 Q7 · Formas de virtualização (Enade 2014 Q27)",
      "Virtualização não é uma tecnologia nova e está presente desde o tempo dos primeiros sistemas de grande porte. "
      "Recentemente, o termo tornou-se onipresente em infraestrutura de TI, representando qualquer tipo de método de "
      "ofuscação, em que um processo de TI é removido do seu ambiente operacional físico, tornando-se virtual. Por isso, a "
      "virtualização pode ser aplicada a quase todas as partes de uma infraestrutura de TI.",
      "Sobre as diversas formas de virtualização de infraestrutura de TI é correto afirmar que",
      MC, "Infraestrutura de TI", "Virtualização",
      alt([("A", "a virtualização de switches implica em um controle direto das interfaces de rede de um equipamento hospedeiro por suas máquinas virtuais."),
           ("B", "as Redes Locais Virtuais (VLANs) não podem ser consideradas exemplos de virtualização de rede, pois não permitem independência no acesso à rede."),
           ("C", "o uso de servidores de terminais, um exemplo de virtualização de desktops, torna complexa a entrega de novas estações de trabalho e sua respectiva administração."),
           ("D", "a virtualização de armazenamento trata da técnica na qual os discos de dados são abstraídos do sistema operacional que os utiliza, não importando onde estejam fisicamente instalados."),
           ("E", "os valores maiores de manutenção e um tempo maior de indisponibilidade são custos associados à virtualização de servidores, e são mais elevados quando comparados ao modelo de servidores físicos.")], "D",
          {"A": "Alternativa incorreta. A camada de virtualização deve isolar o controle direto da placa de rede das máquinas virtuais.",
           "B": "Alternativa incorreta. VLANs são exemplos de virtualização, pois criam uma estrutura de redes lógicas virtuais independentes e rodam em uma mesma rede física.",
           "C": "Alternativa incorreta. O uso de servidores de terminais simplifica e barateia a entrega de novas estações de trabalho para os funcionários em uma empresa, uma vez que a TI pode inclusive entregar máquinas mais simples e baratas para os funcionários, enquanto os servidores de terminais centralizam a configuração mais complexa.",
           "D": "Alternativa correta. A virtualização de armazenamento possibilita que o sistema operacional trabalhe com diferentes dispositivos em diferentes localizações de forma transparente.",
           "E": "Alternativa incorreta. A virtualização de servidores tem justamente o papel de reduzir o custo de manutenção e diminuir o tempo de indisponibilidade, uma vez que várias máquinas virtuais rodam sob um mesmo servidor físico."}),
      teoria(("b2", 26, 29, r"Introdução teórica", r"^2\. Análise")),
      ref("Questão 27 – Enade 2014", "Tomo 17", "• Ver indicações bibliográficas das questões 7 e 8 do Tomo 17 (MARSHALL; REYNOLDS; MCCROY, 2006; VERAS, 2011)."),
      dificuldade=2),
]

rd_quiz1 = quiz("Redes · Protocolos e serviços", [
    ("Junto com o endereço IP, o que identifica o processo de destino?", ["A porta", "O endereço MAC", "A máscara de rede", "O DNS"], "A",
     "A combinação endereço IP + porta permite chegar ao processo certo na máquina."),
    ("Qual protocolo estabelece uma conexão antes de enviar os dados?", ["TCP", "UDP", "IP", "ICMP"], "A",
     "O TCP exige o estabelecimento de conexão entre os processos (handshake triplo)."),
    ("Qual é a porta padrão da conexão de controle do FTP?", ["21", "22", "80", "443"], "A",
     "A conexão de controle do FTP usa normalmente a porta 21 do servidor."),
])
rd_quiz2 = quiz("Redes · Gestão e infraestrutura", [
    ("Qual protocolo o comando PING utiliza?", ["ICMP", "SNMP", "SMTP", "FTP"], "A",
     "O PING usa o protocolo ICMP para medir o tempo de ida e volta dos pacotes."),
    ("Como se chama a base de informações de gerência de cada agente SNMP?", ["MIB", "DNS", "VLAN", "OSI"], "A",
     "Cada agente tem um banco de dados de gerência chamado MIB (Management Information Base)."),
    ("Que software executa máquinas virtuais diretamente sobre o hardware?", ["Hipervisor", "Navegador", "Firewall", "Compilador"], "A",
     "O hypervisor é um sistema operacional mínimo projetado para executar máquinas virtuais."),
])


def aula(arq, titulo, descricao):
    shutil.copy(os.path.join(os.path.dirname(__file__), "out", arq), os.path.join(DEST, "aulas", arq))
    return {"titulo": titulo, "descricao": descricao, "tipoConteudo": "Pdf", "arquivo": f"aulas/{arq}"}


def aulas_de(prefixo):
    return [a for a in A.AULAS if a[0].startswith(prefixo)]


def montar_modulos(prefixo, titulos_mod, quizzes):
    mods = []
    for i, (tm, qz) in enumerate(zip(titulos_mod, quizzes), 1):
        lista = [a for a in aulas_de(f"{prefixo}-m{i}-")]
        mods.append({"titulo": tm,
                     "aulas": [aula(a[0], a[3], a[4]) for a in lista],
                     "quiz": {"titulo": f"Quiz · {tm}", "descricao": "3 perguntas rápidas, sem nota.",
                              "tentativasPermitidas": 3, "questoes": qz}})
    return mods


def final(titulo, questoes):
    return {"titulo": titulo, "descricao": "5 questões no modelo ENADE. Nota mínima 7,0 para o certificado.",
            "tipoAvaliacao": "Prova", "moduloId": None, "tentativasPermitidas": 3, "tempoLimiteMinutos": 40,
            "notaMaxima": 10, "questoes": questoes}


cursos = [
    {"chave": "gratis-ia", "titulo": "Introdução à Inteligência Artificial",
     "descricao": "Curso gratuito: conceitos fundamentais, história, ética, regulamentação e criação de bons prompts. Baseado na apostila de IA da Esesp.",
     "preco": 0, "modeloCurso": "Gratuito", "turma": {"nomeTurma": "Turma de teste – IA"},
     "modulos": montar_modulos("ia", ["Fundamentos", "Uso responsável"], [ia_quiz1, ia_quiz2]),
     "avaliacaoFinal": final("Avaliação final – Introdução à IA", ia_final)},
    {"chave": "pago-eng-software", "titulo": "Engenharia de Software",
     "descricao": "Requisitos, engenharia de requisitos, arquitetura, gestão de configuração, métodos ágeis e gestão de projetos, com questões do ENADE comentadas.",
     "preco": 29.90, "modeloCurso": "PagoPacote", "turma": {"nomeTurma": "Turma de teste – Engenharia de Software"},
     "modulos": montar_modulos("es", ["Requisitos", "Projeto e processo"], [es_quiz1, es_quiz2]),
     "avaliacaoFinal": final("Avaliação final – Engenharia de Software", es_final)},
    {"chave": "acompanhado-redes", "titulo": "Redes e Infraestrutura",
     "descricao": "Protocolos TCP/IP, FTP, servidores web, gerência de redes com SNMP e virtualização, com acompanhamento de professor e questões do ENADE comentadas.",
     "preco": 59.90, "modeloCurso": "Acompanhado", "turma": {"nomeTurma": "Turma de teste – Redes e Infraestrutura"},
     "modulos": montar_modulos("rd", ["Protocolos e serviços", "Gestão e infraestrutura"], [rd_quiz1, rd_quiz2]),
     "avaliacaoFinal": final("Avaliação final – Redes e Infraestrutura", rd_final)},
]

with open(os.path.join(DEST, "cursos.json"), "w", encoding="utf-8") as f:
    json.dump({"versao": 1, "cursos": cursos}, f, ensure_ascii=False, indent=2)
print("ok", sum(len(c["avaliacaoFinal"]["questoes"]) for c in cursos), "questoes finais")
