# Prompt — Ajuste final da tela de Conteúdos do professor (web)

## Contexto

Último refinamento de `TrilhaConteudosProfessor`, em `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`, `frontend/src/styles/workspace.css` e `frontend/src/styles/base.css`.

Só frontend, sem rota nova e sem dependência nova. Verifique no app real (`http://127.0.0.1:5173`, com o backend local). Não use modo demo.

**Antes de começar:** há alterações não commitadas nesta tela. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-06.

**Escopo do CSS:** sob `.tela-conteudos` ou em classes novas. "Visualizar como aluno", "Ver arquivados" (conteúdo do modal) e as telas que compartilham as classes não mudam. Isso inclui o `.atividades-curso__cabecalho` usado pela prévia do aluno.

## 1. Topo do curso

Hoje, resumo e botões estão na mesma linha, com separadores `·` e "Ver arquivados" com aparência de texto.

Nova organização, em `.atividades-curso__cabecalho` (por volta da linha 1369 do JSX):

```
Desenvolvimento Web Full Stack            [Ver arquivados (3)] [Visualizar como aluno]
38% publicado     Falta publicar: 5
```

- **À esquerda:** título e, abaixo dele, o resumo, a `0.25rem` do título. Sem os separadores `·`: use `gap: var(--espaco-md)` entre `n% publicado` e `Falta publicar: n`.
- **À direita:** os dois botões, com `gap: var(--espaco-sm)`, mesma altura e centralizados com o bloco da esquerda.
- **"Ver arquivados (n)":** usar `Botao` com `tamanho="pequeno"` e `variante="fantasma"`, igual a "Visualizar como aluno", com o ícone `TbArchive`. Continua sumindo sem arquivados, e o rótulo se mantém.
- **"Falta publicar: n":** continua clicável, como hoje.
- Entre o topo e o primeiro módulo: `var(--espaco-lg)`.
- Remover o CSS de `.atividades-curso__ver-arquivados`, se não for usado em outro lugar.
- Em telas estreitas, os botões descem para baixo do resumo e quebram linha, sem sobrepor o título.

## 2. Editar dentro do menu ⋮

- Remover das linhas o botão "Editar" (linhas 1654, 1717 e 1782), em conteúdos, quizzes vinculados e quizzes do módulo.
- Adicionar **Editar como primeira opção** do menu ⋮:
  - conteúdo: em `itensMenuMaterial`, chamando `onAbrirEdicao(conteudo)`;
  - quiz vinculado: em `itensMenuQuizDoMaterial`, chamando `onGerenciarQuizModulo(modulo, quiz)`;
  - quiz do módulo: em `itensMenuQuiz`, com a mesma chamada;
  - desabilitar enquanto o item estiver processando, como o botão fazia.
- Selo e ⋮ continuam alinhados em colunas fixas. Se houver divisória entre selo e Editar, retire. Ajuste o espaço que sobrar.
- Remover o CSS ligado a `.atividades-curso__editar-texto` (linhas 4703–4729), se a classe não for usada em outra tela.
- Não mexer no menu "Mais ações".

## 3. Cor dos botões inferiores

"Novo conteúdo" continua igual. Os outros dois ganham cor, usando classes novas no lugar de `variante="fantasma"`, para não conflitar com as regras do tema claro em `base.css`:

| Botão | Fundo | Texto e ícone | Borda |
|---|---|---|---|
| Adicionar Quiz | `rgba(123, 47, 247, 0.16)` | `--cor-marca-clara` | `--cor-borda-forte` |
| Gerar quiz com IA | `--cor-ia-fundo` | `--cor-ia` | `--cor-ia-borda` |

"Adicionar Quiz" segue o roxo dos quizzes. Crie os tokens abaixo em `base.css`, ao lado de `--cor-conteudo`:

| Token | Tema escuro | Tema claro |
|---|---|---|
| `--cor-ia` | `#a5b4fc` | `#4338ca` |
| `--cor-ia-fundo` | `rgba(99, 102, 241, 0.16)` | `rgba(67, 56, 202, 0.10)` |
| `--cor-ia-borda` | `rgba(165, 180, 252, 0.32)` | `rgba(67, 56, 202, 0.28)` |

- Hover e foco: reforçar fundo e borda, sem trocar o texto. Foco visível por teclado.
- Tamanho, posição, texto, ícones e condição de exibição dos três botões não mudam.

## Testes

Atualizar:

- `aria-label de selecao e Editar do quiz vinculado` (linha 284): Editar passa a ser opção do menu do quiz;
- `clicar em Editar do mesmo item fecha o menu de acoes aberto` (linha 516): trocar por clicar em outro lugar da linha.

Adicionar:

- linhas não têm mais botão "Editar";
- "Editar" é a primeira opção do ⋮ e abre a edição certa, em conteúdo, quiz vinculado e quiz do módulo;
- "Editar" fica desabilitado enquanto o item processa;
- "Ver arquivados" continua como botão e abre o modal.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No app real, conferir: curso com e sem rascunhos e arquivados; menu ⋮ de cada tipo de item, por mouse e teclado; os três botões inferiores.
- Desktop, tablet e celular, nos temas escuro e claro, sem rolagem horizontal nem sobreposição.
- "Visualizar como aluno", telas do aluno, Módulos e Avaliações sem mudança.

## Entrega

Informar o que mudou em cada item e enviar prints do topo, do menu ⋮ aberto e dos botões inferiores, nos dois temas.
