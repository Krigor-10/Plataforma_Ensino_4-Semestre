# Prompt — Bug: rolagem travada na tela de Conteúdos do aluno (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite). Também vale para o desktop, que é o Electron abrindo o web.

**Relato do usuário:** no acesso de ALUNO, ao entrar na tela de Conteúdos de um curso (`/app/conteudos/{cursoId}`) que tem muitos conteúdos e muitos módulos, a página não rola para baixo. Para chegar aos módulos de baixo, o aluno precisa recolher os módulos de cima. Ninguém sabe dizer qual foi o passo anterior ao travamento.

## O que o agente de arquitetura já verificou (não repetir)

- Tela: `SecaoConteudosAluno` → `SlideConteudosCurso` em `frontend/src/pages/workspace/SecoesAluno.jsx` (≈ linhas 1511–2290). Quem rola é a própria página (documento/body). Nenhum ancestral (`.tela-conteudos-aluno`, `.tela-animada`, `main.layout-principal`, `.layout-conteudo`, `.layout-workspace`, `.workspace-app`, `#root`, `body`, `html`) tem `overflow` ou altura fixa que corte o conteúdo.
- Modo demo (`VITE_DEMO_MODE=true`, conta `aluno@demo.edtech`): com o único módulo do curso demo clonado 16 vezes no DOM, a roda do mouse rolou normalmente. **O bug não aparece só por haver muitos módulos abertos.** O layout está correto.
- O sintoma combina com `document.body.style.overflow = "hidden"` preso. Com o body bloqueado, nada rola, e recolher módulos só faz o conteúdo caber na tela. Quem tem poucos conteúdos não percebe.
- Quem bloqueia o body nesta tela, via `useBloqueioScroll` (`frontend/src/hooks/useBloqueioScroll.js`, conjunto global `locksAtivos`):
  1. `Modal` (`components/Modal.jsx`, `useBloqueioScroll(true)`), usado por `VisualizadorPdf` e `VisualizadorImagem`, que abrem a partir de `SlideConteudosCurso` (estado `visualizador`);
  2. `useExecucaoAvaliacao` (`SecoesAluno.jsx` ≈ linha 611, `useBloqueioScroll(Boolean(avaliacaoEmExecucao))`), usado para os quizzes da trilha;
  3. o modal "Antes de começar" / confirmação de quiz, se usar `Modal`;
  4. `BarraLateral` (`useBloqueioScroll(aberta)`, drawer do menu no mobile/tela estreita);
  5. `WorkspaceScreen` (`useBloqueioScroll(Boolean(confirmacaoSessao))`).
- Atenção: abrir um conteúdo chama `onConcluir` → `onRefresh()`, que recarrega o workspace enquanto o visualizador está aberto. Se isso desmontar ou remontar a árvore no meio do caminho, é forte candidato a deixar um lock órfão.

## Tarefa

1. **Reproduzir com dados reais** (local, com backend): um curso com 4 ou mais módulos e vários conteúdos de tipos diferentes (PDF, imagem, vídeo, link, texto) e quizzes. Testar estas sequências, conferindo `document.body.style.overflow` no console depois de cada uma:
   - entrar no curso e rolar;
   - abrir um PDF/imagem no visualizador (o primeiro acesso marca como concluído e dispara `onRefresh`), fechar e rolar;
   - abrir um quiz, cancelar no "Antes de começar"; abrir, responder, enviar, fechar a revisão e rolar;
   - trocar de curso pelo "Voltar para Conteúdos" com um modal aberto ou recém-fechado;
   - em largura < 900px: abrir e fechar o menu lateral e rolar.
   Também conferir se há algum elemento invisível por cima da lista (overlay com `opacity: 0` e `pointer-events` ativo, por exemplo um `AnimatePresence` que não terminou o `exit`) usando `document.elementFromPoint` sobre a lista.
2. **Corrigir a causa raiz** que aparecer, não o sintoma. Não resolver com `overflow: auto !important` no body, nem colocando a lista num contêiner com rolagem própria.
3. **Rede de segurança**: garantir que nenhum lock sobreviva à saída da tela (`SlideConteudosCurso` desmonta, ou troca de rota em `/app/*`). Por exemplo, limpar os locks na troca de rota do workspace, como já é feito no logout com `limparBloqueiosScroll`, desde que isso não solte o lock de um modal que continua aberto.
4. **Testes (vitest)**: cobrir o cenário que travava, por exemplo "abrir visualizador → onRefresh remonta → fechar → `document.body.style.overflow` volta a vazio". Incluir também um teste de `useBloqueioScroll` com dois locks fechados fora de ordem.

## Critérios de aceite

- Com todos os módulos abertos num curso grande, a página rola até o fim, com roda do mouse e teclado (Page Down / espaço), antes e depois de abrir e fechar visualizador e quiz.
- Depois de qualquer modal fechar, `document.body.style.overflow` volta ao valor original.
- Modais abertos continuam bloqueando o fundo (não regredir).
- `npm run lint` e `npm test` sem erros novos.
- No commit/resposta, dizer **qual sequência travava** e qual foi a causa, para o agente de arquitetura atualizar a documentação se preciso.
