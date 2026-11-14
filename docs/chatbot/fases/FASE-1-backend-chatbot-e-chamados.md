# Fase 1 de 4 — Backend do Assistente CodeRyse e dos Chamados de suporte

> Parte do plano em `docs/chatbot/fases/LEIA-ME-ordem.md`. Esta fase é **só backend** (ASP.NET, raiz do repositório). Telas na fase 2.

## Contexto

O CodeRyse vai ganhar um **assistente de suporte** para o aluno. Ele responde dúvidas de uso da plataforma e da **situação do próprio aluno**, como certificado, avaliação bloqueada, pagamento e progresso. Quando não resolver, o aluno abre um **chamado** com a equipe.

Leia antes de começar, nesta pasta e na pasta acima:
- `../ANALISE-viabilidade-chatbot.md`: decisões fechadas com o usuário (seções 9 e seguintes);
- `../BASE-conhecimento-suporte.md`: base de conhecimento **aprovada**, que vai como texto fixo para o modelo;
- `../TESTE-perguntas-suporte.md`: 27 casos de teste com resposta esperada; o critério de liberação está no arquivo;
- `../chat-parte1-aluno-computador.png`, `../chat-parte3-chamados-admin.png`: telas aprovadas, para entender o que o backend precisa servir.

## Decisões do usuário (não reabrir)

- **Modelo:** `claude-haiku-5-5`, em configuração **própria** do chat (`IA:Chat:Modelo`). `IA:Modelo` continua servindo a geração de quizzes.
- **Escopo:** só suporte da plataforma e dados do próprio aluno. Não explica conteúdo de aula, não responde avaliação e **não executa ações**: só explica e devolve links "Ir para…".
- **Só alunos logados.** Visitantes ficam para o futuro.
- **Limite:** 30 perguntas por hora e 100 por dia, por aluno.
- **Chamados:**
  - são uma conversa até resolver;
  - status Aberto, Respondido (aguardando o aluno) e Resolvido;
  - o aluno reabre em até 7 dias;
  - prazo da equipe de até 2 dias úteis, informado pelo texto da base;
  - **rota:** conta, pagamento e plataforma vão para os **Admins**; assunto de um curso vai para o **Coordenador do curso**. O Admin vê todos.
- **Guarda:** conversas do chat por **90 dias**, com expurgo automático. Chamados ficam enquanto abertos e, depois de resolvidos, seguem a mesma regra de 90 dias contados da resolução.
- **Freio de custo:** o Admin liga e desliga o chat; **teto mensal de gasto** configurável (sugestão inicial de US$ 20). Ao atingir, o chat pausa com uma mensagem amigável e os Admins são notificados uma vez.
- **Nome e tom:** "Assistente CodeRyse", amigável, tratando o aluno por "você", em português.

## O que o agente de arquitetura já verificou (não repetir)

**Integração com a IA:**
- `Services/AvaliacaoIAService.cs` chama a Messages API por **HTTP direto** (`IHttpClientFactory`, cliente nomeado `"Anthropic"`, `BaseAddress https://api.anthropic.com/`, `Timeout` de 180 s, em `Program.cs` ≈ linhas 96–105).
- Lê `IA:ApiKey`, `IA:Modelo` e `IA:Esforco`, e envia os cabeçalhos `x-api-key` e `anthropic-version`.
- **O projeto escolheu HTTP direto em vez de SDK** (comentário em `Program.cs`, "decisão 3 da proposta aprovada"). Seguir esse padrão no chat. Se o agente achar que o SDK oficial em C# simplifica muito o streaming com ferramentas, **propor no passo 0 e esperar a decisão do usuário**, sem trocar por conta própria.

**Dados do aluno que já existem:**
- `ProgressoAlunoService.ObterSnapshotAsync(alunoId)` e `ObterLiberacaoAvaliacoesAsync(matriculaId)`, que dizem quais avaliações estão liberadas e por quê;
- as pendências do certificado em `CertificadoService` (usadas em `/Certificados/status`);
- os pagamentos do aluno (`PagamentoService`, `/Pagamentos/aluno`);
- as matrículas;
- a regra de acesso `AcessoAcademicoService.MatriculaTemAcessoLiberado`.

**Notificações:**
- `INotificacaoService.NotificarAsync(usuarioId, titulo, mensagem, tipo, link)` e `NotificarVariosAsync(...)`;
- enum `TipoNotificacao` em `Models/Notificacao.cs`, cujo último valor é `CursoEncerrado = 6`.

**Rate limit:** política `ia-geracao` em `Program.cs` ≈ linha 225, por `usuarioId`, como modelo.

## Tarefa

