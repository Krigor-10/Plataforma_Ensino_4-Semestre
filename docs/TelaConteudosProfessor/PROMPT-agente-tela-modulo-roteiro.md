> **SUBSTITUÍDO em 2026-11-19** por `PROMPT-agente-tela-modulo-lista-e-janela.md` (tela igual à referência do usuário + prévia em janela grande). Não aplicar.

# Prompt: tela do módulo vira "Roteiro da aula" (linha do tempo com prévia que abre no lugar) — Professor, Coordenador e Admin (frontend web)

## Contexto e decisões do usuário (2026-11-18)

O usuário achou a tela do módulo da versão B (commit `b4ad8f0`, trilha com todos os módulos + prévia à direita) ruim:
- **a trilha é pequena demais**, com muita informação junta e sem hierarquia;
- **sobra espaço à direita**: a prévia do PDF fica numa faixa com um vazio grande embaixo.

Recebeu 3 opções de ajuste na mesma estrutura (`opcoes-trilha-e-previa.png`) e pediu **outros formatos**. Depois recebeu 3 modelos diferentes (`modelos-tela-modulo.png`) e escolheu o **Modelo 1, "Roteiro da aula"**.

**Decisões:**
- **Layout:**
  - **à esquerda**, uma lista simples dos módulos;
  - **no centro**, o módulo como **passo a passo numerado** (linha do tempo vertical), com cada item em um **bloco grande**;
  - **clicar no bloco abre a prévia ali mesmo**, grande, empurrando os outros blocos para baixo;
  - o **quiz do conteúdo** aparece **pendurado** no passo do conteúdo.
- **Reordenar:** continua **"Mover para cima / Mover para baixo" no menu ⋮** de cada bloco. **Sem arrastar e soltar.**
- **Professor, coordenador e Admin** usam a mesma tela. Coordenador e Admin veem **só o publicado**, em somente leitura (decisão de 18/11, já no `PROMPT-agente-fluxo-professor-igual-coordenador.md`).

**Imagem de referência:** `docs/TelaConteudosProfessor/modelos-tela-modulo.png`, número 1 (a parte de cima).

**Este prompt substitui o layout de:**
- `PROMPT-agente-tela-modulo-trilha-versao-b.md`: trilha e prévia à direita;
- `PROMPT-agente-trilha-cortada-correcao.md`: o corte deixa de existir com o layout novo, então não aplicar se ainda não foi aplicado.

O que já funciona continua: `PreviaItemAluno`, as ações, a seleção em lote, a trava de edição e as rotas `/app/conteudos/:cursoId/modulos/:moduloId` e `/app/cursos/:id/modulos/:moduloId`.

## Onde está (verificado pelo agente de arquitetura)

- **Professor:** `frontend/src/pages/workspace/TelaModuloGestaoProfessor.jsx` (≈ 825 linhas, versão B).
- **Coordenador/Admin:** `frontend/src/pages/workspace/TelaModuloGestao.jsx` (≈ 346 linhas), aberta por `PainelCursoGestao.jsx`.
- **Prévia:** `frontend/src/components/PreviaItemAluno.jsx` (≈ 157 linhas). Mostra texto, imagem com "Ampliar", PDF com "Ampliar", vídeo, link e quiz com gabarito.
- **Estilos:** `.modulo-gestao*` em `frontend/src/styles/workspace.css` (≈ linhas 9540–10030). A trilha usa 280/320px a partir de 768px.
- **Ordem:** `OrdemExibicao` dos conteúdos, trocada pelo "Mover" (o mesmo código de hoje). Os quizzes do módulo vêm depois dos conteúdos.

## Tarefa

### 1. Estrutura da tela (as duas telas)

- **Topo:**
  - "← {curso}" (volta para a lista de módulos);
  - à direita, só para o **professor**, os botões "Gerar quiz com IA", "Adicionar quiz" e "Novo conteúdo", como hoje.
  - No coordenador/Admin, os KPIs que já existem (Progresso, Conclusão, Desempenho médio) ficam no lugar desses botões.
