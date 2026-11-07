# Prompt — Ajuste: texto dos botões "Adicionar Quiz" e "Gerar quiz com IA" (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário:** no rodapé do módulo, na trilha de Conteúdos do professor, a cor dos botões "Adicionar Quiz" e "Gerar quiz com IA" parece ficar por cima do texto.

**Decisão do usuário:** texto na cor clara padrão (branco no tema escuro), mantendo fundo, borda e ícone coloridos.

## O que o agente de arquitetura já verificou (não repetir)

- Os botões estão em `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx` ≈ linhas 1846 e 1850. As classes `atividades-curso__adicionar--quiz` e `--ia` só são usadas ali.
- Nenhuma camada cobre o texto: `.botao` não tem `::before` nem `::after`, e `opacity`, `filter` e `mix-blend-mode` estão no padrão. A sensação vem do texto na mesma família de cor do fundo.
- Valores lidos no CSS carregado em 127.0.0.1:5173, com botões de teste montados temporariamente na página, em tema escuro. O contraste foi calculado sobre `--cor-fundo-alt`:
  - Adicionar Quiz: texto `rgb(185, 146, 255)`, fundo `rgba(123, 47, 247, 0.16)`, contraste 6:1;
  - Gerar quiz com IA: texto `rgb(165, 180, 252)`, fundo `rgba(99, 102, 241, 0.16)`, contraste 6,87:1.
  Os dois passam na medição, então isto é um ajuste visual pedido pelo usuário, não falha de contraste.
- Nenhum outro botão da aplicação tem esse padrão de fundo tingido com texto da mesma cor, pela busca feita nos arquivos de `frontend/src/styles`.
- `--cor-texto-forte` é `#f3f5ff` no tema escuro e `#0d0f18` no tema claro.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

Em `frontend/src/styles/workspace.css`:

1. Em `.atividades-curso__adicionar--quiz` (≈ linha 4755) e `.atividades-curso__adicionar--ia` (≈ linha 4771), trocar `color` por `var(--cor-texto-forte)`.
2. Manter o ícone colorido, porque hoje ele herda a cor do texto:

   ```css
   .atividades-curso__adicionar--quiz svg {
     color: var(--cor-marca-clara);
   }

   .atividades-curso__adicionar--ia svg {
     color: var(--cor-ia);
   }
   ```

**Não usar** `#fff` fixo: no tema claro o texto ficaria branco sobre fundo claro.

**Não alterar** fundo, borda, hover, foco, o botão "Novo conteúdo" nem as variantes globais em `componentes.css`.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como professor, na aba Conteúdos com um módulo aberto:

- Tema escuro: texto dos dois botões claro, fundo, borda e ícone ainda coloridos, em repouso e no hover.
- Tema claro: texto escuro e legível.
- "Gerar quiz com IA" continua aparecendo só quando o módulo tem conteúdo do tipo que o habilita.
- `npm run lint` e `npm test` sem erros novos.
