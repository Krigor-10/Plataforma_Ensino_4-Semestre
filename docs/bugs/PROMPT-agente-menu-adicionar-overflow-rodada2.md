# Prompt — Menu "Adicionar" ainda cortado (web)

## Problema

A correção de `docs/bugs/PROMPT-agente-menu-adicionar-modulo-vazio.md` foi aplicada, mas o erro continua. Em `TrilhaConteudosProfessor`, no módulo 04 (último da lista), o menu "Adicionar" abre para cima e aparece cortado pela borda de cima do corpo do módulo: só se vê "Quiz".

Analise e corrija. **Verifique no app real (`http://127.0.0.1:5173`, com o backend local). Não use modo demo.**

## Causa provável

Confirmado na leitura do código, ainda não testado no navegador.

Em `SecaoConteudosProfessor.jsx` (por volta da linha 1204), o `motion.div` do corpo do módulo tem `overflow: "hidden"` em `initial` e `overflow` controlado por estado em `style`. O framer-motion aplica os valores de `initial` **por cima** do `style`: em `framer-motion/dist/es/render/html/use-props.mjs`, `useStyle` faz `Object.assign(style, useInitialMotionValues(props, visualState))`, e esse resultado é memoizado por `visualState`.

Por isso, o `overflow: "visible"` do estado nunca chega ao elemento em módulos abertos por clique. Confirme no navegador o `overflow` calculado antes de alterar.

## Correção esperada

Se a causa se confirmar:

1. Retirar `overflow` de `initial`. Manter em `exit`. O `style` passa a ser a única fonte do `overflow` durante a abertura e depois dela.
2. Revisar a lógica de liberação, que tem três falhas:
   - **Reabrir:** o `Set` nunca é limpo, apesar do comentário no código. Ao reabrir um módulo, ele já começa `visible` e perde o corte da animação. Trocar por algo que volte a `hidden` ao fechar ou trocar de módulo, inclusive quando `irParaPrimeiroRascunho` troca o módulo.
   - **Fechar:** `onAnimationComplete` também dispara no fim de `exit`. Liberar apenas quando a animação concluída for a de abertura.
   - **Módulo aberto ao entrar:** com `AnimatePresence initial={false}`, ele não anima, então `onAnimationComplete` pode não disparar e o `style` ficaria `hidden`. Esse módulo deve começar liberado.
3. Corrigir o comentário do código para refletir o que passou a valer.

Se a causa for outra, corrija a causa real e explique no resumo.

## Verificação

No app real, com um curso que tenha módulos com conteúdo e módulos vazios:

- abrir "Adicionar" no módulo aberto ao entrar, em módulos abertos por clique, em módulo vazio no meio e no último da lista, por mouse e por teclado: menu inteiro, sem cortar e sem deslocar o conteúdo;
- fechar e reabrir um módulo, e conferir que o conteúdo não vaza durante a animação nas duas direções;
- menu ⋮ do último item de cada módulo sem corte;
- "Falta publicar" continua abrindo o módulo certo e movendo o foco;
- `npm run lint` e `npm test` sem erros novos.

## Entrega

Informar a causa confirmada, o `overflow` calculado antes e depois, e enviar prints do menu aberto nos módulos 03 e 04. As alterações anteriores desta tela ainda não foram commitadas: não descarte nada.
