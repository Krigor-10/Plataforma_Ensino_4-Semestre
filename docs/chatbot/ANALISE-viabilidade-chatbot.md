# Análise de viabilidade — Chatbot de suporte ao aluno (CodeRyse)

> Levantamento do agente de arquitetura, feito no código atual, sem alterar nada. Preços e modelos conforme a tabela da Anthropic de 2026-11-03.
>
> **Versão 2 (2026-11-14).** A primeira versão desta análise tratava de um chat sobre o **conteúdo** do curso. O usuário esclareceu que quer um chat de **suporte**: dúvidas de uso da plataforma, **olhando a situação do próprio aluno**. Esta versão substitui a anterior.

## 1. O que o chat faz

É um **atendente de suporte do CodeRyse** para o aluno, disponível a qualquer hora. Ele responde dois tipos de pergunta:

1. **Como a plataforma funciona** (regras gerais):
   - "Como eu emito o certificado?"
   - "Qual a diferença entre curso grátis e pago?"
   - "Quantas vezes posso refazer uma avaliação?"
   - "Como pago um curso?"
2. **A situação do próprio aluno** (dados reais dele):
   - "O que falta para eu pegar meu certificado de Desenvolvimento Web?"
   - "Por que a prova final está bloqueada?"
   - "Meu pagamento foi confirmado?"
   - "Quanto falta para terminar o curso de IA?"
   - "Quais cursos eu tenho?"

**O que ele não faz:**
- não explica o conteúdo das aulas;
- não responde avaliações;
- não fala de assunto fora da plataforma;
- não executa ações (comprar, cancelar, emitir): ele **explica e leva até a tela certa**, com um botão ou link.

## 2. Conclusão

**Viável.** O backend já calcula quase tudo de que o chat precisa: progresso, liberação de avaliações, pendências do certificado e pagamentos. Só falta reunir isso para a IA consultar.

O custo por pergunta é **menor** que o do chat de conteúdo, porque o chat não precisa ler o material do curso.

## 3. Como funciona (arquitetura)

A IA recebe:
- uma **base de conhecimento da plataforma**: um texto fixo com as regras do CodeRyse, em cache;
- um conjunto de **ferramentas de consulta só de leitura**, que o backend executa quando a IA pede.

Fluxo de uma pergunta como "o que falta para meu certificado?":
1. A IA percebe que precisa dos dados e pede a ferramenta `situacao_certificado`.
2. O backend executa a consulta **sempre com o aluno logado** (o id vem do token, nunca da IA) e devolve: "faltam 2 conteúdos do Módulo 3 e a prova final".
3. A IA responde em linguagem simples, com o link "Ir para Módulo 3".

### Como o chat entende o contexto da pergunta

Em cada pergunta, o modelo recebe quatro coisas:
1. **Instruções e base de conhecimento** (fixas e em cache): quem ele é, o que pode e não pode responder e as regras da plataforma.
2. **Onde o aluno está**, enviado pelo frontend: a tela aberta e o curso aberto, se houver, como "Avaliações › Desenvolvimento Web Full Stack". Assim "por que essa prova está bloqueada?" já se refere ao curso certo.
3. **Histórico da conversa atual**: as últimas mensagens (por exemplo, as 10 últimas), para entender continuações como "e no outro curso?".
4. **A lista de ferramentas** com a descrição de cada uma. O próprio modelo decide qual consultar.

Se a pergunta for ambígua e nada disso resolver, como "meu curso" quando o aluno tem três, ele **pergunta de volta** ("De qual curso: A, B ou C?") em vez de chutar. O chat **não lembra de conversas anteriores**: cada conversa nova começa do zero, a não ser que se decida o contrário.

### Ferramentas sugeridas (só leitura, sempre do aluno logado)

