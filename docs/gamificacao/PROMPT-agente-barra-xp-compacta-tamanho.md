# Prompt — Barra de XP compacta: aumentar barra e texto

## Contexto

A barra de XP do aluno (`ProgressoXp.jsx`, `variante="compacta"`) aparece à direita da barra de abas do Acadêmico (`NavGrupo.jsx`, `<nav className="nav-grupo">`), nas telas **Conteúdos** e **Avaliações**. Hoje ela fica **pequena demais**: o "Nível 2" quase não aparece e a barra parece um traço solto no canto.

Medidas de hoje (`frontend/src/styles/layout.css`, por volta da linha 602):

| Parte | Hoje | Abas ao lado |
|---|---|---|
| Texto "Nível N" | `--texto-xs` (0.75rem) | `--texto-sm` (0.8125rem), ícone 15px |
| Largura da barra | `5rem` | — |
| Altura da barra | `4px` | — |
| Ícone | nenhum | cada aba tem ícone |

A barra de abas tem 44px de altura, então há espaço sobrando.

## O que fazer

Só na variante **compacta**:

1. **Texto:** "Nível N" em `--texto-sm`, peso 700, cor `--cor-texto-forte`. Fica igual ou um pouco mais forte que as abas, nunca menor.
2. **Ícone:** pôr o `TbBolt` antes do texto, como na variante completa (Panorama), com 15px (o mesmo das abas), na cor `--cor-marca` e com `aria-hidden="true"`. Hoje o seletor `.progresso-xp--completa .progresso-xp__nivel svg` só pinta o ícone da completa: estender esse seletor para a compacta.
3. **Barra:** largura de `5rem` para **8rem** e altura de `4px` para **6px**, com o mesmo raio arredondado da `BarraProgresso`. Deixar a barra alinhada verticalmente ao centro do texto.
4. **Espaço:** manter `gap: var(--espaco-sm)` entre o texto e a barra, e a barra continuar encostada à direita (`margin-left: auto`).

## Não mexer

- A variante completa do Panorama.
- O cálculo de XP (`lib/xp.js`), o `rotuloAria` e o fato de só o aluno ver a barra.
- A altura da barra de abas (44px) e as próprias abas.
- No celular (`max-width: 768px`) a compacta continua escondida (`display: none`).
- Não acrescentar a contagem "X / 500 XP" na compacta (fica só no Panorama, a não ser que o usuário peça).

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`. Entrar como aluno e abrir Acadêmico → Conteúdos e Acadêmico → Avaliações.
- O "Nível N" tem que ser lido sem esforço, no mesmo tamanho das abas, e a barra tem que aparecer como barra, com o preenchimento visível.
- Conferir no tema escuro e no claro, e em uma largura média (~1024px): a barra não pode empurrar nem cortar as abas. Se apertar, reduzir só a largura da barra (mínimo 6rem).
- Rodar `npm test` e o build. Mandar print de antes e depois.
