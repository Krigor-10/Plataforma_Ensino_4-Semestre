# Redesign mobile — Rodada 2: menu lateral, "Antes de começar" e ajustes

Continuação do redesign já aplicado nos commits 24b30ab…ff66f35 (veja `PROMPT-agente-mobile.md`, mesmos tokens e as mesmas regras de dados da seção 4). Leia `mobile/CLAUDE.md` e `mobile/AGENTS.md`.

| Imagem | O quê |
|---|---|
| `6_menu_lateral.png` | Menu lateral (☰) |
| `7_antes_de_comecar.png` | Painel "Antes de começar" (fase de confirmar do `QuizModal.jsx`) |

As imagens mostram layout e estilo. **Os dados delas são de exemplo.**

## 1. Menu lateral (`components/MenuLateral.jsx`)

- **Perfil alinhado à esquerda:** avatar 56px com as iniciais sobre gradiente roxo, nome, pílula de contorno "Aluno" e, embaixo, o e-mail do usuário em texto apagado. Divisória fina abaixo.
- **Grupos**, com rótulo de 10–11px em maiúsculas e cor apagada:
  - **CONTA:** "Meu perfil" (`person-outline`)
  - **EXPLORAR:** "Catálogo de cursos" (`storefront-outline`)
- **Itens:** linhas de 48px, raio 12, ícone 20px apagado + texto 15px + chevron à direita (`chevron-forward`).
- **Item ativo:** só destaque o item quando a tela aberta for *exatamente* aquele item (Perfil ou Catálogo). **Bug atual:** com o aluno na aba Início, "Meu perfil" aparece destacado. Veja `rotaAtivaChave` em `AlunoWorkspace.jsx` (`onRotaAtivaMudou`): ao voltar para as abas, a rota ativa do menu precisa ser limpa ou atualizada.
- **Rodapé:** divisória, "Sair" em vermelho (`cores.erro`, ícone `log-out-outline`), mesma ação de hoje. Embaixo, uma legenda pequena e apagada "CodeRyse Academy · v{versão}", com a versão lida do app (`expo-constants`, `version` do `app.config.js`). Se não quiser adicionar dependência, omita a legenda.
- **Não incluir:** a bolinha verde de "online" no avatar (não existe esse status) nem o título "NAVEGAÇÃO" no topo, que aparecem na imagem.

## 2. "Antes de começar" (`components/QuizModal.jsx`, fase confirmar)

Hoje é um modal centralizado. Passa a ser um **painel que sobe de baixo** (bottom sheet), por cima da tela, com fundo escurecido a ~65%.

- **Estrutura do painel:** superfície `cores.fundoCartao`, cantos de cima com raio 24, borda superior fina roxa a 30%. Alça de arrastar centralizada no topo. Botão X à direita **em cinza** (fechar não é ação de perigo; hoje está vermelho).
- **Cabeçalho:** selo do tipo (PROVA / EXERCÍCIO / QUIZ), título da avaliação (20px, semibold) e, se houver no snapshot, o nome do módulo em texto apagado. Se não houver, omita.
- **Grade 2x2 de blocos:** cada bloco com fundo `#22242e`, raio 12, ícone em círculo tingido, rótulo de 12px apagado e valor de 16px semibold:
  - "Questões": quantidade
  - "Tempo limite": "X min" ou "Sem limite"
  - "Nota máxima": valor
  - "Tentativa": "N de M". Rótulo no **singular**, porque é a tentativa atual. Hoje está "Tentativas".
- **Quiz não gera nota** (regra do usuário): quando o tipo for Quiz, **não mostre o bloco "Nota máxima"** (a grade fica com 3 blocos, ou 2+1). Também não mostre nota no resultado do quiz, se hoje aparecer.
- **Caixa de avisos** (ícone `information-circle-outline` roxo, texto 13px apagado), duas linhas:
  - "Suas respostas ficam salvas neste aparelho enquanto você responde." (é o rascunho local de `quizRascunho.js`)
  - "Ao enviar, você vê o resultado assim que a correção terminar."
  - Não escreva que a nota sai "na hora": o resultado pode vir como "Respostas enviadas" (sem correção ainda).
- **Botões:** "Iniciar avaliação" primário, 48px de altura, ícone de play. Abaixo dele, o botão de texto "Agora não", que fecha o painel, igual ao X.
- **Tentativas esgotadas:** quando não houver mais tentativas, troque a caixa de avisos pela mensagem que já existe ("Você já utilizou todas as tentativas permitidas para esta avaliação.") em tom de aviso, e deixe o botão "Iniciar avaliação" **desativado**.
- Só a fase de confirmar muda. Execução, envio e resultado **não mudam** nesta rodada.

## 3. Ajustes da revisão da Rodada 1

- **Lint:** o redesign introduziu 4 erros novos de `react-native-a11y/has-accessibility-hint`. Acrescente o `accessibilityHint`:
  - `screens/aluno/ConteudosScreen.jsx`: linhas ~362, ~460, ~521
  - `screens/aluno/ProgressoScreen.jsx`: linha ~227
  - Os outros 25 erros de a11y já existiam antes do redesign: **não** precisa corrigir nesta rodada.

## 4. Pronto quando

- Com o aluno numa aba, o menu lateral abre sem item destacado. Abrir Meu perfil e reabrir o menu destaca só "Meu perfil".
- "Antes de começar" abre como painel de baixo. Para quiz, não aparece "Nota máxima". Com tentativas esgotadas, o botão fica desativado e aparece o aviso.
- `npx jest` passando, e `npx expo lint` sem erros nos arquivos alterados por você.
- Teste no Expo em tela pequena (~360px). Ao terminar, liste os arquivos alterados.
