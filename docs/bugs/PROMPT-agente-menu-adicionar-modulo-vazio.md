# Prompt — Menu "Adicionar" cortado em módulo vazio (web)

## Problema

O vídeo do usuário mostra, em `TrilhaConteudosProfessor`:

- **Módulo vazio no meio da lista (03):** ao clicar em "Adicionar", o menu aparece cortado. Só se vê "Conteúdo" e o topo de "Quiz". O botão "Adicionar" e o texto "Nenhum conteúdo neste módulo ainda." sobem e somem, e o menu continua assim até ser fechado.
- **Módulo vazio no fim da lista (04):** o menu abre para cima e só aparece a parte de baixo de "Quiz", por cima do texto do módulo vazio.
- **Módulo com conteúdo (01 e 02):** o menu abre inteiro, por cima do módulo seguinte. O defeito não aparece.

## O que já foi conferido

- **Confirmado pelo vídeo:** o corpo do módulo está recortando o menu, e o conteúdo se desloca dentro dele. Isso indica `overflow` diferente de `visible` no `motion.div` (`SecaoConteudosProfessor.jsx:1181`).
- **Provável causa do deslocamento:** `MenuAcoes.jsx` chama `.focus()` no primeiro item ao abrir. Com o item fora da área visível de um elemento recortado, o navegador rola esse elemento.
- **Não confirmado:** por que `transitionEnd: { overflow: "visible" }` não resolve só nos módulos vazios. Não há regra de CSS que explique isso. Não testei no navegador.

## Antes de corrigir

Reproduza e confira no navegador, nos módulos 02, 03 e 04, o `overflow` calculado do corpo do módulo depois da animação. Teste também um módulo com um único item, porque o problema pode estar ligado à altura e não ao módulo estar vazio. Informe no resumo a causa encontrada.

## Correção

1. **Tornar o `overflow` determinístico.** Se a causa for o `transitionEnd`, controlar por estado: `hidden` enquanto o módulo anima e `visible` depois de `onAnimationComplete`. Com isso, o resultado não depende do conteúdo do módulo.
2. **Evitar rolagem pelo foco.** Em `MenuAcoes.jsx`, usar `.focus({ preventScroll: true })` no foco inicial. Em seguida, conferir por teclado: o menu ainda deve ficar visível e navegável pelas setas.
3. **Último módulo:** continua abrindo para cima, agora inteiro e sem cortar.
4. **Módulo vazio com espaço suficiente:** a regra `.tela-conteudos .atividades-curso__adicionar-grupo .menu-contexto__lista` continua valendo, com o menu alinhado à esquerda do botão.

## Ajuste relacionado

"Nenhum conteúdo neste módulo ainda." está colado na borda esquerda do cartão, porque o cartão perdeu o `padding` lateral na rodada 2 e `.texto-vazio` não tem `padding`. Sob `.tela-conteudos .conteudos-modulo--editavel`, usar `padding: var(--espaco-sm) var(--espaco-md)`, alinhando o texto ao botão "Adicionar". Não alterar a classe base, que é compartilhada.

## Testes e verificação

- Teste em `SecaoConteudosProfessor.test.jsx`: em módulo vazio, abrir "Adicionar" mostra "Conteúdo" e "Quiz", e cada opção aciona o fluxo certo.
- `npm run lint` e `npm test` sem erros novos.
- No navegador, abrir "Adicionar" nos módulos 01, 02, 03 e 04, por mouse e por teclado: menu inteiro, sem deslocar o conteúdo.
- Fechar e abrir módulos continua animado, sem salto.
- Menu ⋮ do último item de cada módulo continua sem corte.

## Entrega

Informar a causa confirmada e enviar print do menu aberto nos módulos 03 e 04.

## Antes de começar

As rodadas anteriores desta tela ainda não foram commitadas. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-05.
