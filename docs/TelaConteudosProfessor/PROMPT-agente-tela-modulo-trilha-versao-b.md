> **LAYOUT SUBSTITUÍDO em 2026-11-18** por `PROMPT-agente-tela-modulo-lista-e-janela.md` (o roteiro também foi substituído em 19/11) ("Roteiro da aula"). A versão B já foi aplicada (`b4ad8f0`) e serve só de histórico; o novo prompt diz o que manter e o que remover.

# Prompt — Tela do módulo: trilha do curso à esquerda e prévia larga (versão B, web)

## Contexto

Projeto CodeRyse Academy, frontend web em `frontend/` (React + Vite).

**Pedido do usuário:** reorganizar a tela do módulo (Conteúdos › curso › módulo) com olhar de design. Ele escolheu a **versão B** gerada no Stitch:
- os módulos do curso numa trilha à esquerda;
- os itens dentro do módulo aberto;
- a prévia larga, com as ações no topo.

**Referência visual:** `docs/TelaConteudosProfessor/stitch-modulo-versao-b-anotada.png` (original sem anotação: `stitch-modulo-versao-b.png`).
- Números amarelos: o que implementar.
- Números vermelhos: o que **não** copiar. Isso inclui "Docente Líder", o rodapé de copyright, o estilo diferente das abas, títulos e botões quebrando em 2 linhas e texto centralizado na vertical.

O visual segue o design atual do app: cores, `Botao`, `Insignia` e ícones. A imagem serve para a organização, não para trocar o tema.

**Este prompt substitui a organização da lista definida nos prompts anteriores desta tela.** Mantenha o que já foi aplicado e continua valendo:
- quebra de texto na prévia;
- menu ⋮ em portal;
- botão "Ampliar" igual para imagem e PDF;
- botões de adicionar no cabeçalho;
- trava `edicaoTravada`.

## O que o agente de arquitetura já verificou (não repetir)

Leitura do código em 2026-11-18, sobre o commit `7e5ef67` **mais alterações ainda sem commit** em `PreviaItemAluno.jsx`, `PreviaItemAluno.test.jsx`, `TelaModuloGestao.jsx`, `TelaModuloGestaoProfessor.jsx`, `SecaoConteudosProfessor.test.jsx` e `workspace.css`. Não as descarte, e confirme as linhas antes de editar. A tela logada não foi aberta por este agente.

**As duas telas**
- `TelaModuloGestaoProfessor.jsx` (Professor) e `TelaModuloGestao.jsx` (Coordenador/Admin, só leitura, via `PainelCursoGestao.jsx` ≈ linha 377) já recebem `modulosOrdenados` e `moduloId`.
- As duas calculam `moduloAnterior` e `moduloProximo` e trocam de módulo com `irParaModulo(id)`. No Professor, isso navega para `/app/conteudos/{cursoId}/modulos/{id}` (≈ linha 221).
- Não precisa de dado novo do backend: a trilha usa `modulosOrdenados`.

**Navegação atual**
- "Módulo anterior" e "Próximo módulo" ficam no rodapé `modulo-gestao__rodape` (Professor ≈ linhas 803-808, Coordenador ≈ linhas 343-348).
- O "← Voltar" é `BotaoVoltar` (Professor ≈ linha 477, Coordenador ≈ linha 170). Em seguida vem o caminho `modulo-gestao__migalha`.

**Seleção em lote**
- A seleção usa `itensSelecionados` (≈ linha 117). A barra "Selecionar tudo / Mais ações" fica sempre visível.

**Prévia**
- `PreviaItemAluno.jsx` recebe `aviso`, `item`, `questoes`, `rodape` e `selo` (≈ linha 130).
- No Professor, "Editar" e "Publicar / Voltar para rascunho" vão dentro de `rodape`, junto com "Anterior · Item X de Y · Próximo".

**Testes que dependem do layout atual**
- `PainelCursoGestao.test.jsx` ≈ linhas 658-660 clica em "Módulo anterior" e "Próximo módulo: …".
- `SecaoConteudosProfessor.test.jsx` ≈ linhas 922-1112 clica em "Mais ações".

## Tarefa

### 1. Trilha do curso à esquerda (imagem, números 1 e 2)

1. Substitua a coluna da lista por uma trilha de cerca de 320px, com rolagem própria e altura total da área.
2. **No topo da trilha:** "← {título do curso}", que volta para a lista de módulos (a mesma ação de `voltarParaModulos`). Esse link substitui o `BotaoVoltar` e o caminho `modulo-gestao__migalha` desta tela, o que também resolve o Voltar que sumia com a sidebar aberta.
3. **Módulos do curso:** liste todos os de `modulosOrdenados`, cada um com o número no formato de `NumeroModulo` e o título em 1 linha com reticências.
   - O módulo atual fica aberto e destacado, em roxo.
   - Os outros ficam fechados, e clicar neles chama `irParaModulo(id)`.