### 0. Antes de alterar: viabilidade
1. Rodar `dotnet test` e guardar como linha de base.
2. Confirmar os serviços acima e o formato do que eles devolvem.
3. Validar o desenho de streaming com ferramentas por HTTP direto (SSE da Messages API). Se for inviável ou muito arriscado, **parar e relatar** com a alternativa.
4. Listar as tabelas novas e as migrations previstas antes de criar.

### 1. Configuração
- `IA:Chat:Modelo` (padrão `claude-haiku-5-5`), `IA:Chat:Esforco` (padrão `low`, para respostas rápidas; ajustável pelo resultado do teste) e `IA:Chat:MaxTokens` (≈ 1024).
- Os preços por milhão de tokens também vão em configuração, para o cálculo de gasto: entrada, saída, leitura e escrita de cache.
- **Não** enviar `fallbacks` (o Haiku 5.5 não tem troca automática de modelo em caso de recusa) **nem** `temperature`, `top_p` ou `top_k`.
- Tratar `stop_reason = "refusal"` com a mensagem "Não consigo ajudar com isso por aqui. Se quiser, fale com o suporte.", oferecendo o chamado.

### 2. Montagem do pedido ao modelo
- **Prompt de sistema**, na ordem e **sem nada que mude a cada pedido** (sem data e hora, sem nome do aluno):
  1. papel e regras de escopo;
  2. formato das respostas;
  3. a base de conhecimento lida de `docs/chatbot/BASE-conhecimento-suporte.md`, carregada uma vez por processo e recarregada se o arquivo mudar.

  Marcar `cache_control: {type: "ephemeral"}` no último bloco do sistema. As ferramentas, que vêm antes do sistema no pedido, também precisam ser fixas e em ordem fixa.
- **Contexto da tela** (`{ tela, cursoId?, cursoTitulo? }`, enviado pelo frontend) vai **no texto da mensagem do usuário**, como prefixo curto, depois do ponto de cache.
- **Histórico:** as últimas 10 mensagens da conversa atual. O chat não lembra de conversas anteriores.
- **Formato das ações:** o modelo devolve no máximo 2 ações no fim da resposta, num formato fixo e simples de extrair, por exemplo `[[ir:/app/certificados|Ir para Certificados]]`. O backend **valida o caminho contra uma lista de rotas permitidas do app do aluno**, remove as inválidas e envia as ações separadas do texto.
- **Sem resposta:** quando o modelo não achar base para responder, ele inclui o marcador `[[sem_resposta]]`, que o backend remove e grava na mensagem, para o painel da fase 4.

### 3. Ferramentas (só leitura, sempre do aluno logado)
Definir com `strict: true` e `input_schema` com `additionalProperties: false`. Usar `tool_choice` `auto`, porque os modos `any`/`tool` não são aceitos nos modelos atuais.

| Ferramenta | Entrada | Devolve |
|---|---|---|
| `meus_cursos` | — | Cursos do aluno: id, título, modelo, situação da matrícula, % de progresso, pagamento pendente ou não |
| `progresso_do_curso` | `cursoId` | Módulos (liberado ou bloqueado), conteúdos concluídos e pendentes, % |
| `situacao_avaliacoes` | `cursoId` | Avaliações: liberada ou bloqueada e o motivo (o que falta), tentativas usadas e restantes, prazo, última nota. **Sem enunciado nem gabarito.** |
| `situacao_certificado` | `cursoId` | Se pode emitir; se não, a lista de pendências (mensagens de `CertificadoService`) |
| `meus_pagamentos` | — | Pagamentos: curso, valor, status, data da compra e data de pagamento |
| `buscar_no_catalogo` | `termo` | Até 5 cursos visíveis no catálogo (mesma regra `shared/catalogoVisibilidade.js`, reimplementada no backend), com título, modelo e preço |

- **O id do aluno vem sempre do token**, nunca da entrada da ferramenta.
- Todo `cursoId` é validado contra as matrículas do aluno. Se não for dele, devolver `tool_result` com `is_error: true` e a mensagem "curso não encontrado nas matrículas do aluno".
- Mandar ao modelo **só os campos necessários**: nada de CPF, e-mail ou endereço.
- No máximo 4 rodadas de ferramenta por pergunta. Executar em paralelo as chamadas de uma mesma rodada e devolver todos os `tool_result` numa única mensagem.

### 4. Rotas do chat (só Aluno)
- `POST /Chatbot/mensagens` com `{ conversaId?, texto, contexto }` e a política de limite `chatbot` (30 por hora **e** 100 por dia, encadeadas).
  - **Resposta em streaming (SSE)**, com eventos `texto` (pedaços), `acoes`, `fim` (com `conversaId` e `mensagemId`) e `erro`.
  - Aceitar também `?stream=false`, que devolve JSON com a resposta inteira, para o mobile.
  - Sem conversa, criar uma nova.
  - Validar o tamanho máximo da pergunta (≈ 1.000 caracteres).
