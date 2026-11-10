# Prompt — Verde suave nos ícones de conteúdo do professor (web)

## Objetivo

Na tela de Conteúdos do professor (`TrilhaConteudosProfessor`), os ícones de conteúdo passam a usar **um único verde claro e suave**, para todos os tipos: texto, PDF, vídeo, link e imagem. Hoje eles são cinza. O tipo continua sendo identificado pelo desenho do ícone e pelo texto abaixo do título.

O roxo do troféu dos quizzes não muda. Só cor: sem mudança de regra, tamanho ou layout.

**Antes de começar:** as rodadas anteriores desta tela ainda não foram commitadas. Parta dessa versão e não descarte nada. Os números de linha valem para a versão de 2026-11-05.

## 1. Tokens em `frontend/src/styles/base.css`

| Token | Tema escuro (`:root`) | Tema claro (`[data-tema="claro"]`) |
|---|---|---|
| `--cor-conteudo` | `#86efac` | `#15803d` |
| `--cor-conteudo-fundo` | `rgba(134, 239, 172, 0.10)` | `rgba(21, 128, 61, 0.08)` |
| `--cor-conteudo-borda` | `rgba(134, 239, 172, 0.22)` | `rgba(21, 128, 61, 0.22)` |

Não reutilizar `--cor-sucesso`: ela é mais forte e tem outro significado, publicado/concluído.

## 2. Modificador do ícone

Em `workspace.css`, ao lado de `.atividades-curso__icone--quiz`, criar:

```css
.atividades-curso__icone--conteudo {
  color: var(--cor-conteudo);
  background: var(--cor-conteudo-fundo);
  border-color: var(--cor-conteudo-borda);
}
```

Aplicar a classe em `SecaoConteudosProfessor.jsx` nos ícones de conteúdo de:

- linhas da trilha (linha 1266);
- modal "Ver arquivados" (linha 1482, só quando `item.tipo` não for `quiz`).

**Não aplicar** na prévia "Visualizar como aluno" (linha 1602): ela deve continuar igual à tela do aluno. `SecoesAluno.jsx` também não muda.

## 3. Hover e item aberto

As regras de `.atividades-curso__linha[role="button"]:hover .atividades-curso__icone` e `.atividades-curso__linha--ativa .atividades-curso__icone` deixam o ícone roxo. Para os ícones de conteúdo, manter a cor `--cor-conteudo` nesses estados, reforçando só a borda (`--cor-conteudo`). A regra deve ficar restrita a `.atividades-curso__icone--conteudo`, sem afetar as telas que compartilham as classes.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No app real (`http://127.0.0.1:5173`, com o backend local), sem modo demo, conferir:
  - todos os tipos de conteúdo em repouso, hover e aberto;
  - quiz continua roxo;
  - modal "Ver arquivados";
  - temas escuro e claro: o verde deve ficar legível e suave nos dois;
  - "Visualizar como aluno" e telas do aluno sem mudança.
