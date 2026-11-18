# Prompt: fluxo do professor igual ao do coordenador + prévia "como o aluno vê" para Professor, Coordenador e Admin (frontend web)

## Contexto e decisões do usuário (2026-11-17)

Dois pedidos do usuário, planejados juntos:
1. **O professor revisa antes de publicar.** Depois de adicionar um conteúdo ao módulo, o professor precisa **ver e revisar** o item como o aluno vai ver, **antes de publicar**.
   - Hoje não dá: "Visualizar como aluno" (`PreviaTrilhaAluno`) mostra só o que já está publicado.
2. **O coordenador vê o conteúdo de verdade.** O painel da direita da tela do módulo do coordenador tem um **espaço vazio grande**. Hoje ele mostra só o tipo ("IMAGEM") e o botão "Abrir arquivo".
   - Esse espaço deve mostrar o conteúdo **como o aluno vê**.
3. **Caixa de seleção menor** na tela de conteúdos do professor.
4. **O Admin também** (pedido de 2026-11-18): o Admin vê os conteúdos dos cursos pela **mesma tela do módulo** do coordenador, então a prévia nova vale para ele também.
   - Verificado: `SecaoCursos.jsx` abre `PainelCursoGestao` com `perfil="Admin"` ou `"Coordenador"`, e os dois usam a mesma `TelaModuloGestao` e o mesmo `GET /Cursos/{id}/revisao-conteudo`.
   - **Decisão do usuário:** o Admin e o coordenador continuam vendo **só o que está publicado** (o mesmo que o aluno vê), em somente leitura. Rascunho é trabalho do professor e **não** aparece para eles. Nada muda no backend.

**Decisões, uma por vez:**
- **O fluxo do professor fica igual ao do coordenador:** curso › lista de módulos › **tela do módulo**, com a lista à esquerda e a prévia à direita. O professor **mantém as ferramentas de edição**.
- **A entrada continua em Acadêmico › Conteúdos** (escolher o curso). As abas Avaliações e Progresso do professor **não mudam**. O professor **não** passa a usar a tela de curso do coordenador.
- **Uma prévia só**, o mesmo componente nas duas telas. A diferença é que, no professor, ela mostra rascunho e tem botões de ação; no coordenador, é somente leitura.

**Imagens aprovadas** (pasta `docs/TelaConteudosProfessor/`):
- `fluxo-professor-igual-coordenador.png`: a referência principal, com as 3 telas;
- `previa-conteudo-imagem.png`: como fica um conteúdo de imagem;
- `opcoes-previa-e-checkbox.png`: a caixa de seleção e os estados do menu ⋮.

## Onde está (verificado pelo agente de arquitetura)

- **Professor:** `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx` (≈ 2.100 linhas).
  - Hoje mostra todos os módulos em acordeão numa página só. Cada módulo tem "Selecionar tudo / Mais ações" (ações em lote **por módulo**), itens com selo, ⋮ (Editar, Publicar/Rascunho, Mover, Arquivar, Excluir) e os botões "Novo conteúdo / Adicionar quiz / Gerar quiz com IA".
  - No topo: "Novo módulo", "Visualizar como aluno" e "Concluir curso" (≈ linha 1442).
  - Trava de edição: `edicaoTravada` (≈ linha 1013).
  - Os modais de criar/editar conteúdo e quiz e de excluir já existem nesse arquivo.
- **Caixa de seleção:** classe `.tabela-checkbox` (`styles/workspace.css` ≈ linha 9074), com 16px, `accent-color` e o visual nativo branco. Usada só nesse arquivo.
  - Alvo de toque: `.atividades-curso__checkbox-alvo` (≈ linha 4506), que cresce para 2.75rem em telas de toque.
- **Coordenador / Admin:**
  - `PainelCursoGestao.jsx` (lista de módulos) abre `TelaModuloGestao.jsx` (≈ 380 linhas): lista à esquerda, painel à direita com `LeituraItemConteudo`, "Anterior / Próximo" e "Módulo anterior / Próximo módulo".
  - Os dados vêm de `GET /Cursos/{id}/revisao-conteudo` (só Admin/Coordenador; só o que está publicado, com questões e gabarito).
- **Leitura de hoje:** `components/LeituraItemConteudo.jsx`. Material mostra tipo, descrição e "Abrir arquivo/link"; quiz mostra `GabaritoQuestoes`.
- **Como o aluno vê** (`SecoesAluno.jsx`, `obterAcaoConteudoAluno` ≈ linha 2771):
  - texto: a descrição;
  - PDF e imagem: abrem em `components/VisualizadorPdf.jsx` / `components/VisualizadorImagem.jsx`;
  - vídeo e link: abrem em nova aba.
  - Helpers em `components/PreviaTrilhaAluno.jsx`: `obterIconeTipoConteudo` e `obterLinkArquivoConteudo`.

