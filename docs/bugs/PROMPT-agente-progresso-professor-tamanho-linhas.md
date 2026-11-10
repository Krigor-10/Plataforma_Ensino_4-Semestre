# Prompt — Progresso do Professor: padronizar o tamanho das linhas

## Contexto

Tela: **Progresso do Professor → detalhe do curso** (`SecaoTurmasProfessor.jsx`, que renderiza `PainelModulosDesempenho.jsx`).

Abaixo dos 4 indicadores aparecem uma linha "Avaliações do curso" e depois os módulos (01, 02, 03...). Hoje a linha de Avaliações é **mais baixa e mais estreita** que as dos módulos e fica mais afastada da lista. Ela tem que ter **o mesmo tamanho** das linhas de módulo.

## O que está diferente hoje (medido no print)

1. **Altura:** Avaliações tem uns 36px; cada módulo tem uns 48px.
   - Causa: o módulo usa `<NumeroModulo>`, que é uma caixa de 2.25rem (`.conteudos-modulo__numero`). A Avaliação usa só o `<TbTrophy>` dentro de `.conteudos-modulo__icone`, que não tem largura, altura nem fundo. Sem a caixa, a linha encolhe.
2. **Alinhamento do título:** "Avaliações do curso" começa uns 12px mais à esquerda que "APIs e Integração", porque o troféu é mais estreito que a caixa do número.
3. **Espaço até a lista:** de Avaliações até o módulo 01 o espaço é de uns 22px (`.conteudos-modulo--avaliacoes-curso { margin-bottom: var(--espaco-lg) }`). Entre os módulos o espaço é de 12px (`.atividades-curso__lista-modulos { gap: 0.75rem }`).

## O que fazer

1. **Pôr o troféu numa caixa igual à do número.** Mesma largura, altura, raio e fundo de `.conteudos-modulo__numero`, com o troféu centralizado na mesma cor roxa.
   - Sugestão: criar um modificador (ex.: `.conteudos-modulo__icone--caixa`) que reaproveite as mesmas medidas, ou extrair as medidas para uma regra comum aos dois. **Não** usar `<NumeroModulo>` para o troféu, porque ele tem texto oculto "Módulo" para o leitor de tela.
   - O troféu continua com `aria-hidden="true"`.
   - Diminuir o ícone se for preciso para caber na caixa (ex.: 1.1–1.2rem), com o mesmo peso visual do "01".
2. **Igualar o espaço.** A distância entre o cartão de Avaliações e o módulo 01 tem que ser a mesma que há entre os módulos (0.75rem). Trocar o `margin-bottom` de `.conteudos-modulo--avaliacoes-curso` para esse valor, ou pôr o cartão de Avaliações dentro do mesmo contêiner com `gap`. Se for pelo contêiner, cuidar da regra de `:last-child` da borda.
3. **Resultado esperado:** com tudo fechado, as 5 linhas (Avaliações + 4 módulos) têm a mesma altura, o título começa na mesma coluna, a contagem à direita e a seta ficam alinhadas, e o espaço entre as linhas é igual.

## Não mexer

- Conteúdo de dentro (lista de avaliações, detalhe do módulo), textos, contagens, nem a ordem (Avaliações continua em cima).
- Indicadores do topo e botão "Exportar desempenho".
- Telas do Coordenador (`PainelCursoCoordenador.jsx`, que usa abas) e a Trilha de Conteúdos do Professor/Aluno. Se a regra de CSS for compartilhada, escopar a mudança à tela de Progresso (`.tela-progresso-professor` ou ao modificador `--avaliacoes-curso`).
- Telas mobile (`@media`, `min-height: 2.75rem` do toggle): conferir que nada piora.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`. Entrar como professor, ir em Progresso e abrir um curso com avaliações sem módulo (ex.: "Desenvolvimento Web Full Stack").
- Medir no DevTools a altura dos `.conteudos-modulo__toggle` de Avaliações e de um módulo: têm que ser iguais. A posição x de `.conteudos-modulo__titulo` também tem que ser igual.
- Conferir no tema claro e no escuro, e em largura de celular (375px).
- Rodar os testes do frontend (`npm test`) e o build.
- Mandar um print de antes e depois.
