# Prompt — Quiz vinculado e texto repetido na tela de Conteúdos do professor (web)

## Contexto

Refinamento de `TrilhaConteudosProfessor` (`frontend/src/pages/workspace/SecaoConteudosProfessor.jsx` e `frontend/src/styles/workspace.css`). Referência visual: `docs/TelaConteudosProfessor/sugestao quiz vinculado.png`. Use a imagem só para os pontos descritos aqui; o restante da tela não muda.

**Objetivo:** quando um quiz pertence a um conteúdo, os dois devem parecer um só bloco, sem repetir o mesmo nome.

**Só frontend e só exibição:** nenhum título ou descrição salvos são alterados. Sem rota nova e sem dependência nova. Verifique no app real (`http://127.0.0.1:5173`, com o backend local). Não use modo demo.

**Antes de começar:** há alterações não commitadas nesta tela. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-06.

**Escopo do CSS:** tudo sob `.tela-conteudos`. "Visualizar como aluno", o modal "Ver arquivados", as telas do aluno, Módulos e Avaliações não mudam.

## 1. Conteúdo e quiz como um só bloco

- Sem divisória entre o conteúdo e seus quizzes. A divisória de ponta a ponta fica depois do último quiz do conjunto.
- Caixas de seleção **todas na mesma coluna**. Hoje a do quiz vinculado fica recuada.
- O recuo vale só para o ícone do quiz, que começa na coluna do título do conteúdo.
- Selo, Editar e ⋮ continuam alinhados com as outras linhas.
- Quiz vinculado mais compacto: ícone de cerca de `1.75rem`, uma linha só e menos altura que a linha do conteúdo.
- Fundo do quiz igual ao do conteúdo, sem faixa própria (`workspace.css:4167`).

## 2. Linha de ligação

Substituir a guia vertical atual (`.tela-conteudos .atividades-curso__quizzes`, linha 4198):

- A linha sai de baixo do ícone do conteúdo e faz uma curva até o ícone do quiz, parando antes de encostar nele.
- Com vários quizzes, a linha vertical continua até o último, com uma curva para cada um.
- Com o conteúdo aberto, a linha atravessa a área da descrição sem interrupção.
- Usar pseudo-elemento, cor discreta (como `--cor-borda-forte`) e `aria-hidden` implícito: sem elemento extra para leitor de tela.

## 3. Descrição repetida

Por volta da linha 1536, `temDescricao` é `Boolean(conteudo.descricao)`.

- Criar um helper que compare descrição e título ignorando maiúsculas, acentos e espaços nas pontas.
- Descrição vazia ou igual ao título conta como **sem descrição**: sem seta, sem expansão e sem painel.

### Painel da descrição

Hoje a descrição está pequena, colada na divisória e desalinhada: ela fica à esquerda do título porque `padding-left` (`workspace.css:4829`) não considera a coluna das caixas de seleção nem o `padding` da linha. Ajustar em `.tela-conteudos .atividades-curso__previa`:

- **Tamanho:** `font-size: 0.92rem`, igual ao título da linha (`.atividades-curso__item-titulo`), com peso normal e `line-height: 1.55`. A cor continua `--cor-texto-suave`.
- **Alinhamento:** o texto começa exatamente na coluna do título do conteúdo, inclusive com a caixa de seleção. Calcule com os mesmos valores da linha, sem número solto.
- **Divisória:** com o conteúdo aberto, tirar a divisória entre a linha e a descrição. Título e descrição ficam na mesma faixa contínua.
- **Espaçamento:** `0.25rem` acima do texto, `var(--espaco-md)` abaixo e `var(--espaco-md)` à direita. Com quiz vinculado, manter esse espaço antes da linha do quiz.
- **Texto longo:** quebrar em várias linhas, com largura máxima de cerca de `70ch`, sem invadir a coluna de selo e ações.
- **Celular:** alinhar pelo recuo disponível, sem rolagem horizontal.
- Enquanto a descrição estiver aberta, a linha de ligação do item 2 passa pela lateral do texto sem encostar nele.

## 4. Nome do quiz vinculado

Criar um helper de exibição para as linhas de quiz vinculado (linha 1653), com a mesma comparação do item 3:

- Se o título do quiz for igual ao do conteúdo, ou igual a `Quiz - {conteúdo}`, `Quiz – {conteúdo}` ou `Quiz: {conteúdo}`, exibir **"Quiz do conteúdo"**.
- Qualquer outro título aparece como está.
- Se **dois ou mais** quizzes do mesmo conteúdo forem cair nessa regra, mostre os títulos originais, para eles não ficarem iguais.
- Colocar o título real em `title`, para aparecer ao passar o mouse.
- `aria-label` de seleção, Editar e menu continuam com o título real.
- O modal de edição continua com o título real.

## 5. Texto "Quiz" abaixo do título

- Remover `<span>Quiz</span>` das linhas de quiz vinculado (linha 1656) e de quizzes do módulo (linhas 1724–1725).
- Na linha de quiz do módulo, o título fica centralizado verticalmente com o ícone.
- Não mexer nas ocorrências da prévia do aluno (linhas 1954 e 1971).

## 6. Faixa "Quizzes do módulo"

Em `.atividades-curso__quizzes-modulo-titulo` (linha 4215), o troféu está acima do texto. Deixar o ícone ao lado do texto, na mesma linha, alinhado com a coluna das caixas de seleção.

## Testes

Adicionar em `SecaoConteudosProfessor.test.jsx`:

- descrição igual ao título, com diferença de maiúsculas ou acentos: sem seta e sem painel;
- descrição diferente: expande normalmente;
- quiz com título igual ao do conteúdo e `Quiz - {conteúdo}`: exibe "Quiz do conteúdo";
- quiz com título próprio: exibe o título real;
- dois quizzes que cairiam na regra: exibem os títulos reais;
- `aria-label` de seleção e Editar mantêm o título real;
- quizzes não exibem mais o texto "Quiz" abaixo do título.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No app real, conferir: conteúdo com um quiz, com dois quizzes e sem quiz; conteúdo com descrição aberta e quiz vinculado; seleção individual e "Selecionar tudo"; Editar e ⋮ do quiz.
- Desktop, tablet e celular, nos temas escuro e claro. No celular, reduzir o recuo se preciso, sem sobrepor a linha e o texto.
- "Visualizar como aluno", "Ver arquivados" e as telas compartilhadas sem mudança.

## Entrega

Informar o que mudou em cada item e enviar prints com o conteúdo fechado e aberto, com quiz vinculado.