## Tarefa — em 3 etapas, nesta ordem (cada uma testável sozinha)

### Etapa 1 — Prévia compartilhada + Coordenador e Admin

1. **Criar `components/PreviaItemAluno.jsx`**, que mostra **um** item como o aluno vê:
   - **Cabeçalho:** o título, o tipo em maiúsculas e, à direita, um selo que muda por tela ("Somente leitura" no coordenador; "Publicado" ou "Rascunho" no professor).
   - **Texto:** a descrição formatada, com quebras de linha.
   - **Imagem:**
     - a imagem **inteira**, sem cortar (`object-fit: contain`), com fundo escuro nas sobras, a largura do painel e no máximo ≈ 300px de altura;
     - botão **"Ampliar"** no canto, que abre `VisualizadorImagem` em tela cheia.
   - **PDF:** a 1ª página (embutida, ≈ 300px de altura) e o botão **"Abrir PDF"**, que abre `VisualizadorPdf` em tela cheia. Se não der para embutir, mostrar um cartão com o ícone e o botão.
   - **Vídeo:** `<video controls preload="metadata">` tocando no próprio painel.
   - **Link:** um cartão com o endereço e o botão "Abrir link" (nova aba, `rel="noreferrer"`).
   - **Quiz:** as questões com a resposta certa marcada (`GabaritoQuestoes`), como hoje.
   - **Sem arquivo ou sem questões:** mensagem curta ("Este item ainda não tem arquivo." / "Este quiz ainda não tem questões.").
   - **Props:**
     - `item` (o mesmo formato de `LeituraItemConteudo`);
     - `questoes`;
     - `selo`;
     - `aviso` (texto opcional, por exemplo o aviso de rascunho);
     - `rodape` (nó opcional, para os botões do professor).
2. **`TelaModuloGestao.jsx`** (usada pelo **Coordenador e pelo Admin**): trocar `LeituraItemConteudo` por `PreviaItemAluno` com o selo "Somente leitura".
   - **Igual para os dois perfis:** só itens publicados, sem botões de edição, sem aviso de rascunho. Não precisa de prop de perfil.
   - **Não muda:** a lista, os KPIs, Anterior/Próximo e a troca de módulo. O espaço vazio deixa de existir.
   - Se `LeituraItemConteudo` ficar sem uso, remover o componente e o CSS dele.

### Etapa 2 — Tela do módulo do professor

3. **Criar a tela do módulo do professor**, no mesmo formato de `TelaModuloGestao`. De preferência, reaproveitar a estrutura dela com uma prop de modo (`modo="professor"`) em vez de copiar.
   - **Topo:** o caminho "Acadêmico › Conteúdos › {curso} › {módulo}", o número e o título do módulo, e "N conteúdos · N quizzes · módulo X de Y · **N rascunhos**" (em âmbar). Sem os KPIs do coordenador.
   - **Lista à esquerda:** as seções Conteúdos e Quizzes do módulo. **Mostra rascunhos** (o professor vê tudo, menos arquivados, como hoje). O quiz vinculado ao conteúdo fica logo abaixo dele, com recuo.
     - Cada item tem: caixa de seleção, ícone, título, tipo, selo Publicado/Rascunho e o menu ⋮ de hoje (Editar, Publicar/Voltar para rascunho, Mover para cima/baixo, Arquivar, Excluir).
     - No topo da lista: "Selecionar tudo · N selecionados" e "Mais ações" (as ações em lote de hoje).
     - Embaixo: "Novo conteúdo", "Adicionar quiz" e "Gerar quiz com IA".
     - Clicar no item (fora da caixa de seleção e do ⋮) abre a prévia e destaca o item (fundo roxo leve e barra roxa à esquerda, como no coordenador).
   - **Prévia à direita:** `PreviaItemAluno` com:
     - selo "Publicado" ou "Rascunho";
     - para rascunho, o aviso "**Rascunho — os alunos ainda não veem este item.**";
     - rodapé com **"Editar"** (abre o modal de edição que já existe), **"Publicar"** (ou "Voltar para rascunho") e **"‹ Anterior · Item X de N · Próximo ›"**.
   - **Questões do quiz:** carregar sob demanda pelo mesmo endpoint que a edição do quiz já usa, sem endpoint novo.
   - **Ao abrir a tela:** a prévia mostra o 1º item. Se o módulo estiver vazio: "Nenhum conteúdo neste módulo ainda." e os botões de criar.
   - **Rodapé da tela:** "Módulo anterior / Próximo módulo: {título}", como no coordenador.
   - **Edição travada** (`edicaoTravada`): os botões de editar, publicar, mover e excluir e os de criar ficam desativados, como hoje. A prévia continua funcionando.
   - Publicar, editar ou excluir atualiza a lista e a prévia sem recarregar a página. Excluir o item aberto abre o próximo.

