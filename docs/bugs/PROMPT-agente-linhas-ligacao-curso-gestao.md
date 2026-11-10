# Prompt — Bug: linhas de ligação cortando os ícones na tela do curso (Coordenador/Admin, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print):** no acesso do COORDENADOR, menu Cursos, tela do curso com um módulo aberto, a linha de ligação vertical (tronco) passa por dentro dos ícones dos conteúdos e quizzes. O traço horizontal de cada item sai do lado direito do ícone e encosta no começo do título, e fica acima do centro do ícone.

## O que o agente de arquitetura já verificou (não repetir)

- A tela é `PainelCursoGestao.jsx` (≈ linha 311, `<section className="conteudos-modulo conteudos-modulo--gestao">`). O corpo do módulo é `components/DetalheModuloDesempenho.jsx` com `separarGrupos`, que gera duas listas: "Conteudos" e "Quiz". A mesma tela serve o Admin, desde o commit b947b69.
- As linhas são `.conteudos-modulo--gestao .atividades-curso__item::before` (curva) e `:not(:last-child)::after` (tronco) em `frontend/src/styles/workspace.css` ≈ linhas 4181–4235, criadas em b947b69.
- **Causa:** o comentário dessas regras calcula as posições a partir da borda da **lista** (`padding-left: 2.25rem`). Mas o `position: relative` está no `<li>`, que já começa depois desse padding, então tudo fica deslocado 2.25rem para a direita. O comentário também supõe o ícone encostado no topo do `<li>`, mas `.atividades-curso__item` tem `padding: 0.6rem 0` (≈ linha 4166).
- Medido no CSS carregado em 127.0.0.1:5173, com a estrutura da tela montada temporariamente na página (1rem = 16px, lista na posição x = 0):
  - `<li>` começa em x = 36; ícone de 36 a 80 (44px), com fundo translúcido (`rgba(134, 239, 172, 0.1)`), por isso a linha aparece através dele;
  - tronco e começo da curva em x = 48, dentro do ícone; fim da curva em x = 94, 14px depois do ícone e a 2px do título (x = 96);
  - traço horizontal em y = 22 a partir do topo do `<li>`, mas o centro do ícone fica em y ≈ 31,6 (9,6px de padding + 22px).
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login. O print do usuário bate com as medidas.

## Tarefa

Manter o desenho das linhas de ligação e só corrigir a geometria, em `workspace.css`:

1. Calcular as posições a partir do `<li>`:
   - **Tronco:** passa no meio do recuo da lista, em `left: -1.5rem` (0.75rem − 2.25rem), tanto no `::before` quanto no `::after`.
   - **Curva:** termina na borda esquerda do ícone, com `width: 1.5rem`, e não atravessa o ícone.
   - **Altura do traço horizontal:** no centro do ícone, ou seja, o padding de cima do item mais metade do ícone (0.6rem + 1.375rem). Usar a mesma conta no `height` do `::before` e no `top` do `::after`, para o tronco continuar sem emenda.
2. De preferência, guardar esses valores em variáveis CSS (por exemplo, recuo da lista, tamanho do ícone e padding do item) dentro de `.conteudos-modulo--gestao`, para a conta não quebrar de novo se um deles mudar.
3. Corrigir o comentário das regras: posições relativas ao `<li>` e padding de cima considerado.

**Não alterar** as classes compartilhadas sem o escopo `.conteudos-modulo--gestao` (`.atividades-curso__item`, `.atividades-curso__icone`): Conteúdos do Professor/Aluno e o Progresso do Professor usam essas classes.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Coordenador e como Admin, na tela do curso com um módulo aberto que tenha conteúdos e quizzes:

- O tronco passa à esquerda dos ícones, sem tocar neles.
- Cada curva entra no meio da altura do ícone e para na borda esquerda dele, sem aparecer entre o ícone e o título.
- O tronco é contínuo entre os itens de cada lista e termina no último item ("Conteudos" e "Quiz" são listas separadas).
- Itens com título em duas linhas continuam alinhados.
- Mesmo resultado em largura de celular (≈ 400px).
- Conteúdos do Professor/Aluno e Progresso do Professor sem mudança visual.
- `npm run lint` e `npm test` sem erros novos.
