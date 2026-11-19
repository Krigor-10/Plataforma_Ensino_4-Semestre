# Prompt: tela do módulo no visual da referência do usuário + prévia em janela grande — Professor, Coordenador e Admin (frontend web)

## Contexto e decisões do usuário (2026-11-19)

**Histórico:**
- A versão B da tela do módulo (commit `b4ad8f0`) ficou com a trilha pequena e espaço sobrando à direita.
- O usuário escolheu o "Roteiro da aula" (`PROMPT-agente-tela-modulo-roteiro.md`), mas depois mandou uma **imagem de referência** e pediu:
  - **a tela igual à imagem;**
  - **a prévia numa janela grande** em vez de expandir no lugar;
  - **imagem com zoom;**
  - **quiz em formato de quiz;**
  - **fundos sólidos**, reaproveitando o relevo que o projeto já usa, para não ficar "vazado".
- Ele aprovou a proposta.

**Imagens aprovadas** (pasta `docs/TelaConteudosProfessor/`):
- `modulo-lista-e-janela.png`: a tela, a janela de imagem com zoom e a janela de quiz;
- `modulo-fundos-solidos.png`: os fundos sólidos.

**Este prompt substitui** `PROMPT-agente-tela-modulo-roteiro.md`, que não deve ser aplicado. Também substitui o layout da versão B (`PROMPT-agente-tela-modulo-trilha-versao-b.md`) e a correção `PROMPT-agente-trilha-cortada-correcao.md`.

**Continua valendo:**
- o professor vê tudo, menos arquivados;
- coordenador e Admin veem **só o publicado**, em somente leitura;
- reordenar é pelo **"Mover para cima/baixo" no ⋮**, sem arrastar;
- a seleção em lote é pelo modo "Selecionar";
- a trava de edição;
- as rotas `/app/conteudos/:cursoId/modulos/:moduloId` e `/app/cursos/:id/modulos/:moduloId`.

## Onde está (verificado pelo agente de arquitetura)

- **Professor:** `frontend/src/pages/workspace/TelaModuloGestaoProfessor.jsx` (≈ 825 linhas, versão B).
- **Coordenador/Admin:** `frontend/src/pages/workspace/TelaModuloGestao.jsx` (≈ 346 linhas), aberta por `PainelCursoGestao.jsx`, com os dados de `GET /Cursos/{id}/revisao-conteudo` (só o publicado, com questões e gabarito).
- **Prévia de hoje:** `frontend/src/components/PreviaItemAluno.jsx` (texto, imagem e PDF com "Ampliar", vídeo, link e quiz com gabarito).
- **Visualizadores:**
  - `components/VisualizadorImagem.jsx`, **sem zoom**;
  - `components/VisualizadorPdf.jsx`;
  - `components/GabaritoQuestoes.jsx`, que já desenha alternativas e anexos das questões.
