# Prompt — Corrigir a linha que liga o conteúdo ao quiz (web)

## Problema

Em `TrilhaConteudosProfessor`, na linha de ligação do quiz vinculado:

1. O trecho horizontal não fica alinhado ao centro do ícone do quiz: passa acima dele.
2. A linha vertical continua descendo depois da curva, mesmo sem outro quiz abaixo.

É só CSS, em `frontend/src/styles/workspace.css`. Não mude a lógica nem o texto da tela. Verifique no app real (`http://127.0.0.1:5173`, com o backend local). Não use modo demo.

**Antes de começar:** há alterações não commitadas nesta tela. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-06.

## Causa

`--quiz-vinculado-curva-altura` (linha 3915) vale `padding + ícone / 2`, ou seja, supõe que a altura da linha do quiz seja `ícone + 2 × padding`, cerca de 42px. Mas a linha é mais alta, porque o botão do menu ⋮ tem 44px (`.menu-contexto__botao`).

As duas posições são calculadas com esse valor errado:

- a curva (linha 4273) termina acima do centro real do ícone;
- a guia vertical (linha 4258) usa o mesmo valor como `bottom`, a partir do fim do `<li>`, e por isso passa da curva.

Não corrija trocando o número: a altura muda com o conteúdo, o toque e a largura da tela.

## Correção

Tirar as alturas fixas e dividir a linha em trechos presos aos próprios elementos:

1. **Do conteúdo até o fim do seu bloco:** remover o `::before` do `<li>` do conteúdo (linha 4258). Criar um `::after` em `.atividades-curso__item-aberto`, só quando o item tiver quizzes, com `position: relative` no wrapper, `top: calc(0.625rem + var(--coluna-icone-conteudo))` e `bottom: 0`. Assim, ele acompanha a descrição aberta.
2. **Curva de cada quiz:** no `::before` do `<li>` do quiz (linha 4273), usar `top: 0` e `height: 50%`, sem `--quiz-vinculado-curva-altura`. O `align-items: center` da linha coloca o ícone exatamente nesse centro.
3. **Continuação entre quizzes:** criar `::after` em `.atividades-curso__item--quiz:not(:last-child)`, com `top: 0` e `bottom: 0`, só com a borda esquerda. O último quiz não tem esse trecho, e é isso que elimina a sobra para baixo.
4. **Sem falhas:** zerar o `gap` de `0.4rem` de `.atividades-curso__item` (linha 4058) nos itens com quiz, sob `.tela-conteudos`. Sem isso, a linha fica interrompida entre o conteúdo e o quiz.
5. **Mesmo traço:** todos os trechos usam `2px` e `--cor-borda-forte`. Desconte `1px` em `left` para centralizar no ícone.
6. **Limpeza:** remover `--quiz-vinculado-curva-altura` e os comentários que a explicam, e atualizar o comentário da linha de ligação.

## Coluna horizontal

`--quiz-vinculado-centro-x` e `--recuo-titulo-conteudo` usam `16px` fixos para a caixa de seleção, mas em telas de toque `.atividades-curso__checkbox-alvo` tem `2.75rem`. Criar uma variável para a largura dessa coluna, com `16px` por padrão e `2.75rem` em `@media (hover: none) and (pointer: coarse)`, e usá-la nos dois cálculos.

## Celular

Em `@media (max-width: 30rem)`, `.atividades-curso__linha` usa `flex-wrap: wrap`. Se a linha do quiz quebrar, `50%` deixa de ser o centro do ícone. Nesse caso, posicione a curva pelo centro da primeira linha da quebra e confira no navegador.

## Verificação

No app real, com largura de desktop e de celular, nos temas escuro e claro:

- conteúdo com um quiz: a curva chega à altura do centro do ícone e a linha termina nela;
- conteúdo com dois quizzes: a linha continua até o segundo e termina nele;
- conteúdo aberto, com descrição: a linha é contínua e não encosta no texto;
- a linha sai do centro do ícone do conteúdo e para antes do ícone do quiz;
- conteúdo sem quiz: nenhuma linha;
- "Quizzes do módulo", "Ver arquivados", "Visualizar como aluno" e telas do aluno sem mudança;
- `npm run lint` e `npm test` sem erros novos.

Medir com `getBoundingClientRect`: o trecho horizontal deve ficar a até 1px do centro vertical do ícone do quiz.

## Entrega

Informar o que mudou e enviar prints com um quiz, dois quizzes e conteúdo aberto.