| Ferramenta | O que devolve | Serviço que já existe |
|---|---|---|
| `meus_cursos` | Cursos do aluno, situação da matrícula, % de progresso | `ProgressoAlunoService.ObterSnapshotAsync` + matrículas |
| `progresso_do_curso` | Conteúdos e módulos concluídos e pendentes de um curso | `ProgressoAlunoService.ObterSnapshotAsync` |
| `situacao_avaliacoes` | Avaliações do curso: liberada ou bloqueada (e por quê), tentativas usadas e restantes, última nota | `ProgressoAlunoService.ObterLiberacaoAvaliacoesAsync` + tentativas |
| `situacao_certificado` | Se já pode emitir e, se não, o que falta | `CertificadoService` (pendências usadas em `/Certificados/status`) |
| `meus_pagamentos` | Pagamentos, valor, status (pendente ou confirmado) e data | `Pagamentos` (`/Pagamentos/aluno`) |
| `buscar_no_catalogo` (opcional) | Cursos disponíveis sobre um tema, com o preço | Catálogo público, com a mesma regra de visibilidade |

**Base de conhecimento:** um texto curto (algumas páginas) com as regras da plataforma:
- modelos de curso;
- compra e pagamento;
- certificado;
- tentativas de avaliação;
- curso encerrado;
- contato.

Primeira versão: um arquivo mantido no projeto. Depois: uma tela para o Admin editar.

## 4. O que já existe e é reaproveitado

| Peça | Onde |
|---|---|
| Chamada à IA da Anthropic (chave só no backend, `fallbacks = "default"`) | `Services/AvaliacaoIAService.cs`, configs `IA:*` |
| Consultas da situação do aluno | `ProgressoAlunoService`, `CertificadoService`, pagamentos, matrículas |
| Regra de acesso por aluno (só os próprios dados) | `PodeAcessarAluno` e `MatriculaTemAcessoLiberado` |
| Limite de uso por usuário em rotas de IA | Política `ia-geracao` em `Program.cs` (o chat ganha a sua) |
| Notificações | `NotificacaoService` (para o "falar com o suporte", se houver) |

**Ponto de atenção:** o modelo padrão atual em `AvaliacaoIAService` é `claude-opus-5`. O atual da mesma linha é `claude-opus-5-5`, mais barato. Ao subir, deixar `IA:Esforco` explícito, porque o padrão muda de `high` para `medium`.

## 5. Custo estimado (por pergunta)

Premissas:
- base de conhecimento de cerca de 5 mil tokens, em cache;
- pergunta e histórico com 1,5 mil tokens;
- de 0 a 2 consultas de ferramenta, cerca de 1 mil tokens de dados;
- resposta com 300 tokens;
- em média, 2 chamadas à IA por pergunta (uma para pedir os dados, outra para responder).

| Modelo | Preço (entrada / saída, por milhão de tokens) | Por pergunta | Por 1.000 perguntas |
|---|---|---|---|
| **Claude Opus 5.5** (padrão) | US$ 4 / 20 (cache: 0,20) | ≈ US$ 0,03 | ≈ US$ 30 |
| Claude Sonnet 5.5 | US$ 2 / 10 (cache: 0,10) | ≈ US$ 0,015 | ≈ US$ 15 |
| Claude Haiku 5.5 | US$ 0,10 / 0,50 | ≈ US$ 0,001 | ≈ US$ 1 |

Para suporte, com perguntas curtas e consultas simples, um modelo menor costuma bastar. A escolha é sua: o recomendado é medir a qualidade com um conjunto de perguntas reais antes de decidir.

## 6. Riscos e como tratar

| Risco | Tratamento |
|---|---|
| **Ver dados de outro aluno** | O id do aluno vem **sempre do token** no backend. As ferramentas não recebem id de aluno da IA, e cada consulta reaproveita a regra de posse já existente. |
| **Inventar regra ou situação** | Regras só da base de conhecimento; situação só das ferramentas. Na falta de base, o bot diz que não sabe e indica o contato. |
| **Pedir ação ("cancela minha matrícula")** | O chat não executa nada. Explica e mostra o botão da tela certa, onde a ação passa pelas confirmações normais. |
| **Perguntas fora do escopo** (conteúdo de aula, provas, outros assuntos) | Recusa educada, com indicação de onde procurar, como o professor ou a aula. |
| **Custo** | Limite por aluno (por hora e por dia), histórico curto e painel de uso. |
| **Privacidade (LGPD)** | O modelo recebe só os dados necessários da consulta (sem CPF nem endereço). Conversas guardadas por tempo definido, com aviso ao aluno. |
| **Base de conhecimento desatualizada** | Ela muda junto com as regras. Cada mudança de regra (ex.: fluxo de venda) inclui atualizar a base. |

