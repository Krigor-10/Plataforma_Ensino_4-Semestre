# Prompt — Progresso do aluno vira aba do Acadêmico

## Contexto

No aluno, a barra de abas do Acadêmico (`ACADÊMICO | Conteúdos › Avaliações` + barra de XP "Nível N" à direita) aparece em Conteúdos e Avaliações, mas **some na tela Progresso**. Junto com ela some a barra de XP.

**Causa:** a barra (`NavGrupo.jsx`) só aparece quando a seção atual faz parte de um grupo em `GRUPOS_DEF` (`BarraLateral.jsx`, linha 53). O Progresso do aluno é a seção `"meus-cursos"` (`data/appConfig.js`, linha 14, label "Progresso", só para o papel Aluno) e não faz parte de nenhum grupo. Por isso `temNavGrupo()` devolve `false`, e a barra e o `layout-principal--com-tabs` não entram.

## Decisão do usuário

O **Progresso vira a terceira aba do Acadêmico**: `Conteúdos › Avaliações › Progresso`. No menu lateral, o Progresso passa para dentro do grupo Acadêmico, embaixo de Avaliações.

## O que fazer

1. **`BarraLateral.jsx`:** acrescentar `"meus-cursos"` em `GRUPOS_DEF.academico.filhos`, **logo depois de `"avaliacoes"`** (antes de `"turmas"`), para a ordem ficar Conteúdos › Avaliações › Progresso.
   - `"meus-cursos"` só existe para o Aluno, então Admin, Coordenador e Professor não mudam. O Progresso do Professor é a seção `"professores"` com outro rótulo e não é afetado. Conferir isso mesmo assim.
2. **`NavGrupo.jsx`:** acrescentar `"meus-cursos"` no `ICONE_COMP`, com o ícone de tendência (`TbTrendingUp`), o mesmo do menu lateral (`MdTrendingUp`). Sem isso a aba fica sem ícone.
3. **`BarraNavMobile.jsx`:** ele usa o mesmo `GRUPOS_DEF`. Com a mudança, o botão "Progresso" separado some da barra inferior do celular e passa para dentro de "Acadêmico". Acrescentar `"meus-cursos"` no `ICONE_COMP` de lá também e conferir se o aluno ainda chega ao Progresso pelo celular (Acadêmico → abas).
4. **Breadcrumb do topo (`BarraTopo.jsx`):** no Progresso, o topo tem que mostrar `CodeRyse Academy › Acadêmico`, como em Conteúdos e Avaliações.

## Não mexer

- O conteúdo da tela Progresso, a barra de XP (tamanho, regra) e a rota `/app/meus-cursos`.
- Os outros itens do aluno (Meus Cursos, Catálogo, Certificados, Matrículas).
- Menus e abas de Admin, Coordenador e Professor.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`. Entrar como aluno:
  - Em Progresso aparecem a barra `ACADÊMICO | Conteúdos › Avaliações › Progresso`, com Progresso marcado, e a barra de XP à direita.
  - No menu lateral, o Acadêmico se abre com Conteúdos, Avaliações e Progresso, e não sobra um item "Progresso" solto embaixo.
  - O conteúdo do Progresso não fica escondido atrás da barra (o padding do `layout-principal--com-tabs` tem que funcionar).
- Entrar como professor e como coordenador e conferir que o menu e as abas continuam iguais.
- Celular (375px), como aluno: barra inferior e acesso ao Progresso.
- Rodar `npm test` (ajustar testes que conferem a ordem do menu do aluno, se houver) e o build. Mandar print de antes e depois.