4. **Dentro do módulo aberto:**
   - Os grupos "Conteúdos" e "Quizzes do módulo", com os itens em linhas finas, sem cartão e com a mesma altura.
   - Cada linha tem ícone colorido do tipo, título em 1 linha com reticências e `title` com o nome completo, tipo e status como ponto colorido com texto pequeno (verde para Publicado, âmbar para Rascunho).
   - O quiz ligado a um conteúdo fica recuado, com uma linha vertical fina.
   - O item aberto ganha fundo roxo leve e contorno, e o ⋮ aparece no hover, no foco e no item aberto.
5. Remova o rodapé "Módulo anterior / Próximo módulo" das duas telas.

### 2. Seleção sob demanda (imagem, número 3)

Só na tela do Professor:

1. Um botão discreto "Selecionar", à direita do rótulo "Itens do módulo", liga e desliga o modo de seleção.
2. Fora do modo de seleção, a trilha não mostra caixas de seleção nem "Mais ações".
3. No modo de seleção, aparecem as caixas, o "Selecionar tudo", o contador e "Mais ações", com as ações atuais em lote. "Concluir" ou "Cancelar" sai do modo e limpa a seleção.
4. Com `edicaoTravada`, o botão "Selecionar" não aparece.

### 3. Cabeçalho enxuto (imagem, número 4)

1. Uma linha só: número do módulo e título, que é cortado com reticências se faltar espaço, e o resumo "3 conteúdos · 4 quizzes · 3 rascunhos".
2. À direita, os 3 botões que já existem: "Gerar quiz com IA" (com a regra atual), "Adicionar Quiz" e "Novo conteúdo". Mantenha a trava `edicaoTravada`.
3. Botões e resumo não podem quebrar linha a partir de 1366px.
4. Na tela do Coordenador/Admin, o cabeçalho fica igual, sem os botões.

### 4. Prévia larga com ações no topo (imagem, número 5)

1. A prévia ocupa todo o resto da largura.
2. Acrescente em `PreviaItemAluno` uma prop de ações no cabeçalho, por exemplo `acoesCabecalho`, renderizadas à direita do título e do selo.
3. No Professor, passe "Voltar para rascunho" ou "Publicar" (botão discreto) e "Editar" (contorno) para o cabeçalho, e retire esses botões do rodapé.
4. O rodapé da prévia fica só com "← Anterior · Item X de Y · Próximo →".
5. O conteúdo começa no topo do corpo, nunca centralizado na vertical.
6. Na tela do Coordenador/Admin, a prévia continua só leitura, com o selo "Somente leitura".

### 5. Responsivo

- **De 768px a 1023px:** trilha de cerca de 280px e prévia no resto.
- **Abaixo de 768px:** a trilha ocupa a tela inteira, como a lista hoje, e abrir um item segue em tela cheia, como já funciona. Os módulos fechados continuam clicáveis para trocar de módulo.

### 6. Testes

1. Atualize `PainelCursoGestao.test.jsx`: a troca de módulo passa a ser pelo item do módulo na trilha.
2. Atualize os testes de "Mais ações" em `SecaoConteudosProfessor.test.jsx`: primeiro ligar "Selecionar", depois abrir "Mais ações".
3. Acrescente testes para:
   - clicar em outro módulo na trilha navega para ele;
   - sem modo de seleção não há caixas;
   - com `edicaoTravada` não há "Selecionar";
   - "Editar" fica no cabeçalho da prévia.

## Não fazer

- Não alterar backend nem endpoints.
- Não alterar as regras de publicar, editar, excluir, arquivar, reordenar ou gerar quiz com IA.
- Não copiar da imagem os elementos marcados em vermelho.
- Não alterar `mobile/` e `desktop/`.
- Não usar `VITE_DEMO_MODE` para verificar.

## Critérios de aceite

Verifique no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como professor e como coordenador, em 1366px, 1920px e 375px, com a sidebar aberta e recolhida:

- [ ] A trilha mostra os 4 módulos do curso, com o atual aberto e destacado. Clicar em outro módulo abre esse módulo.
- [ ] "← {curso}" no topo da trilha volta para a lista de módulos e está sempre visível.
- [ ] O rodapé "Módulo anterior / Próximo módulo" não existe mais.
- [ ] Os itens têm a mesma altura e título em 1 linha, com o nome completo no hover e status em ponto colorido.
- [ ] Professor: sem modo de seleção não há caixas nem "Mais ações". Ao ligar "Selecionar", as ações em lote funcionam como antes.
- [ ] O cabeçalho fica em 1 linha, com os 3 botões no professor e nenhum botão no coordenador.
- [ ] "Editar" e "Publicar / Voltar para rascunho" ficam no topo da prévia. O rodapé tem só Anterior, contador e Próximo.
- [ ] Com `edicaoTravada`, nada de editar, adicionar ou selecionar aparece.
- [ ] Em 375px, a trilha e a prévia em tela cheia funcionam.
- [ ] Tema claro e tema escuro legíveis.
- [ ] A tela fica parecida com a imagem de referência nos pontos amarelos.
- [ ] `npm run lint` e `npm test` sem erros novos.
