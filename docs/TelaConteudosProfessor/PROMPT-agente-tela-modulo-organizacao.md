# Prompt — Tela do módulo do professor: organização, quebra de texto e espaço (web)

## Contexto

Projeto CodeRyse Academy, frontend web em `frontend/` (React + Vite).

**Relato do usuário:** a tela do módulo do professor (Conteúdos › curso › módulo) está espremida e mal organizada:
- os botões de adicionar ficam no fim da lista;
- o canto direito do título fica vazio;
- o texto da prévia não quebra;
- os cartões da lista são grandes;
- o menu ⋮ abre cortado.

**Decisões do usuário:**
1. **Opção A:** "Novo conteúdo", "Adicionar quiz" e "Gerar quiz com IA" vão para o canto direito do título, lado a lado.
2. A lista fica só com os itens.
3. O texto da prévia quebra.
4. Os cartões ficam compactos.
5. A tela ganha mais largura.

**Referências visuais**, em `docs/TelaConteudosProfessor/` (os números amarelos explicam cada parte):
- `modulo-cabecalho-opcao-a.png`: layout aprovado;
- `modulo-compacto-exemplo.png`: cartões, menu ⋮ e quebra de texto.

Nomes de quizzes e de conteúdos nas imagens podem ser ilustrativos.

## O que o agente de arquitetura já verificou (não repetir)

Referências do commit `7e5ef67`. Confirme as linhas antes de editar. A tela logada não foi aberta por este agente.

**Cabeçalho e botões**
- O cabeçalho é `modulo-gestao__cabecalho` (`TelaModuloGestaoProfessor.jsx` ≈ linha 479), já com `display: flex` e `justify-content: space-between` (`workspace.css` ≈ linhas 9628-9634). Hoje só tem o bloco da esquerda.
- Os botões de adicionar aparecem em 2 lugares:
  - no estado vazio do módulo (≈ linha 515);
  - no fim da lista (≈ linhas 736-748).
- "Gerar quiz com IA" só aparece quando o módulo tem conteúdo do tipo 1 ou 2 (≈ linha 743).
- Os dois grupos só aparecem quando `edicaoTravada` é falso (≈ linhas 514 e 734). É a trava de edição de curso concluído.
- Os textos atuais dos botões são "Novo conteúdo", "Adicionar Quiz" (com Q maiúsculo) e "Gerar quiz com IA".
- `SecaoConteudosProfessor.test.jsx` (≈ linhas 612-630) clica nos botões pelo nome "Novo conteúdo" e "Adicionar Quiz", inclusive em módulo vazio.
- A tela do módulo do Coordenador e do Admin (`TelaModuloGestao.jsx` ≈ linha 169) usa as mesmas classes `modulo-gestao*`. Mudanças no CSS dessas classes valem para as duas telas. O Coordenador e o Admin não têm botões de adicionar.

**Barra de seleção e troca de módulo**
- A barra "Selecionar tudo / Mais ações" é `atividades-curso__barra-selecao` (≈ linha 528), no topo da lista.
- "Módulo anterior" e "Próximo módulo" ficam em `modulo-gestao__rodape` (≈ linha 815).

**Texto que não quebra**
- `.previa-item-aluno__texto` (`workspace.css` ≈ linha 9974) usa `white-space: pre-wrap`, mas não tem `overflow-wrap`.
- `.previa-item-aluno__corpo` (≈ linha 9965) tem `overflow-y: auto`, o que também deixa a rolagem horizontal automática. A linha roxa curta que aparecia acima de "Editar" é, muito provavelmente, essa barra horizontal.
- `PreviaItemAluno.jsx` também é usada na tela do módulo do Coordenador e do Admin (`TelaModuloGestao.jsx`).

**Menu ⋮ cortado**
- `.modulo-gestao__item-cartao` (≈ linha 9724) tem `overflow: hidden`.
- O menu (`MenuAcoes.jsx`, `.menu-contexto__lista`, ≈ linha 3672) é `position: absolute` dentro do cartão, sem portal.
- A lista tem `overflow-y: auto` a partir de 768px, o que também corta o menu.

**Espaço**
- `.layout-principal` limita a página a 1280px (`layout.css` ≈ linha 26).
- A lista tem 320px (768px+) e 400px (1024px+).
- O cartão leva caixa de seleção, ícone de 2,75rem, título, selo e ⋮ na mesma linha. Com isso, o título quebra em 2 linhas.

## Tarefa

### 1. Botões no cabeçalho (imagem A, números 1 e 2)

1. Mova o grupo de botões para dentro de `modulo-gestao__cabecalho`, à direita do bloco do título, alinhado ao título.
2. A ordem da esquerda para a direita é: "Gerar quiz com IA" (quando permitido), "Adicionar quiz" e "Novo conteúdo".
3. "Novo conteúdo" é o botão principal, com variante primária.
4. Mantenha as cores atuais de quiz e de IA, o ícone e o texto de cada botão, incluindo "Adicionar Quiz".
5. Mantenha as duas regras atuais: o grupo some quando `edicaoTravada` é verdadeiro, e "Gerar quiz com IA" só aparece com conteúdo do tipo 1 ou 2.
6. Remova o grupo do fim da lista (≈ linhas 736-748).
7. No estado vazio do módulo, deixe só a mensagem, porque os botões já ficam no cabeçalho.
8. Coloque uma linha fina `1px var(--cor-borda)` abaixo do cabeçalho, separando do corpo.
9. Em telas estreitas, os botões descem para baixo do título e quebram linha sem rolagem horizontal.