- **Coluna da esquerda, lista de módulos** (≈ 260px, rolagem própria): um item por módulo, com número, título (até 2 linhas, sem cortar) e embaixo "N itens · N rascunhos", ou "vazio".
  - O módulo atual fica com fundo roxo leve e barra roxa à esquerda.
  - Clicar troca de módulo, sem recarregar a página.
  - **Sem itens dentro da lista.** Os itens ficam só no roteiro.
- **Centro, o roteiro** (o resto da largura, rolagem própria):
  - **Cabeçalho do módulo:** número, título grande, "N conteúdos · N quizzes · **N rascunhos**" (âmbar, só no professor) e uma barra fina de "% publicado" (só no professor).
  - **Linha do tempo vertical** à esquerda dos blocos: um círculo numerado por passo (1, 2, 3…) ligado por uma linha roxa. A ordem é a dos conteúdos (`OrdemExibicao`), seguida dos quizzes do módulo.
  - **Bloco fechado** (≈ 100px de altura), com:
    - **miniatura** (≈ 120 × 76px):
      - **imagem** de verdade quando o conteúdo é imagem;
      - quadrado com o ícone do tipo para PDF, vídeo, link, texto e quiz. **Não** desenhar a página do PDF na miniatura, para não pesar;
    - título (até 2 linhas) e embaixo "Tipo · detalhe" (por exemplo "PDF", "Quiz · 3 questões");
    - à direita, o selo Publicado/Rascunho e o ⋮ (só no professor).
  - **Quiz do conteúdo:** fica **pendurado** logo abaixo do bloco do conteúdo, recuado, com uma linha tracejada ligando os dois. É um bloco menor (≈ 64px), **sem número próprio**.
  - **Bloco aberto:**
    - o bloco se expande, com borda roxa;
    - no topo do bloco: título, tipo e as ações. Professor: selo, "Voltar para rascunho/Publicar" e "Editar". Coordenador/Admin: "Somente leitura";
    - embaixo, a **prévia grande** (`PreviaItemAluno`), na largura do bloco, com **altura mínima de 60% da área visível** (`min-height: 60vh`, no máximo cerca de 720px). Para PDF e imagem, a página ou a figura ocupa essa altura, com "Ampliar" no canto;
    - para rascunho, o aviso "Rascunho — os alunos ainda não veem este item."
  - **Um bloco aberto por vez.** Abrir outro fecha o anterior. Ao abrir, a tela rola até o topo do bloco (`scrollIntoView({ block: "start", behavior: "smooth" })`, sem animação com `prefers-reduced-motion`).
  - **Ao entrar no módulo**, o 1º passo já vem aberto. Clicar no topo do bloco aberto (seta ⌃) fecha o bloco.
  - **Navegação:**
    - dentro do bloco aberto, "‹ Anterior · Item X de N · Próximo ›" abre o passo vizinho;
    - no fim do roteiro, "Módulo anterior / Próximo módulo: {título}", como hoje.
- **Sem a coluna de prévia à direita.** O espaço todo fica para o roteiro.

### 2. Professor (`TelaModuloGestaoProfessor.jsx`)

- **⋮ de cada bloco:** Editar, Publicar/Voltar para rascunho, **Mover para cima**, **Mover para baixo**, Arquivar e Excluir, como hoje.
  - Mover troca de posição com o vizinho e a numeração se atualiza.
  - "Mover para cima" fica desativado no 1º passo e "Mover para baixo" no último.
  - O quiz do conteúdo **não** se move sozinho: vai junto com o conteúdo.
- **Seleção em lote:** o botão "Selecionar" no cabeçalho do módulo liga o modo de seleção, que mostra uma caixa de seleção (14px) em cada bloco e a barra "N selecionados · Mais ações". Sair do modo esconde as caixas.
- **Módulo vazio:** em vez do roteiro, um cartão "Este módulo ainda não tem conteúdo" com os botões de criar.
- **Edição travada:** as ações e o ⋮ ficam desativados, mas abrir e ver a prévia funciona.

