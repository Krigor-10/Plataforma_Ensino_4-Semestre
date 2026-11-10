# Prompt — Cards de módulo de Conteúdos: estilo "relevo duplo"

## Contexto

Tela: **Professor → Conteúdos → (curso)** (`SecaoConteudosProfessor.jsx`, trilha `.trilha-conteudos`). Os cards de módulo (01 Fundamentos da Web Moderna, 02 APIs e Integração...) ainda se confundem com o fundo da página: o cabeçalho usa `--cor-fundo-elevado` (#22242e) sobre `--cor-fundo` (#191b21), uma diferença muito pequena.

**Decisão do usuário (09/11), escolhida entre 13 opções mostradas em imagem:** opção **J4, "relevo duplo"**, um card grafite um pouco mais claro, com uma linha de brilho no topo e uma sombra fina embaixo, que dá impressão de relevo sem chamar atenção.

## Estilo escolhido (tema escuro)

| Parte | Valor |
|---|---|
| Fundo do cabeçalho do módulo | `#282b37` |
| Brilho no topo | `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09)` |
| Sombra embaixo | `box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35)` |
| Borda | `1px solid rgba(0, 0, 0, 0.30)` |
| Raio | `var(--raio-md)` (como hoje) |

## O que fazer

1. **Criar tokens** em `styles/base.css`, no `:root` (escuro) e no `[data-tema="claro"]`, para não deixar hex solto no CSS da tela:
   - `--cor-card-modulo` (fundo do cabeçalho)
   - `--borda-card-modulo`
   - `--relevo-card-topo` (brilho do topo)
   - `--relevo-card-base` (sombra de baixo)
2. **Aplicar em `.conteudos-modulo--cartao`** (`styles/workspace.css`, por volta da linha 5711) e no cabeçalho dele (`.conteudos-modulo--cartao > .conteudos-modulo__cabecalho`):
   - **Card inteiro:** borda `--borda-card-modulo` e a sombra de baixo (`--relevo-card-base`), para o relevo acompanhar a borda de baixo do card, fechado ou aberto.
   - **Cabeçalho:** fundo `--cor-card-modulo` e o brilho do topo (`--relevo-card-topo`).
   - **Card aberto:** o corpo continua em `--cor-fundo-alt` e o cabeçalho mantém a linha fina embaixo (`border-bottom: 1px solid var(--cor-borda)`), como hoje.
   - Hoje `.conteudos-modulo:has(.conteudos-modulo__toggle[aria-expanded="true"])` troca a cor da borda para `--cor-borda-forte` (roxo) quando o card abre. **Nos cards de Conteúdos, manter a borda escura** também quando aberto, para não aparecer um contorno roxo. Usar especificidade com `.conteudos-modulo--cartao`, sem `!important`.
3. **Tema claro** (o usuário viu só o escuro; manter o mesmo efeito, mais suave):
   - fundo `#ffffff`;
   - borda `1px solid rgba(13, 15, 24, 0.08)`;
   - brilho do topo `inset 0 1px 0 #ffffff` (pode ficar neutro);
   - sombra embaixo `inset 0 -2px 0 rgba(13, 15, 24, 0.06)`.
   - Conferir se o card se separa do fundo `#f0f2f8`. Se ficar fraco, subir só a borda para 0.12.
4. **Onde vale:** a classe `.conteudos-modulo--cartao` é usada nas trilhas de Conteúdos do **Professor**, do **Aluno** e na prévia **"Visualizar como aluno"**. As três ganham o mesmo visual, de propósito, para ficarem iguais. Não aplicar em Módulos (Admin), Progresso nem Avaliações, que usam `.conteudos-modulo` sem `--cartao`.

## Não mexer

- O quadrado do número (01, 02), os títulos, a contagem à direita, a seta, o menu ⋮ e o espaço entre os cards.
- As linhas de conteúdo e quiz dentro do card, o bloco "Quizzes do módulo" e os botões de baixo (Novo conteúdo, Adicionar Quiz, Gerar quiz com IA).
- O destaque do módulo vazio ("Vazio · não aparece para o aluno").

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`:
  - **Professor → Conteúdos → Desenvolvimento Web Full Stack:** com os cards fechados, eles se destacam do fundo, com a linha clara em cima e a sombra fina embaixo. Abrir um card e conferir a separação entre o cabeçalho e o corpo e os cantos de baixo.
  - **Aluno → Conteúdos → curso:** mesmo visual.
  - Abrir "Visualizar como aluno": mesmo visual.
- Temas escuro e claro. Em modo foco (teclado), o contorno de foco do toggle continua visível sobre o novo fundo.
- Rodar `npm test` e o build. Mandar print de antes e depois nos dois temas.
