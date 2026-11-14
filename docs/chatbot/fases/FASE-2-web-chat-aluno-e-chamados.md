# Fase 2 de 4 — Web: chat do aluno, Meus chamados e tela de Chamados (Admin e Coordenador)

> Parte do plano em `docs/chatbot/fases/LEIA-ME-ordem.md`. **Depende da fase 1 aplicada** (rotas `/Chatbot/*` e `/Chamados/*`). Só frontend web (`frontend/`).

## Contexto

O backend do Assistente CodeRyse e dos chamados está pronto (fase 1). Esta fase coloca o chat na interface do aluno e a tela de Chamados para a equipe, conforme as **imagens aprovadas pelo usuário** em `docs/chatbot/` (os números amarelos e o quadro lateral são só explicação):
- `chat-parte1-aluno-computador.png`;
- `chat-parte2-aluno-celular.png`;
- `chat-parte3-chamados-admin.png`.

Leia também `../ANALISE-viabilidade-chatbot.md`, seções "Posicionamento na interface" e "Chamados como conversa".

## O que o agente de arquitetura já verificou (não repetir)

- Chamadas à API: `frontend/src/lib/api.js` (`apiRequest`, com token `Bearer`). **Para o streaming (SSE)**, usar `fetch` com `ReadableStream` e o mesmo cabeçalho de autorização, porque `apiRequest` não lê streaming.
- Menus por perfil: `frontend/src/data/appConfig.js` (`APP_SECTIONS`, com `roles` por item). A tela do perfil é escolhida em `pages/WorkspaceScreen.jsx`.
- Avisos (toasts): `components/Toast.jsx`, posicionados em `styles/layout.css` ≈ linha 1790 (`position: fixed; bottom e right: var(--espaco-xl)`), no **mesmo canto** do botão do chat.
- Notificações: o sino em `BarraTopo.jsx` já mostra qualquer tipo genericamente.
- Telas com bloqueio, onde entram os atalhos "Por quê? Pergunte ao assistente":
  - avaliação bloqueada: card de avaliação em `SecoesAluno.jsx`, que usa `disponibilidade.mensagem`;
  - certificado com pendência: `SecaoCertificados.jsx`;
  - pagamento pendente: card de curso com "Concluir compra" em `SecaoMatriculas.jsx` / `CartaoCursoMatricula`.
- Componentes reaproveitáveis: `Modal`, `Botao`, `Insignia`, `.abas-matriculas`.

## Tarefa

### 1. Botão e painel do chat (só Aluno)
1. **Botão redondo "?"** fixo no canto inferior direito, em todas as telas do aluno, com `aria-label="Abrir Assistente CodeRyse"`. **Subir os toasts** para não ficarem atrás dele, só quando o botão existir.
2. **Painel lateral à direita** (≈ 400px, por cima do conteúdo, sem sair da página, fecha no ✕ e no Esc):
   - **Cabeçalho:** "Assistente CodeRyse" e as abas **Conversa** e **Meus chamados**.
   - **Conversa:**
     - mensagens do aluno à direita e do assistente à esquerda;
     - texto aparecendo aos poucos (SSE da fase 1);
     - as **ações** viram botões "Ir para…" que navegam pela rota do app;
     - 👍/👎 em cada resposta;
     - campo de pergunta com o limite de caracteres e o botão enviar;
     - no rodapé, "Não resolveu? **Falar com o suporte**".
   - Ao abrir, carregar a conversa atual (`GET /Chatbot/conversas/atual`). Na primeira vez, mostrar uma mensagem de boas-vindas curta e o aviso "As conversas são registradas por 90 dias para melhorar o atendimento".
   - Enviar o **contexto da tela** em cada pergunta: tela atual e curso aberto, se houver.
   - **Estados:**
     - "digitando…" enquanto chega a resposta;
     - erro com "Tentar de novo";
     - limite atingido: mostra quando volta;
     - chat desligado ou teto atingido: mensagem amigável e "Falar com o suporte".
3. **Celular (tela estreita, ≤ ~768px):**
   - o botão fica **acima da barra de navegação de baixo**;
   - o painel abre em **tela cheia**, como na imagem da parte 2.

### 2. Falar com o suporte e Meus chamados (Aluno)
1. **"Falar com o suporte"** abre um formulário curto:
   - texto da dúvida, já preenchido com a última pergunta;
   - curso, preenchido com o curso aberto, se houver.

   O formulário chama `POST /Chamados` e confirma: "Chamado aberto. A equipe responde em até 2 dias úteis, pelo sino de notificações."
2. **Aba "Meus chamados":**
   - lista com assunto, curso, status (Aberto, Respondido ou Resolvido) e data;
   - ao abrir, a **conversa do chamado**, com campo para responder e o botão **"Reabrir"** nos resolvidos há até 7 dias;
   - a notificação de chamado leva direto para ele.

### 3. Atalhos "Por quê? Pergunte ao assistente"
Link discreto ao lado de:
- avaliação bloqueada;
- certificado com pendência;
- pagamento pendente.

O link abre o painel com a pergunta já pronta e o contexto, por exemplo "Por que não consigo fazer a Prova final de Desenvolvimento Web?", e já envia.

### 4. Tela de Chamados (Admin e Coordenador)
1. Item **"Chamados"** no menu (`APP_SECTIONS`, `roles: ["Admin", "Coordenador"]`), com o **contador de abertos**.
2. Tela conforme a parte 3:
   - lista à esquerda com as abas **Abertos | Respondidos | Resolvidos**, mostrando quem enviou, o assunto (curso, pagamento ou plataforma) e quando;
   - detalhe à direita com o **resumo da conversa com o assistente**, a **conversa do chamado**, o campo de resposta e os botões **"Responder"** e **"Marcar como resolvido"**;
   - o Coordenador vê só os chamados dos cursos dele; o Admin vê todos e o destino de cada um ("Encaminhado ao coordenador do curso · Admin acompanha").
3. **Só para o Admin, no topo da tela de Chamados:** um cartão pequeno **"Assistente"** com:
   - liga e desliga;
   - teto mensal (US$);
   - gasto e perguntas do mês (`/Chatbot/configuracao` e `/Chatbot/uso`).

**Não alterar:** as telas existentes além dos pontos citados (atalhos e toasts), o fluxo de compra, avaliações e certificados.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, comparando com as imagens:

- **Aluno, no computador:**
  - o botão "?" aparece em todas as telas do aluno, com os toasts acima dele;
  - o painel abre à direita e responde em streaming, com botões "Ir para…" que funcionam;
  - 👍/👎 grava.
- **Atalhos:** na avaliação bloqueada, no certificado com pendência e no pagamento pendente, "Por quê?" abre o chat já com a resposta.
- **Falar com o suporte:**
  - cria o chamado; a equipe certa recebe a notificação;
  - a resposta chega ao aluno pelo sino e aparece em "Meus chamados";
  - o aluno responde de volta;
  - "Reabrir" só aparece até 7 dias.
- **Admin e Coordenador:**
  - contador e lista certos por perfil;
  - responder muda o status;
  - resolver funciona.
- **Admin:** desligar o chat mostra a mensagem amigável ao aluno; o teto e o gasto aparecem.
- **Celular (≈ 400px):** o botão fica acima da barra de baixo e o chat abre em tela cheia.
- **Outros perfis:** Professor não vê o botão nem a tela de Chamados.
- Testes (vitest): o painel (abrir, enviar, receber, ações), "Meus chamados", a tela de Chamados por perfil e os atalhos. `npm run lint` e `npm test` sem erros novos.