### 3. Coordenador e Admin (`TelaModuloGestao.jsx`)

- O mesmo roteiro, **só com o que está publicado**, sem ⋮, sem seleção e sem os botões de criar.
- O selo do bloco aberto é "Somente leitura". Os KPIs ficam no topo, como hoje.
- **Reaproveitar** os mesmos componentes do roteiro do professor (por exemplo `RoteiroModulo`, `PassoRoteiro`, `ListaModulosRoteiro`) com uma prop de modo, **sem copiar código**.

### 4. Responsivo

- **De 768px a 1199px:** a lista de módulos com ≈ 220px; a prévia aberta com `min-height: 50vh`.
- **Abaixo de 768px:** a lista de módulos vira um seletor no topo ("Módulo 02 · APIs e Integracao ⌄"); o roteiro ocupa a tela inteira; a miniatura do bloco fica com 72 × 48px; o bloco aberto continua no lugar, sem tela cheia separada.

### 5. Limpeza

- Remover as classes, os componentes e o CSS da versão B que deixarem de ser usados (por exemplo `.modulo-gestao__trilha-*` e a coluna da prévia), sem deixar estilo morto.
- `PreviaItemAluno` não muda de comportamento. Se precisar de altura flexível, acrescentar uma prop ou classe, em vez de mudar o padrão.

### 6. Testes (vitest)

- **Estrutura do roteiro:**
  - lista de módulos (troca de módulo);
  - números dos passos na ordem certa (conteúdos depois quizzes do módulo);
  - quiz do conteúdo pendurado e sem número.
- **Blocos:**
  - só um aberto por vez;
  - o 1º vem aberto ao entrar;
  - Anterior/Próximo;
  - miniatura de imagem e ícone nos outros tipos.
- **Ações do professor:**
  - Mover para cima/baixo (desativados nas pontas; a numeração se atualiza);
  - modo "Selecionar" com lote;
  - Publicar e Editar no bloco aberto;
  - edição travada.
- **Coordenador/Admin:** só o publicado; sem ⋮ e sem criar; "Somente leitura".
- Adaptar os testes de `SecaoConteudosProfessor.test.jsx`, `PainelCursoGestao.test.jsx` e `WorkspaceScreen.test.jsx` que dependem da versão B, **sem perder cobertura** das ações.

**Não alterar:**
- endpoints, regras de publicação e trava de edição;
- os modais de criar/editar;
- `PreviaItemAluno`, a não ser que seja preciso para a altura;
- as rotas;
- "Visualizar como aluno";
- as telas do aluno.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, em 1366px, 1920px e 390px, comparando com o número 1 de `modelos-tela-modulo.png`:

- **Professor**, em `/app/conteudos/1/modulos/2` (APIs e Integracao):
  - **Lista e roteiro:**
    - a lista de módulos tem títulos inteiros e contagens;
    - o roteiro mostra o passo 1 "teste conteudo" aberto, com o PDF grande, sem vazio embaixo;
    - o "Quiz do conteúdo" aparece pendurado sob o passo 1;
    - o passo 2 é "Quiz Sem Nota - Teste".
  - **Navegação:** "Próximo ›" abre o passo seguinte e fecha o atual; "Próximo módulo" troca de módulo.
  - **Ordem:** Mover para cima/baixo reordena, e a numeração se atualiza.
  - **Lote:** "Selecionar" mostra as caixas e o lote funciona.
  - **Publicar:** num rascunho, troca o selo sem recarregar.
- **Coordenador e Admin**, em Cursos › Desenvolvimento Web Full Stack › módulo 01: o mesmo roteiro, só com o publicado, "Somente leitura", sem ⋮ e com os KPIs no topo.
- **390px:** seletor de módulo no topo e roteiro em tela inteira, sem rolagem lateral.
- `npm run lint` e `npm test` sem erros novos.