- `GET /Chatbot/conversas/atual`: a conversa mais recente, com as mensagens, para reabrir o painel.
- `POST /Chatbot/mensagens/{id}/feedback` com `{ util: true|false }`.
- Se o chat estiver **desligado** ou com o **teto de gasto atingido**, responder com um código e uma mensagem claros, que o frontend mostra no painel.

### 5. Dados e guarda
- Tabelas, com nomes sugeridos que o agente pode ajustar ao padrão do projeto:
  - `ConversaChatbot` (aluno, datas);
  - `MensagemChatbot`: papel, texto, ações, ferramentas usadas, `SemResposta`, tokens de entrada, saída, leitura e escrita de cache, custo calculado e feedback;
  - `ChamadoSuporte`: aluno, curso opcional, destino (Admin ou Coordenador), status, resumo, datas e `ResolvidoEm`;
  - `MensagemChamado`: chamado, autor, texto, data;
  - `ConfiguracaoChatbot`: ativo, teto mensal e data do último aviso de teto.
- **Expurgo diário** (serviço em segundo plano): apagar conversas com mais de 90 dias e chamados resolvidos há mais de 90 dias.
- **Gasto do mês:** soma do custo das mensagens do mês. Ao passar do teto, pausar o chat e notificar os Admins uma vez por mês.

### 6. Rotas dos chamados
- **Aluno:**
  - `POST /Chamados` com `{ conversaId?, cursoId?, texto }`. O destino é Coordenador do curso se houver `cursoId` e o curso tiver coordenador; senão, Admin.
  - **Resumo da conversa:** gerado por uma chamada curta ao modelo do chat, com fallback para as últimas mensagens se a IA falhar.
  - Notificar os destinatários.
- **Aluno:** `GET /Chamados/meus` e `GET /Chamados/{id}` (só os próprios).
- **Admin** vê todos; **Coordenador** vê só os dos cursos que coordena:
  - `GET /Chamados?status=` e `GET /Chamados/{id}`;
  - `POST /Chamados/{id}/mensagens`, que muda o status para Respondido e notifica o aluno;
  - `POST /Chamados/{id}/resolver`.
- **Aluno dono:**
  - `POST /Chamados/{id}/mensagens`, que volta o status para Aberto e notifica a equipe;
  - `POST /Chamados/{id}/reabrir`, só até 7 dias depois de `ResolvidoEm`.
- **Admin:** `GET /Chatbot/configuracao`, `PUT /Chatbot/configuracao` (ativo e teto) e `GET /Chatbot/uso` (gasto do mês e quantidade de perguntas).
- Novos valores em `TipoNotificacao`: `ChamadoNovo = 7` e `ChamadoNovaMensagem = 8`. Os links das notificações apontam para a tela do chamado.

### 7. Testes (xUnit)
- **Ferramentas:**
  - devolvem só dados do aluno do token;
  - `cursoId` de outro aluno dá erro;
  - os campos sensíveis não saem.
- **Montagem do pedido:**
  - ferramentas e sistema iguais entre pedidos (para o cache);
  - contexto da tela depois do ponto de cache;
  - sem `fallbacks` nem `temperature`.
- **Ações:** links fora da lista permitida são removidos; o marcador `[[sem_resposta]]` é gravado.
- **Limites:** 31ª pergunta na hora e 101ª no dia são bloqueadas; o chat desligado e o teto atingido devolvem o código certo.
- **Chamados:**
  - a rota vai para o Coordenador ou para o Admin;
  - as permissões de leitura e resposta valem por perfil;
  - os status mudam como descrito;
  - reabrir dentro e fora dos 7 dias;
  - as notificações são enviadas.
- **Expurgo:** apaga o que tem mais de 90 dias e mantém chamados abertos.
- A chamada à IA fica atrás de uma interface, para os testes não chamarem a API de verdade.

## Critérios de aceite

- `dotnet test` sem erros novos em relação à linha de base.
- Com uma chave de API configurada no ambiente local, rodar manualmente os 27 casos de `../TESTE-perguntas-suporte.md` contra as rotas, com um aluno de teste montado como descrito no arquivo, e registrar a rodada 1 na tabela do fim do arquivo. Meta: 100% nos grupos D e E e ≥ 90% no total. Se não bater, ajustar o prompt de sistema e rodar de novo. **Não mudar a base de conhecimento sem avisar o agente de arquitetura**, porque ela foi aprovada pelo usuário.
- Conferir nos tokens gravados que, a partir da segunda pergunta, há leitura de cache (`cache_read_input_tokens > 0`).
- Nenhum dado de outro aluno aparece em nenhuma resposta ou ferramenta.