- **Tokens de fundo e relevo que já existem** (`styles/base.css`):
  - fundos `--cor-fundo` (#191b21), `--cor-fundo-alt` (#1e2028) e `--cor-fundo-elevado` (#22242e);
  - relevo `--relevo-card-topo` e `--relevo-card-base`;
  - borda `--borda-card-modulo`.
  - Padrão em uso: `.conteudos-modulo--cartao` em `styles/workspace.css` ≈ linha 6640 ("relevo duplo", opção J4, 09/11).
- **Campos que não existem:** não há **duração** em `ConteudoDidatico` nem **descrição** em `Modulo`. **Não criar** esses campos neste prompt.

## Tarefa

### 1. Layout da tela (as duas telas), igual à referência

- **Linha do caminho:**
  - à esquerda, "Acadêmico › Conteúdos › Módulo" no professor e "Cursos › {curso} › Módulo" no coordenador/Admin;
  - à direita, só no **professor**, os botões "Visualizar como aluno", "Gerar quiz com IA", "Adicionar quiz" e "Novo conteúdo".
- **Cartão do curso** (largura total):
  - ícone grande (≈ 74px, quadrado roxo em degradê, ou a imagem do curso se houver);
  - nome do curso e descrição (`curso.descricao`);
  - embaixo, a **barra de progresso com a %**;
  - no canto superior direito, um **selo**:
    - **professor:** "N% publicado · N rascunhos" (a barra = % publicado);
    - **coordenador/Admin:** a situação do curso ("Em andamento", "Aguardando encerramento", "Encerrado" ou "À venda", a mesma regra da tela Inscrições) (a barra = progresso médio dos alunos, o que já existe como KPI "Progresso").
  - No coordenador/Admin, os 3 KPIs de hoje (Progresso, Conclusão, Desempenho médio) podem ficar logo abaixo do cartão, numa linha compacta.
- **Coluna da esquerda, módulos em cartões** (≈ 330px, rolagem própria):
  - número grande num quadrado (≈ 38px), título inteiro (até 2 linhas, sem cortar), embaixo "N itens • N rascunhos" (o rascunho em âmbar, só no professor; "0 itens" quando vazio) e uma seta ⌄ à direita;
  - o módulo atual fica com o número em roxo cheio, fundo roxo e barra roxa à esquerda;
  - clicar troca de módulo, sem recarregar.
- **Painel do módulo** (o resto da largura):
  - **Cabeçalho:** ícone redondo roxo (≈ 52px), título do módulo e embaixo "N conteúdos · N quizzes · **N rascunhos**" (o rascunho só no professor). À direita, a pílula "N itens".
  - **Itens como linhas grandes** (≈ 84px), um por conteúdo ou quiz, na ordem de hoje (conteúdos por `OrdemExibicao`, o quiz do conteúdo logo depois dele, os quizzes do módulo no fim). Cada linha tem:
    - **ícone grande** (≈ 58px, quadrado de cantos arredondados), com cor por tipo: verde para material e quiz publicado, roxo cheio para quiz em rascunho, seguindo a referência;
    - **título** (negrito) e embaixo a **descrição** do conteúdo, numa linha com reticências. Quiz do conteúdo: "Quiz do conteúdo "{título do conteúdo}"". Quiz do módulo: "Quiz do módulo";
    - **linha de dados em texto, com ícones pequenos:**
      - material: "▤ PDF" (ou Texto, Vídeo, Imagem, Link);
      - quiz: "☰ N questões";
      - depois, um separador "|" e o status: "✓ Publicado" (verde) ou "● Rascunho" (âmbar);
      - no coordenador/Admin, sem o status, porque só aparece publicado;
    - à direita, o **selo do tipo** em pílula ("Material", "Vídeo", "Imagem", "Link" ou "Quiz", com ícone), e o **⋮** (só no professor).
  - **Rodapé do painel:** "← Módulo anterior" (pílula escura) e "Próximo módulo: {título} →" (pílula roxa).
  - **Módulo vazio:** um cartão "Este módulo ainda não tem conteúdo" e, no professor, os botões de criar.

### 2. Fundos sólidos (sem efeito "vazado")

Reaproveitar os tokens que já existem. **Não criar cor nova** e **não usar fundo translúcido** nestes elementos:

| Elemento | Fundo | Borda e relevo |
|---|---|---|
| Página | `--cor-fundo` | — |
| Painel do módulo | `--cor-fundo-alt` | `--borda-card-modulo` + `--relevo-card-base` (igual a `.conteudos-modulo--cartao`) |
| Cartões de módulo e linhas de item | `--cor-fundo-elevado` | `--borda-card-modulo` + `--relevo-card-topo` e `--relevo-card-base` |
| Hover e item/módulo ativo | o roxo de destaque que o app já usa (borda `--cor-marca-clara` e fundo roxo sólido via `color-mix` com `--cor-fundo-elevado`) | — |
| Cartão do curso | degradê sólido roxo → `--cor-fundo-elevado` | — |

Funcionar no tema claro com os mesmos tokens (eles já têm os valores claros em `base.css`).

### 3. Clique e ações

- **A linha inteira é clicável** e abre a janela de prévia. Tab chega na linha e Enter abre.
- **O ⋮** (professor) **não** abre a janela. Tem: **Visualizar** (atalho para a janela), Editar, Publicar/Voltar para rascunho, Mover para cima, Mover para baixo, Arquivar e Excluir.
  - "Mover para cima" fica desativado no 1º item e "Mover para baixo" no último.
  - O quiz do conteúdo vai junto com o conteúdo.
- **Modo "Selecionar"** (botão ao lado da pílula "N itens", só no professor): mostra uma caixa de 14px em cada linha e a barra "N selecionados · Mais ações". Nesse modo, clicar na linha marca ou desmarca, sem abrir a janela.
- **Edição travada:** o ⋮ e os botões ficam desativados, mas abrir a janela funciona.

### 4. Janela de prévia (componente novo, por exemplo `JanelaPreviaItem.jsx`, usado nas duas telas)

- **Tamanho:** ≈ 1080px de largura (`min(1080px, 94vw)`) e 90% da altura da tela, centralizada, com o fundo escurecido.
- **Fechar:** Esc, clique fora ou o ✕.
- **Foco:** preso dentro da janela e devolvido à linha ao fechar. `role="dialog"` e `aria-modal`.
- **Topo:**
  - ícone do tipo, título e embaixo "Tipo · Módulo NN";
  - à direita, o selo Publicado/Rascunho e "Publicar"/"Voltar para rascunho" e "Editar" no professor; "Somente leitura" no coordenador/Admin; e o ✕.
- **Rascunho:** o aviso "Rascunho — os alunos ainda não veem este item."
- **Rodapé:** "← Anterior · Item X de N · Próximo →", que troca o item sem fechar a janela.
- **Corpo por tipo:**
  - **Imagem com zoom:**
    - a imagem começa ajustada à área;
    - barra no canto inferior direito com "−", a % atual, "+" e "Ajustar à tela", com passos de 25% e limite de 50% a 400%;
    - com zoom acima de 100%, **arrastar move a imagem**;
    - **Ctrl + rodinha** aproxima e afasta;
    - dica "Arraste para mover · Ctrl + rodinha para zoom";
    - fazer em `VisualizadorImagem.jsx` (prop `comZoom`) ou num componente novo, **sem quebrar** o uso atual do aluno.
  - **PDF:** as páginas grandes, com rolagem dentro da janela, usando o mesmo visualizador do `VisualizadorPdf`.
  - **Vídeo:** `<video controls>` grande.
  - **Texto:** formatado, com rolagem.
  - **Link:** um cartão com o endereço e "Abrir link" (nova aba).
  - **Quiz em formato de quiz:**
    - à esquerda, a lista "Questão 1, 2, 3…";
    - à direita, **uma questão por vez**: "Questão X de N · tipo · pontos", o enunciado (com os anexos e imagens da questão, como em `GabaritoQuestoes`) e as alternativas A, B, C…;
    - chave **"Mostrar gabarito"**, ligada por padrão: marca a resposta certa ("✓ Resposta certa") e mostra a explicação, se houver. Desligada, mostra a questão exatamente como o aluno vê;
    - rodapé "← Questão anterior / Próxima questão →". Na última questão, "Próximo →" vai para o próximo item;
    - questões do professor sob demanda, pelo mesmo endpoint da prévia de hoje; do coordenador/Admin, pelo `revisao-conteudo`.
  - **Sem arquivo ou sem questões:** a mensagem curta de hoje.
- **Responsivo:** abaixo de 768px, a janela ocupa a tela inteira.

### 5. Responsivo da tela

- **De 768px a 1199px:** a coluna de módulos com ≈ 260px; o selo do tipo pode virar só o ícone.
- **Abaixo de 768px:**
  - os módulos viram um seletor no topo ("Módulo 02 · APIs e Integracao ⌄");
  - as linhas ficam com o ícone de 44px, o selo do tipo some e fica o ⋮;
  - o cartão do curso fica compacto;
  - sem rolagem lateral.

### 6. Limpeza

- Remover da versão B o que deixar de ser usado: trilha com itens, coluna de prévia à direita, `.modulo-gestao__trilha-*` e similares. Não deixar CSS morto.
- `PreviaItemAluno` pode ser reaproveitado dentro da janela para texto, PDF, vídeo e link. Se ficar sem uso, remover.

### 7. Testes (vitest)

- **Layout:**
  - cartão do curso com o selo certo por perfil;
  - lista de módulos (troca de módulo, módulo atual destacado);
  - linhas na ordem certa (conteúdo → quiz do conteúdo → quizzes do módulo), com descrição, linha de dados e selo do tipo.
- **Clique:**
  - a linha abre a janela; o ⋮ não abre;
  - "Visualizar" no ⋮ abre;
  - no modo Selecionar, a linha marca em vez de abrir.
- **Janela:**
  - Esc fecha e devolve o foco;
  - Anterior/Próximo troca o item;
  - Publicar no professor;
  - "Somente leitura" no coordenador/Admin;
  - aviso de rascunho.
- **Zoom:** "+" e "−" mudam a %, com os limites; "Ajustar à tela" volta ao início.
- **Quiz:** uma questão por vez, navegação, "Mostrar gabarito" ligado e desligado, última questão leva ao próximo item.
- **Fundos:** os elementos do item 2 usam as classes e tokens previstos.
- Adaptar os testes de `SecaoConteudosProfessor.test.jsx`, `PainelCursoGestao.test.jsx` e `WorkspaceScreen.test.jsx`, **sem perder cobertura** das ações.

**Não alterar:**
- endpoints, regras de publicação e trava de edição;
- os modais de criar/editar;
- as rotas;
- "Visualizar como aluno";
- as telas do aluno, onde o `VisualizadorImagem` sem zoom continua igual;
- o modelo de dados: sem duração e sem descrição de módulo.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, em 1366px, 1920px e 390px, comparando com `modulo-lista-e-janela.png` e `modulo-fundos-solidos.png`:

- **Professor**, em `/app/conteudos/1/modulos/2`:
  - **Tela:** a tela segue a referência (cartão do curso com barra e selo, módulos em cartões com ⌄, painel com ícone redondo e "3 itens", linhas grandes com selo do tipo).
  - **Fundos:** os fundos são sólidos, e o degradê da página não aparece por trás dos cartões.
  - **Clique:** clicar em "teste conteudo" abre a janela com o PDF grande; "Próximo →" vai para o "Quiz do conteúdo", em formato de quiz.
  - **Quiz:** uma questão por vez; "Mostrar gabarito" marca a certa.
  - **Imagem:** um conteúdo de imagem abre com zoom ("+" para 125%, arrastar move, "Ajustar à tela" volta).
  - **⋮ e lote:** o ⋮ não abre a janela; Mover para cima/baixo reordena; o modo Selecionar faz lote.
- **Coordenador e Admin**, em Cursos › Desenvolvimento Web Full Stack › módulo 01: a mesma tela, só com o publicado, sem os botões e sem ⋮; a janela mostra "Somente leitura".
- **390px:** seletor de módulo, linhas compactas e janela em tela cheia.
- `npm run lint` e `npm test` sem erros novos.
