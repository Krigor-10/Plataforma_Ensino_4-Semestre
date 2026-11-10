# Prompt — Avaliações do aluno: dar destaque aos cards (igual a Conteúdos)

## Contexto

Tela: **Aluno → Acadêmico → Avaliações → (curso)** (`SecoesAluno.jsx`, wrapper `.tela-avaliacoes tela-avaliacoes-aluno`, por volta da linha 1351). Cada avaliação é um `.conteudos-modulo` em accordion: cabeçalho com troféu, "AVALIAÇÃO 01", título, "N questões · Bloqueada" e seta; quando aberto, mostra os detalhes e o botão Iniciar.

O fundo dos cards é quase transparente e eles se confundem com o background da página. Na tela de **Conteúdos** do aluno os cards têm fundo próprio, e Avaliações tem que seguir o mesmo padrão.

## Como está hoje

`frontend/src/styles/workspace.css`, por volta da linha 3904:

```css
.tela-avaliacoes-aluno .conteudos-modulo {
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-md);
  padding: 0 var(--espaco-md);
  background: rgba(255, 255, 255, 0.015);   /* quase invisível */
}
```

O padrão de Conteúdos (`.conteudos-modulo--cartao`, por volta da linha 5711):
- o card inteiro usa `background: var(--cor-fundo-alt)` e `border-radius: var(--raio-md)`;
- o cabeçalho usa `background: var(--cor-fundo-elevado)` e o mesmo raio, com o padding lateral no cabeçalho;
- quando aberto, o cabeçalho ganha `border-bottom: 1px solid var(--cor-borda)` e só os cantos de cima ficam arredondados, separando o cabeçalho do corpo.

O mesmo problema já foi corrigido no Professor (`.tela-avaliacoes-professor`, linha 3932) e no Progresso (`.tela-progresso`, linha 4474), trocando o 0.015 por `--cor-fundo-elevado`.

## O que fazer

1. **Usar nos cards de Avaliações do aluno os mesmos dois tons de Conteúdos:**
   - **Fechado:** o card aparece todo no tom do cabeçalho de Conteúdos (`--cor-fundo-elevado`), com raio `--raio-md`.
   - **Aberto:** o cabeçalho continua em `--cor-fundo-elevado`, com a linha fina embaixo e só os cantos de cima arredondados. O corpo (detalhes + botão Iniciar) fica em `--cor-fundo-alt`, com os cantos de baixo arredondados.
   - A borda de 1px atual pode ficar, desde que não pareça um card dentro de outro. Se ficar estranha junto com o fundo, tirar a borda, como em Conteúdos. O importante é que os cards ganhem peso visual nos dois temas.
2. **Como fazer fica a seu critério:** pode reaproveitar `.conteudos-modulo--cartao` no JSX de Avaliações do aluno (nesse caso, mover o padding lateral do card para o cabeçalho e para o corpo, para não duplicar) ou criar regras escopadas em `.tela-avaliacoes-aluno`. Só não alterar o visual de Conteúdos, Módulos (Admin/Coordenador), Progresso nem Avaliações do Professor.
3. **Ainda nesta tela, corrigir o subtítulo "Curso #1":** abaixo de "Avaliações" aparece `Curso #1` em vez do nome do curso. A causa está em `cursosComAvaliacao` (por volta da linha 1304): o código usa só `avaliacao.cursoTitulo`, que vem vazio, e cai no texto "Curso #id". Os cards da lista de cursos já mostram o nome certo porque usam `cursoPorId`. Usar `cursoPorId.get(cursoId)?.titulo` antes do texto "Curso #id".

## Não mexer

- Textos, ordem, contagem de questões, status (Bloqueada/Disponível), o selo "AVALIAÇÃO 01" e o comportamento do accordion e do botão Iniciar.
- O espaço entre os cards (o `gap` do contêiner).
- Outras telas que usam `.conteudos-modulo`.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`. Entrar como aluno e abrir Acadêmico → Avaliações → Desenvolvimento Web Full Stack.
- Os cards têm que se destacar do fundo da página, com os mesmos tons dos cards de Conteúdos. Abrir as duas telas lado a lado para comparar.
- Abrir um card e conferir a separação entre o cabeçalho e o corpo, e os cantos (o último card inclusive).
- O subtítulo tem que mostrar o nome do curso.
- Conferir nos temas escuro e claro, e em largura de celular (375px).
- Rodar `npm test` e o build. Mandar print de antes e depois.