## 7. O que precisa ser construído

**Backend:**
- `ChatbotSuporteService`, com base de conhecimento em cache, as ferramentas da tabela, o laço de chamada com ferramentas e a resposta em streaming;
- rota `POST /Chatbot/mensagens` (só Aluno), em streaming (SSE);
- tabelas `ConversaChatbot` e `MensagemChatbot` (histórico, 👍/👎, tokens gastos, ferramentas usadas);
- política de limite própria.

**Frontend web:** um botão flutuante "Ajuda" em todas as telas do aluno, que abre o chat. Respostas aparecem aos poucos, com botões "Ir para…" que levam à tela certa.

**Mobile:** o mesmo chat, numa aba ou no botão de ajuda. Se o streaming for limitado no React Native, começar recebendo a resposta inteira.

**Admin (fase 2):** perguntas mais frequentes, perguntas sem resposta (para melhorar a base) e, se houver, as conversas encaminhadas ao suporte humano.

## 8. Fases sugeridas

| Fase | Entrega | Tamanho |
|---|---|---|
| 1 | Backend: base de conhecimento, ferramentas de leitura, laço com ferramentas, streaming, limites (30/h, 100/dia), histórico com expurgo após 90 dias, **chamados de suporte** | Médio |
| 2 | Web: chat do aluno (botão "Ajuda", "Falar com o suporte") e tela de **Chamados** do Admin, com resposta que vira notificação ao aluno | Médio |
| 3 | Mobile: chat do aluno | Pequeno/médio |
| 4 | Painel do Admin: dúvidas frequentes e sem resposta; **base de conhecimento editável pelo Admin** (tópicos, histórico de versões, voltar versão) e **sugestões vindas dos chamados respondidos** (o Admin aprova antes de entrar; o assistente nunca aprende sozinho) | Médio |

## 9. Decisões que dependem do usuário

1. ~~Qual modelo usar~~ **DECIDIDO (2026-11-14): Claude Haiku 5.5 (`claude-haiku-5-5`)**, numa configuração própria do chat, separada de `IA:Modelo`, que continua servindo a geração de quizzes. O Haiku 5.5 **não tem troca automática de modelo em caso de recusa** (`fallbacks`): o chat não envia esse parâmetro e trata `stop_reason = refusal` com uma mensagem amigável. Conferir nos registros de uso (`cache_read_input_tokens`) que o cache da base de conhecimento está sendo aproveitado.
2. **DECIDIDO:** limite de **30 perguntas por hora e 100 por dia** por aluno (política de rate limit própria do chat). Ao atingir o limite, o chat avisa quando volta a funcionar.
3. **DECIDIDO:** botão **"Falar com o suporte"** já na primeira versão:
   - o aluno envia a dúvida com o resumo da conversa, o que cria um **chamado**;
   - todos os Admins recebem uma notificação e veem a lista de chamados;
   - o Admin responde, e a resposta chega ao aluno como notificação.
4. **DECIDIDO:** conversas guardadas por **90 dias** e apagadas automaticamente depois. Chamados ficam enquanto estiverem em aberto. O aluno é avisado de que as conversas são registradas para melhorar o atendimento.
5. **DECIDIDO:** **web primeiro, mobile na fase seguinte**, reaproveitando o mesmo backend.
6. **DECIDIDO:** **só alunos logados** na primeira versão. Visitantes da home ficam para uma fase futura.

### Decisões complementares (2026-11-14, recomendações aceitas pelo usuário)

