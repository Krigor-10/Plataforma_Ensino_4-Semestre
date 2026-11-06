# Prompt — Hierarquia da tela de Conteúdos do professor, rodada 2 (web)

## Contexto

Continuação de `docs/bugs/PROMPT-agente-conteudos-professor-hierarquia.md`, aplicado e revisado pelo usuário no navegador. A estrutura e os comportamentos da rodada 1 estão aprovados. **Esta rodada é só de layout e visual:** espaçamentos, bordas, fundos e alinhamento em `TrilhaConteudosProfessor` (`frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`) e `frontend/src/styles/workspace.css`.

Não muda regra, contagem, rota, teste de comportamento nem o que já foi aprovado na rodada 1.

**Antes de começar:** o frontend tem alterações não commitadas, inclusive as da rodada 1. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-05.

**Escopo do CSS:** tudo sob `.tela-conteudos` e/ou `.conteudos-modulo--editavel`. As classes base são compartilhadas com o aluno, com Módulos e com Avaliações. Confira também se o modal "Visualizar como aluno" não herda nada.

## O que o usuário apontou no print

1. Buracos acima e abaixo da barra de progresso, com a metade direita do cabeçalho vazia.
2. Canto do módulo: cartão dentro de cartão, ícone desalinhado e cabeçalho colado na primeira linha.
3. Descrição do conteúdo aberto solta, fora da faixa da linha.
4. Pouca separação de fundos: as faixas e os níveis quase não se distinguem.

## 1. Corrigir o buraco do cabeçalho (bug)

`.atividades-curso__progresso` (`workspace.css:3867`) tem `flex: 1 1 12rem`, regra pensada para ficar ao lado do título. Na rodada 1, o bloco virou filho direto de `.conteudos-aluno`, que é `flex-direction: column`. Nesse contexto, os `12rem` passam a valer como **altura**: o bloco fica com cerca de 192px e o conteúdo centralizado no meio.

- Em `.tela-conteudos .atividades-curso__progresso` (linha 3886), definir `flex: none`.
- Espaço título → progresso: `--espaco-sm`. Espaço progresso → primeiro módulo: `--espaco-lg`.

## 2. Linha de progresso ocupa a largura toda

- A barra cresce e ocupa o espaço livre: remover o `max-width: 16rem` da linha 3898.
- À direita da barra, nesta ordem: `7 de 8 publicados`, `Falta publicar: n`, `Ver arquivados (n)`.
- "Ver arquivados" deixa de ser botão com borda e vira ação de texto discreta. Mantenha o rótulo e o papel de botão, usados nos testes.
- "Voltar para Conteúdos": reduzir para cerca de `0.875rem` e diminuir a distância até o título, só nesta tela.

## 3. Módulo vira um cartão único

Hoje `.conteudos-modulo--editavel` tem borda e `padding` lateral, e o cabeçalho dentro dele tem outra borda e outro raio. É daí que vêm o cartão duplo e o desalinhamento.

- Tirar o `padding` lateral do cartão (`workspace.css:4129`). Tirar borda e raio próprios do cabeçalho (linhas 5177–5186).
- O cabeçalho vira uma faixa de ponta a ponta, com apenas `border-bottom` quando o módulo está aberto.
- Arredondar os cantos do cabeçalho conforme o estado: só os superiores quando aberto, todos quando fechado.
- **Não usar `overflow: hidden` no cartão,** para não cortar o menu ⋮. Conferir também o menu do último item, porque o `motion.div` do módulo já usa `overflow: hidden`.
- Tirar o `margin-bottom` da linha 5174. O espaço entre módulos fica só no `gap` da lista (`0.75rem`).

## 4. Grade única de colunas

Tudo dentro do módulo usa as mesmas duas colunas iniciais: **coluna do ícone** e **coluna do texto**.

| Elemento | Coluna do ícone | Coluna do texto |
|---|---|---|
| Cabeçalho do módulo | Número do módulo | Título do módulo |
| Conteúdo | Ícone do tipo | Título e tipo |
| Descrição aberta | Vazia | Texto |
| Quizzes do módulo | Troféu | Título |