### Etapa 3 — Lista de módulos do professor + caixa de seleção

4. **Acadêmico › Conteúdos › curso** deixa de mostrar o acordeão e passa a mostrar a **lista de módulos** no visual de `PainelCursoGestao`:
   - **um cartão por módulo:** número, título, "N conteúdos · N quizzes · **N rascunhos**" (âmbar; "tudo publicado" em verde; "vazio" neutro), uma barra de **% publicado** com o número, a seta › e o ⋮ do módulo (Editar módulo, Excluir módulo);
   - **clicar no cartão** abre a tela do módulo (etapa 2);
   - **no topo continuam:** o título do curso, "N% publicado · Falta publicar: N", "Novo módulo", "Visualizar como aluno" e "Concluir curso" (com a mesma trava de hoje);
   - **"Voltar"** da tela do módulo volta para esta lista.
5. **Caixa de seleção** (`.tabela-checkbox`):
   - **14px**, `appearance: none`, cantos de 4px, borda `1.5px solid rgba(255,255,255,.35)` e fundo `rgba(0,0,0,.25)`;
   - **marcada:** fundo e borda `var(--cor-marca)`, com ✓ branco (pseudo-elemento);
   - **indeterminada:** um traço branco;
   - **foco por teclado:** anel roxo;
   - **tema claro:** borda `rgba(0,0,0,.3)` e fundo branco;
   - o alvo de toque (`.atividades-curso__checkbox-alvo`) continua grande em telas de toque.

**Não alterar:**
- as regras de publicação, as rotas e os endpoints;
- os modais de criar/editar conteúdo e quiz;
- "Visualizar como aluno" (continua mostrando só o publicado);
- as abas Avaliações e Progresso do professor;
- a tela de curso do coordenador e do Admin (`PainelCursoGestao`), que só ganha a prévia nova através de `TelaModuloGestao`;
- o endpoint `revisao-conteudo` (continua só com o publicado);
- as telas do aluno.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, comparando com `fluxo-professor-igual-coordenador.png`:

**Coordenador**, em Cursos › Desenvolvimento Web Full Stack › módulo 01:
- clicar em "teste conteudo imagem" mostra a imagem inteira no painel, e "Ampliar" abre em tela cheia;
- o PDF mostra a 1ª página e "Abrir PDF";
- o texto mostra a descrição;
- o quiz mostra as questões com o gabarito;
- não há mais espaço vazio, e "Somente leitura", "Anterior/Próximo" e a troca de módulo continuam.

**Admin**, logado como Admin, em Cursos › Desenvolvimento Web Full Stack › módulo 01:
- a mesma prévia do coordenador (imagem com "Ampliar", PDF, texto, quiz com gabarito), em "Somente leitura";
- os rascunhos do professor **não** aparecem;
- as ações de Admin da tela do curso (venda, coordenador do curso etc.) continuam iguais.

**Professor**, em Acadêmico › Conteúdos › Desenvolvimento Web Full Stack:
- **Lista de módulos:** aparece a lista de 4 módulos em cartões, com rascunhos e % publicado; "Novo módulo", "Visualizar como aluno" e "Concluir curso" continuam no topo.
- **Abrir um módulo:** clicar no módulo 01 abre a tela do módulo, com a lista à esquerda (incluindo os rascunhos) e a prévia do 1º item à direita.
- **Revisar um rascunho:** clicar em "teste conteudo quiz" mostra o aviso de rascunho e as questões. "Publicar" muda o selo na lista e na prévia sem recarregar, e "Editar" abre o modal de hoje.
- **Navegar:** "Próximo ›" percorre os itens do módulo, e "Próximo módulo" troca de módulo.
- **Ações:** seleção em lote, ⋮, mover, excluir e criar (conteúdo, quiz, quiz com IA) funcionam como hoje.
- **Curso concluído ou encerrado:** as ações ficam desativadas, mas a prévia funciona.
- **Caixa de seleção:** 14px, escura, roxa quando marcada, com traço quando indeterminada; o Tab mostra o anel de foco.

**Testes e build:**
- **vitest:**
  - `PreviaItemAluno` em cada tipo (texto, imagem com Ampliar, PDF, vídeo, link, quiz, sem arquivo);
  - `TelaModuloGestao` usando a prévia, renderizada com `perfil` Coordenador e com `perfil` Admin pelo `PainelCursoGestao`;
  - lista de módulos do professor abrindo a tela do módulo;
  - prévia do professor com aviso de rascunho, Publicar e Editar;
  - Anterior/Próximo;
  - trava de edição;
  - os testes de `SecaoConteudosProfessor.test.jsx` adaptados ao novo fluxo, sem perder a cobertura das ações de hoje.
- `npm run lint` e `npm test` sem erros novos.
