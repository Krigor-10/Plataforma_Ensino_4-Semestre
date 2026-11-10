# Prompt — Cards de módulo em relevo na tela do curso (Admin/Coordenador, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário (print):** no acesso ADMIN, menu Cursos, tela do curso, aba Módulos. Hoje a lista de módulos ("01 Scruum", "02 Kanban") é uma lista plana, separada só por uma linha fina. Ela deve ficar no mesmo padrão de cartão em relevo da tela de Conteúdos do aluno.

## O que o agente de arquitetura já verificou (não repetir)

- **Tela:** `frontend/src/pages/workspace/PainelCursoGestao.jsx`. A lista começa em ≈ linha 302 e cada módulo é um `<section className="conteudos-modulo conteudos-modulo--gestao">` (≈ linha 311). O corpo aberto é `components/DetalheModuloDesempenho.jsx` com `separarGrupos`. **A mesma tela serve o Coordenador**, então ele também passa a ver os cartões, o que mantém as duas telas iguais.
- **Padrão do aluno:** `SecoesAluno.jsx` ≈ linha 1997 usa `conteudos-modulo conteudos-modulo--cartao`. As Avaliações do aluno (≈ linha 1411) também usam esse cartão, com o corpo em `className="conteudos-modulo__corpo"` (≈ linha 1444).
- **O relevo já existe e é reaproveitável**, em `frontend/src/styles/workspace.css`, sem depender de `.trilha-conteudos`:
  - `.conteudos-modulo--cartao` (≈ linha 5799): fundo `--cor-fundo-alt`, raio, borda `--borda-card-modulo` e sombra `--relevo-card-base`;
  - `.conteudos-modulo.conteudos-modulo--cartao` (≈ linha 5788): tira a linha de baixo da base. O `:has(...)` (≈ linha 5813) mantém a borda grafite quando o card abre;
  - `.conteudos-modulo--cartao > .conteudos-modulo__cabecalho` (≈ linha 5845): cabeçalho em `--cor-card-modulo`, com `--relevo-card-topo` e padding lateral. Quando aberto, só os cantos de cima ficam arredondados, com divisória embaixo;
  - hover do cabeçalho inteiro via `--realce-card-modulo` (≈ linhas 5901–5908);
  - `.conteudos-modulo--cartao > .conteudos-modulo__corpo` (≈ linha 5822): padding do corpo;
  - os tokens dos dois temas estão em `base.css` ≈ linhas 28–37 e 157–161.
- O espaço entre os cards já vem de `.atividades-curso__lista-modulos` (`gap: 0.75rem`, ≈ linha 4139).
- As linhas de ligação de `.conteudos-modulo--gestao` (≈ linhas 4196–4245, corrigidas em 2dcd2c3) são relativas à lista, então continuam funcionando dentro do corpo com padding.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Em `PainelCursoGestao.jsx`, acrescentar `conteudos-modulo--cartao` ao `<section>` de cada módulo, mantendo `conteudos-modulo--gestao` (é dele que vêm as linhas de ligação).
2. Envolver o conteúdo do `motion.div` aberto (`DetalheModuloDesempenho` e o texto "Carregando…/Não foi possível…") num `<div className="conteudos-modulo__corpo">`, como nas Avaliações do aluno. Assim os indicadores (Progresso / Conclusão / Desempenho médio), os títulos "Conteudos"/"Quiz", as listas e o texto "Nenhum material…" deixam de encostar na borda do cartão.
3. Conferir o cabeçalho com a barra de progresso, o chevron e o menu "⋮" dentro do cartão. O menu fica no cabeçalho, fora do `overflow: hidden` do corpo, então não deve ser cortado. Também não deve ser cortado no último card.
4. Só criar CSS novo, escopado em `.conteudos-modulo--gestao.conteudos-modulo--cartao`, se algo desalinhar. Não duplicar o relevo.

**Não alterar** o cartão do aluno e do professor, os tokens de relevo, a aba "Avaliações do curso" (fora do pedido) nem o Progresso do Professor (`PainelModulosDesempenho.jsx`, que usa a base `.conteudos-modulo` sem cartão).

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Admin e como Coordenador, na tela do curso, aba Módulos:

- Cada módulo é um cartão em relevo igual ao da tela de Conteúdos do aluno: fundo, borda fina, sombra embaixo, cabeçalho elevado e espaço entre os cards, sem a linha separadora antiga.
- Ao abrir: divisória entre o cabeçalho e o corpo, conteúdo com respiro lateral e linhas de ligação alinhadas aos ícones.
- Hover no cabeçalho clareia o cabeçalho inteiro. O menu "⋮" abre por cima, sem corte (Editar/Excluir só para o Admin, como hoje).
- Tema claro e largura de celular (≈ 400px) corretos.
- Conteúdos do aluno e do professor e Progresso do Professor sem mudança visual.
- `npm run lint` e `npm test` sem erros novos.
