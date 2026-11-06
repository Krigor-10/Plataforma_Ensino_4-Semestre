# Prompt — Hierarquia da tela de Conteúdos do professor, rodada 3 (web)

## Contexto

Continuação de `docs/bugs/PROMPT-agente-conteudos-professor-hierarquia-rodada2.md`, aplicado e revisado pelo usuário no navegador. Esta rodada corrige quatro defeitos visuais em `TrilhaConteudosProfessor` (`frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`) e `frontend/src/styles/workspace.css`. Não muda regra, contagem nem rota.

**Antes de começar:** as rodadas anteriores ainda não foram commitadas. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-05.

**Escopo do CSS:** tudo sob `.tela-conteudos` e/ou `.conteudos-modulo--editavel`, como nas rodadas anteriores.

## 1. Remover a linha tracejada branca no fim do último módulo (bug)

O usuário pediu a remoção dessa linha. Ela é grossa, branca e aparece só no último módulo da lista.

**Causa:** `.atividades-curso__lista-modulos > .conteudos-modulo:last-child` (linha 5366) aplica `border-bottom: none`, que zera também a largura e a cor configuradas. A rodada 2 removeu a regra que restaurava essa borda no cartão. Depois, `.conteudos-modulo--vazio` (linha 5406) aplica `border-style: dashed`, e a borda inferior volta com os valores padrão do navegador: cerca de 3px, na cor do texto.

O mesmo problema tira a borda inferior do último módulo quando ele não está vazio.

- Em `.tela-conteudos`, restaurar para o último módulo a borda inferior de `1px` em `--cor-borda`. Quando aberto, usar `--cor-borda-forte`.
- Se o último módulo estiver vazio, a borda inferior fica igual às outras laterais dele: fina, tracejada e em `--cor-borda`.
- Resultado esperado: o último módulo fica idêntico aos demais, com ou sem conteúdo.

## 2. Menu "Adicionar" cortado e cobrindo o quiz (bug)

**Causa:** `.menu-contexto__lista` é alinhado por `right: 0` e tem `min-width: 175px`. O botão "Adicionar" fica na borda esquerda, então o menu cresce para a esquerda e é cortado pelo `overflow: hidden` do `motion.div` do módulo. No print, só aparece o final da palavra "Conteúdo". Como ele também abre para cima, cobre o último quiz.

- Em `.tela-conteudos .atividades-curso__adicionar-grupo .menu-contexto__lista`: `left: 0; right: auto`.
- `overflow` do `motion.div` do módulo (linhas 1181–1188): manter `hidden` só durante a animação e passar para `visible` no fim. Sugestão com framer-motion: `overflow: "hidden"` em `initial` e `exit`, `transitionEnd: { overflow: "visible" }` em `animate`, sem o `style` fixo.
- Com isso, "Adicionar" abre **para baixo**: retirar o seletor da linha 4292 da regra que abre para cima.
- Exceção: no último módulo da lista, continua abrindo para cima, para não sair da área da página.
- Fechar o módulo deve continuar animado, sem salto. "Falta publicar" deve continuar rolando até o rascunho.
- Conferir se o menu aberto fica por cima do módulo seguinte.

## 3. Faixas sem cantos e sem frestas

Na rodada 2, o fundo `--cor-fundo` foi aplicado na linha, e não no cartão. Por isso aparecem frestas com o gradiente da página, e as linhas parecem cartões soltos.

- Aplicar `background: var(--cor-fundo)` em `.tela-conteudos .conteudos-modulo--editavel`. O módulo vazio continua sem fundo.
- `.tela-conteudos .atividades-curso__linha`: `border-radius: 0`. A linha herda `--raio-md` da regra base.
- Tirar o `margin-top: 0.3rem` de `.tela-conteudos .atividades-curso__quizzes` e o `margin-top` do rodapé `.atividades-curso__adicionar-grupo`.
- Conferir os cantos inferiores do cartão, inclusive quando o último bloco for "Quizzes do módulo" e não o rodapé.

## 4. Guia e separadores do quiz vinculado

O item 8 da rodada 2 ficou deslocado: o `margin-left` da guia ignora o `padding` da linha.

- Guia no centro do ícone do conteúdo pai: `margin-left: calc(var(--espaco-md) + var(--coluna-icone-conteudo) / 2)`.
- Ícone do quiz na coluna de texto do pai: `padding-left: calc(var(--coluna-icone-conteudo) / 2 - 2px)`, descontando a guia de 2px.
- Em largura de celular, conferir se esse recuo não aperta o título do quiz.
- Separadores: a última linha do quiz vinculado não tem separador próprio. O separador de ponta a ponta fica no fim do conjunto conteúdo + quizzes, para não haver linha partida nem dupla.

## Fora do escopo

Continua fora tudo o que estava fora das rodadas anteriores. Os textos "APIs e Integracao" e "teste conteudo" vêm dos dados cadastrados. Não alterar por código.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No navegador, em modo demo (`VITE_DEMO_MODE=true`, conta `professor@demo.edtech`), conferir:
  - último módulo vazio e último módulo com conteúdo, abertos e fechados, com a borda igual à dos demais;
  - menu "Adicionar" no primeiro módulo e no último, inteiro, sem corte e por teclado;
  - menu ⋮ do último item de cada módulo;
  - módulo abrindo e fechando sem salto;
  - conteúdo com quiz vinculado, seguido de outro conteúdo, e módulo sem "Quizzes do módulo";
  - larguras de desktop e de celular;
  - tema escuro, claro e alto contraste;
  - telas do aluno, Módulos, Avaliações e "Visualizar como aluno" sem mudança.

## Entrega

No resumo final, informar o que mudou em cada item e enviar prints do fim da lista de módulos e do menu "Adicionar" aberto.
