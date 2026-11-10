# Prompt — Cards com "relevo duplo": card dentro de card e caixa extra ao passar o mouse

## Problema (print do usuário, 10/11)

Depois do prompt `docs/TelaConteudosProfessor/PROMPT-agente-cards-modulo-relevo.md`, os cards ficaram com **caixas sobrepostas**:

1. **Avaliações do Professor:** cada avaliação aparece como um card dentro de outro. Há um card de fora, mais escuro, e o cabeçalho com relevo começa 16px para dentro.
2. **Em todas as telas com `.conteudos-modulo--cartao`** (Conteúdos do Professor e do Aluno, Avaliações do Professor e do Aluno, "Visualizar como aluno"): ao passar o mouse no card (ou ao selecionar), aparece **mais uma caixa clara por dentro do cabeçalho**, que não ocupa o cabeçalho inteiro.

## Causa (medida no navegador com a estrutura dos cards)

**1. Card dentro de card, só em Avaliações do Professor.** `styles/workspace.css`, por volta da linha 3983:

```css
.tela-avaliacoes-professor .conteudos-modulo {
  border: 1px solid var(--cor-borda);
  padding: 0 var(--espaco-md);            /* 16px */
  background: var(--cor-fundo-elevado);   /* #22242e */
}
```

Essa regra é anterior ao `.conteudos-modulo--cartao` e continua valendo. O card fica com 16px de padding e fundo #22242e, e o cabeçalho (`.conteudos-modulo--cartao > .conteudos-modulo__cabecalho`, fundo `--cor-card-modulo` #282b37 + relevo) fica 16px para dentro. Medido: card em x=0, cabeçalho em x=17. Nas outras telas o card tem padding 0 e o cabeçalho encosta na borda (x=1).

**2. Caixa extra ao passar o mouse, em todas as telas.** O cabeçalho do cartão tem `padding: 0 var(--espaco-md)`, então o botão `.conteudos-modulo__toggle` fica 16px para dentro dele (medido: cabeçalho em x=1, toggle em x=17). O `.conteudos-modulo__toggle:hover` (~linha 5854) pinta `background: rgba(255,255,255,0.03)` com `border-radius: var(--raio-sm)` só na área do botão, e aparece um retângulo menor dentro do cabeçalho.

## Correção

1. **Avaliações do Professor:** nos cards com `--cartao`, essa tela tem que seguir o mesmo visual de Conteúdos e de Avaliações do Aluno.
   - Remover (ou neutralizar com `.conteudos-modulo--cartao`) o `padding`, o `background` e a `border` da regra `.tela-avaliacoes-professor .conteudos-modulo` (~3983).
   - Remover também as duas regras de `border-bottom` logo abaixo (~4002 e ~4006), que existiam para essa borda antiga e agora brigam com a `--borda-card-modulo`.
   - Conferir se o corpo do card aberto (`.conteudos-modulo__corpo`) continua com padding (ele já recebe `padding: 0 var(--espaco-md) var(--espaco-md)` do `--cartao`).
2. **Hover no cabeçalho inteiro, não no botão:** nos cards `--cartao`,
   - zerar o fundo de hover do toggle: `.conteudos-modulo--cartao .conteudos-modulo__toggle:hover { background: none; }`;
   - aplicar o hover no cabeçalho todo, clareando de leve o fundo dele: `.conteudos-modulo--cartao > .conteudos-modulo__cabecalho:has(.conteudos-modulo__toggle:hover)`, por exemplo com `background: color-mix(in srgb, var(--cor-card-modulo), #fff 3%)` no escuro (no claro, um tom levemente mais escuro). O cabeçalho mantém os cantos e o relevo.
   - Manter um foco visível pelo teclado (`:focus-visible` no toggle) sem desenhar uma caixa preenchida: só o contorno, ou o mesmo realce do cabeçalho via `:has(.conteudos-modulo__toggle:focus-visible)`.
   - O menu ⋮ do módulo (Conteúdos do Professor) fica fora do toggle e não pode disparar o realce do cabeçalho inteiro ao ser usado. Se ficar estranho, aceitar o realce também no hover do ⋮.
3. As telas sem `--cartao` (Módulos do Admin, Progresso) mantêm o hover atual.

## Não mexer

- Tokens e valores do relevo (`--cor-card-modulo`, `--borda-card-modulo`, `--relevo-card-topo`, `--relevo-card-base`).
- Conteúdo dos cards, textos, menu ⋮ e comportamento do accordion.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`:
  - **Professor:** Avaliações → curso (uma caixa só por avaliação, sem card de fora) e Conteúdos → curso.
  - **Aluno:** Conteúdos → curso e Avaliações → curso.
  - Passar o mouse em cada card: o cabeçalho inteiro clareia de leve e não aparece uma caixa menor dentro dele.
  - Navegar com Tab: o foco aparece no cabeçalho sem caixa extra.
  - Abrir um card: corpo com respiro lateral e cantos certos.
- Temas escuro e claro. Rodar `npm test` e o build. Mandar print com o mouse em cima de um card nas duas telas de Avaliações.
