# Fase 3 de 4 — Mobile: chat do aluno e Meus chamados (React Native)

> Parte do plano em `docs/chatbot/fases/LEIA-ME-ordem.md`. **Depende das fases 1 e 2 aplicadas e do chat validado no web.** Só `mobile/`.

## Contexto

O Assistente CodeRyse já funciona no web (fase 2). Esta fase leva o chat do aluno e "Meus chamados" para o app mobile, que é **só do perfil Aluno**. A tela de Chamados da equipe continua só no web.

**Imagem de referência:** `docs/chatbot/chat-parte2-aluno-celular.png`, com o botão "?" acima da barra de abas e o chat em tela cheia. Os números amarelos são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- Navegação do aluno: `mobile/src/screens/aluno/AlunoTabsNavigator.jsx` (`createBottomTabNavigator`, rotas em `ROUTES`).
- Telas existentes: `NotificacoesScreen.jsx`, `ConteudosScreen.jsx`, `AvaliacoesScreen.jsx`, `CertificadosScreen.jsx` e outras, em `mobile/src/screens/aluno/`.
- Lógica compartilhada com o web: `shared/` (por exemplo `apiClient.js`, `session.js`, `catalogoVisibilidade.js`).
- **Streaming:** a rota `POST /Chatbot/mensagens` aceita `?stream=false` e devolve JSON com a resposta inteira (fase 1). No React Native, **começar com `stream=false`** e mostrar "digitando…" até a resposta chegar. O streaming no mobile fica para depois, se valer a pena.

## Tarefa

1. **Botão "?"** flutuante nas telas do aluno, **acima da barra de abas de baixo**, sem cobrir os ícones e respeitando a área segura do aparelho.
2. **Tela do chat em tela cheia** (modal ou rota própria):
   - cabeçalho "Assistente CodeRyse" com ✕;
   - abas **Conversa** e **Meus chamados**;
   - o mesmo comportamento do web: boas-vindas e aviso de 90 dias na primeira vez, contexto da tela atual, ações "Ir para…" que navegam para a tela certa do app, 👍/👎, estados de erro, de limite e de chat desligado, e "Falar com o suporte".
3. **Meus chamados:**
   - lista, conversa, responder e "Reabrir" até 7 dias;
   - a notificação de chamado (`ChamadoNovaMensagem`) em `NotificacoesScreen` abre o chamado.
4. **Atalhos "Por quê?"** onde já houver as mesmas situações no app: avaliação bloqueada, certificado com pendência e pagamento pendente.
5. **Mapear as rotas** das ações "Ir para…", que chegam como caminhos do web, para as rotas do app. As ações sem tela equivalente no app viram um texto de orientação, sem botão.

**Não alterar:** o backend (salvo correção combinada antes), o web e as outras telas do app além dos pontos citados.

## Critérios de aceite

- No celular, o botão fica acima da barra de abas e o chat abre em tela cheia, conforme a imagem.
- Perguntas dos grupos A, B e D de `../TESTE-perguntas-suporte.md` respondem no app como no web.
- As ações "Ir para…" levam à tela certa do app.
- "Falar com o suporte", "Meus chamados", responder e reabrir funcionam. A notificação abre o chamado.
- `npm test` e `npm run lint` do mobile sem erros novos. Os erros de acessibilidade que já existiam não contam.
