# Prompt — Botão Voltar na margem: a seta sumiu

## Problema

Depois do prompt "botão Voltar na margem esquerda", o botão foi para a margem, mas **aparece só "Voltar", sem a seta**. A seta não foi removida: o `<TbArrowLeft>` continua em `components/BotaoVoltar.jsx`, mas fica com **largura 0**.

## Causa (medida no navegador)

Dentro do `@container (min-width: 100.5rem)` (`styles/workspace.css`, por volta da linha 3775), o `.atividades-curso__navegacao` vira `position: absolute`, com `right: calc(100% + var(--espaco-lg))` e `left: auto`. Com essa combinação, o navegador calcula a largura disponível do nav como **negativa** e encolhe o nav até o mínimo. O botão é `inline-flex` e o svg da seta é um item flex com `flex-shrink: 1`, então é ele que encolhe até 0.

Medido numa área de 1900px: nav com 65px, **svg com largura 0** e texto "Voltar" visível.

## Correção (testada no navegador)

Em `styles/workspace.css`:

1. Fora do container query (vale para todas as telas, sem efeito colateral):
   ```css
   .atividades-curso__voltar svg {
     flex-shrink: 0;
   }
   ```
2. Dentro do `@container (min-width: 100.5rem)`, no bloco do `.atividades-curso__navegacao`:
   ```css
   width: max-content;
   ```

Com as duas regras, o nav fica com 87px, a seta com 22px e o texto "Voltar" inteiro, encostado à esquerda da coluna.

## Não mexer

- `BotaoVoltar.jsx`, a posição na margem, o texto curto e longo, o `aria-label` e o `title`.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`, em 1920px:
  - com a barra lateral aberta e fechada, o botão aparece como `← Voltar` na margem;
  - abrir uma tela de cada perfil (Aluno, Professor, Coordenador e Admin).
- Em 1366px o botão fica acima do título, como `← Voltar para X`, com a seta.
- Rodar `npm test` e o build.