7. **Base de conhecimento:** o agente de arquitetura escreve o primeiro rascunho a partir das regras do código e das decisões já tomadas (fluxo de venda, permissões, certificados, avaliações). O usuário **revisa e aprova** antes de a base entrar no chat. Arquivo previsto: `docs/chatbot/BASE-conhecimento-suporte.md`.
8. **Quem responde os chamados:**
   - **conta, pagamento e plataforma:** Admin;
   - **assunto ligado a um curso** (avaliação, material, progresso): o **Coordenador do curso**.

   O Admin vê todos os chamados. O chat pergunta ou deduz se o chamado é sobre um curso específico.
9. **Freio de custo:**
   - o Admin pode **ligar e desligar o chat** numa configuração;
   - **teto mensal de gasto** (valor configurável, sugestão inicial de US$ 20). Ao atingir, o chat pausa com uma mensagem amigável e o Admin é notificado;
   - registrar os tokens gastos por mensagem para calcular o gasto.
10. **Nome e tom:** um nome simples (sugestão: "Assistente CodeRyse"), tom amigável e direto, tratando o aluno por "você", sempre em português.
11. **Sem ações na v1:** o chat só explica e mostra o botão da tela certa ("Ir para…"). Não compra, não cancela, não emite certificado. Ações pelo chat ficam para uma fase futura.
12. **Teste antes de liberar:** o agente de arquitetura monta um conjunto de 20 a 30 perguntas reais de aluno, com a resposta esperada e as consultas que o chat deve fazer (`docs/chatbot/TESTE-perguntas-suporte.md`). O chat só é liberado depois de passar nesse conjunto.

### Posicionamento na interface (APROVADO pelo usuário em 2026-11-14)

Imagens nesta pasta:
- `chat-parte1-aluno-computador.png`;
- `chat-parte2-aluno-celular.png`;
- `chat-parte3-chamados-admin.png`.

Os números amarelos são só explicação.

- **Aluno no computador:**
  - botão "?" no canto inferior direito, em todas as telas do aluno;
  - painel lateral à direita (≈ 400px), com as abas **Conversa** e **Meus chamados**, botões "Ir para…" nas respostas e "Falar com o suporte" no rodapé;
  - os avisos (toasts) sobem para não ficarem atrás do botão.
- **Atalhos contextuais:** "Por quê? Pergunte ao assistente" na avaliação bloqueada, no certificado com pendência e no pagamento pendente. Abre o chat já com a pergunta.
- **Aluno no celular (site estreito):** botão acima da barra de navegação inferior; chat em tela cheia.
- **Admin e Coordenador:**
  - item **"Chamados"** no menu, com o contador de chamados abertos;
  - lista com quem enviou, o assunto e quando, nas abas Abertos e Respondidos;
  - detalhe com o **resumo da conversa com o assistente** e um campo de resposta;
  - a resposta vira notificação ao aluno e fica em "Meus chamados".

### Alimentação da base de conhecimento (DECIDIDO em 2026-11-14)

- **v1:** a base é o arquivo `docs/chatbot/BASE-conhecimento-suporte.md`, carregado pelo backend. Mudar uma regra exige editar o arquivo e publicar.
- **Fase 4:** o Admin edita a base pela plataforma, por tópicos, com histórico de versões. O painel sugere novos itens a partir dos chamados respondidos e das perguntas sem resposta. **Nada entra sem a aprovação do Admin**, e o assistente nunca aprende sozinho com as conversas.

### Chamados como conversa (DECIDIDO em 2026-11-14)

- O chamado é uma **troca de mensagens** entre o aluno e a equipe (Admin ou Coordenador do curso), até alguém marcar como **resolvido**.
- O aluno pode **reabrir** um chamado resolvido em até 7 dias, se o problema voltar.
- Cada nova mensagem notifica a outra parte pelo sino.
- Status do chamado: Aberto, Respondido (aguardando o aluno), Resolvido.
- **Não é chat ao vivo:** é por mensagens, com o prazo de resposta da equipe de até 2 dias úteis.
- Na tela de Chamados do Admin e do Coordenador, o detalhe mostra o histórico da conversa, em vez de uma resposta única.
