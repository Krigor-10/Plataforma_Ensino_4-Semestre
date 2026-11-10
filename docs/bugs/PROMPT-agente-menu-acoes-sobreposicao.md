# Prompt — Menus ⋮ sobrepostos na tela de Conteúdos do professor (web)

## Problema

Em `TrilhaConteudosProfessor`, ao abrir um menu ⋮ e clicar no ⋮ de outro item, o primeiro continua aberto. Vários menus ficam empilhados, um por cima do outro. O mesmo vale para o menu "Adicionar".

## Causa

Em `frontend/src/components/MenuAcoes.jsx`, o fechamento por clique fora é um listener em `document` na fase de bolha (linha 49). Só que o botão do menu chama `event.stopPropagation()` (linhas 99 e 115), e o `onClick` de `.atividades-curso__acoes` faz o mesmo (`SecaoConteudosProfessor.jsx:1284`).

No React 19, isso interrompe o evento nativo antes de ele chegar ao `document`, e o `fecharAoClicarFora` do menu aberto nunca roda. Por isso, clicar em "Editar" ou nas setas da mesma área também não fecha o menu.

## Correção

- Registrar o `click` de `fecharAoClicarFora` em **fase de captura**: `document.addEventListener("click", fecharAoClicarFora, true)`, e remover com o mesmo `true` na limpeza.
- Não retirar os `stopPropagation`: eles impedem que o clique no menu abra ou feche a prévia da linha.
- A verificação `refLista`/`refBotao` continua igual, para o próprio botão seguir abrindo e fechando o menu.

Depois da correção, no máximo um menu fica aberto por vez. Não é preciso estado global nem mudança de `z-index`.

## Testes

Adicionar em `SecaoConteudosProfessor.test.jsx`:

- com o menu de um item aberto, clicar no ⋮ de outro item fecha o primeiro e abre o segundo: há um só `role="menu"` na tela;
- com um menu aberto, clicar em "Editar" do mesmo item fecha o menu;
- clicar de novo no mesmo ⋮ fecha o menu;
- clicar em uma opção do menu continua executando a ação.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No navegador, em modo demo (`VITE_DEMO_MODE=true`, conta `professor@demo.edtech`), alternar entre ⋮ de conteúdos, ⋮ de quizzes e "Adicionar".
- Teclado continua igual: setas, Enter e Esc, com o foco voltando ao botão no Esc.
- Clicar no ⋮ não abre nem fecha a prévia da linha.

## Antes de começar

As rodadas anteriores desta tela ainda não foram commitadas. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-05.