- Usar uma variável local para a coluna do ícone, com `2.25rem`, em vez do `2.75rem` atual. Ela substitui os valores fixos de `.atividades-curso__previa` e de `.tela-conteudos .atividades-curso__quizzes`.
- Trocar o `TbLayoutGrid` do cabeçalho, que é igual em todos os módulos, por um quadrado com o número (`01`) e fundo roxo suave, no tamanho do ícone das linhas.
- **Manter o nome acessível "Módulo 01",** usado nos testes: texto "Módulo" visível só para leitor de tela, ao lado do número.
- Não alterar o modal "Visualizar como aluno", que usa as mesmas classes (linhas 1583–1586).

## 5. Espaçamento das linhas

- Tirar o `padding` vertical do item e o `gap` da lista dentro do módulo. O espaço fica em um só lugar: `0.625rem var(--espaco-md)` na linha, com separador fino entre linhas.
- Com isso, a faixa de hover e de item aberto vai de ponta a ponta, e o cabeçalho deixa de encostar na primeira linha.

## 6. Três níveis de fundo

Hoje o cartão usa `rgba(255,255,255,0.015)`, quase transparente, e o gradiente da página aparece por trás. Usar fundos opacos, com tokens que já funcionam nos temas:

| Nível | Token |
|---|---|
| Faixa do módulo | `--cor-fundo-elevado` |
| Linhas | `--cor-fundo` |
| Item aberto, hover, faixa "Quizzes do módulo" e rodapé de ações | `--cor-fundo-alt` |

- Borda do cartão: `--cor-borda`; `--cor-borda-forte` só quando aberto, e só no cartão.
- Módulo vazio: mantém a borda tracejada e fica sem fundo.
- Conferir os temas claro e de alto contraste de `base.css`.

## 7. Item aberto

- O fundo de item aberto sai da `.atividades-curso__linha--ativa` e passa para o conjunto linha + descrição, para os dois ficarem na mesma faixa.
- O quiz vinculado fica fora dessa faixa, como item seguinte.

## 8. Quiz vinculado

- A guia vertical fica no centro do ícone do conteúdo pai.
- O ícone do quiz começa na coluna de texto do pai.
- As colunas da direita continuam alinhadas com as outras linhas.

## 9. Ações mais leves

Hoje há uma pílula com borda em cada linha, e ela compete com os títulos.

- "Editar" nas linhas: sem borda e sem fundo, com texto em `--cor-texto-suave`. Destaque só em hover e foco. Continua sempre visível, por causa de teclado e toque.
- Setas ↑↓: sem caixa, menores e discretas. Desabilitadas continuam ocupando o espaço, com contraste bem baixo.
- "Quizzes do módulo": vira faixa de ponta a ponta, com `--cor-fundo-alt` e separador acima.
- "Adicionar" e "Gerar quiz com IA": ficam em um rodapé do cartão, com `--cor-fundo-alt` e separador acima.

## Fora do escopo

- Tudo o que estava fora da rodada 1 continua fora: `NavGrupo.jsx`, `BarraTopo.jsx`, acentos da navegação e perfil repetido.
- O texto "teste conteudo PDF" da descrição vem dos dados cadastrados. Não alterar por código.

## Verificação

- `npm run lint` e `npm test` sem erros novos. Os testes de comportamento não devem precisar mudar.
- No navegador, em modo demo (`VITE_DEMO_MODE=true`, conta `professor@demo.edtech`), conferir:
  - módulo aberto, fechado e vazio;
  - item com e sem descrição, com quiz vinculado;
  - menu ⋮ do último item do último módulo sem corte;
  - larguras de desktop e de celular, sem rolagem horizontal;
  - tema escuro, claro e alto contraste;
  - telas do aluno, Módulos, Avaliações e "Visualizar como aluno" sem mudança.

## Entrega

No resumo final, informar o que mudou em cada item e enviar prints no mesmo enquadramento do print do usuário, com módulo aberto e item expandido.