### 2. Lista só com itens (imagem A, número 3)

1. A barra de seleção fica fixa no topo da coluna da lista ao rolar, com `position: sticky` e o mesmo fundo do painel.
2. A lista e a prévia começam e terminam na mesma altura (imagem A, número 4).
3. "Módulo anterior" e "Próximo módulo" continuam no rodapé.

### 3. Quebra de texto

1. Em `.previa-item-aluno__texto`, adicione `overflow-wrap: anywhere;`.
2. Em `.previa-item-aluno__corpo`, adicione `overflow-x: hidden;`.
3. Confira os outros textos da prévia, como endereço de link e título, com palavra longa.

### 4. Menu ⋮ inteiro

1. O menu dos cartões precisa abrir inteiro: não pode ser cortado pelo cartão nem pela rolagem da lista.
2. Prefira renderizar a lista do `MenuAcoes` em portal com posição calculada, como o menu de `SecaoProfessores.jsx`, abrindo para cima quando faltar espaço embaixo.
3. Se mudar `MenuAcoes`, confira as outras telas que o usam.
4. O menu deve continuar acessível pelo teclado: setas, Esc, fechar ao clicar fora e foco voltando ao botão ⋮. Ele também deve fechar ou acompanhar o botão quando a lista rolar.

### 5. Cartões compactos

Nas telas do módulo do Professor e do Coordenador/Admin:

1. Ícone de 2rem, só nesta tela.
2. Padding menor no cartão.
3. O selo de status desce para a linha de baixo: "Texto · Publicado".
4. O título usa no máximo 2 linhas, com reticências depois disso.
5. Mantenha a caixa de seleção, o ⋮ e o destaque do item aberto.

### 6. Mais largura

1. Só na tela do módulo, deixe a página passar de 1280px, até cerca de 1600px. Isso vale para o Professor e para o Coordenador/Admin, que usam o mesmo `.modulo-gestao`. As outras telas continuam com 1280px.
2. A lista fica com cerca de 360px a partir de 1024px.
3. O espaço que sobrar vai para a prévia.
4. Nenhum elemento pode sair da altura fixa de `.modulo-gestao`.

### 7. Testes

1. Os testes atuais de `SecaoConteudosProfessor.test.jsx` que clicam em "Novo conteúdo" e "Adicionar Quiz" devem continuar passando. Deve existir um só botão de cada na tela.
2. Acrescente testes para:
   - os botões ficam no cabeçalho, e não no fim da lista;
   - os botões somem com `edicaoTravada`;
   - "Gerar quiz com IA" só aparece com conteúdo do tipo 1 ou 2;
   - o menu ⋮ abre com todas as opções.

## Não fazer

- Não alterar as regras de publicar, editar ou gerar quiz com IA.
- Não alterar a regra global de `svg` nem `CartaoEstatistica`.
- Não alterar os cartões das outras telas que usam `.atividades-curso__*`.
- Não usar `VITE_DEMO_MODE` para verificar.

## Critérios de aceite

Verifique no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como professor em 1366px, 1920px e 375px. Confira a quebra de texto e os cartões também como coordenador.

- [ ] Os 3 botões ficam no canto direito do título, com "Novo conteúdo" como principal, e não aparecem mais no fim da lista.
- [ ] "Gerar quiz com IA" continua aparecendo só quando o módulo permite.
- [ ] Módulo sem conteúdo mostra a mensagem, e os botões do cabeçalho funcionam.
- [ ] Em curso com edição travada, os botões não aparecem no cabeçalho.
- [ ] Como coordenador, a tela do módulo não ganha botões de adicionar, mas ganha a mesma largura e os mesmos cartões.
- [ ] O menu ⋮ funciona pelo teclado (setas, Esc) e fecha ao clicar fora.
- [ ] Tema claro e tema escuro legíveis.
- [ ] A barra de seleção fica visível ao rolar a lista.
- [ ] A lista e a prévia ficam alinhadas no topo e na base.
- [ ] Palavra longa sem espaço quebra dentro da prévia, sem barra horizontal.
- [ ] O menu ⋮ abre inteiro em qualquer cartão, inclusive no último e no quiz dentro de um conteúdo.
- [ ] Os cartões ficam mais baixos, com o status na linha de baixo.
- [ ] Em 1920px a tela usa mais largura, e a prévia fica maior que hoje.
- [ ] Em 375px, os botões quebram linha, e a prévia em tela cheia continua funcionando.
- [ ] A tela fica parecida com `modulo-cabecalho-opcao-a.png`.
- [ ] `npm run lint` e `npm test` sem erros novos.
