# Prompt — Tela única do curso para o Admin

## Contexto

Leia antes: `docs/fluxo-admin/MAPA-fluxo-atual.md` (o mapa do problema, com o vídeo) e `docs/fluxo-coordenador/PROMPT-agente-tela-unica-curso-coordenador.md` + `PROMPT-agente-ajustes-tela-curso-rodada2.md` (o que foi feito para o Coordenador).

**Problema:** num vídeo de 45 s, o Admin escolheu o mesmo curso **4 vezes**. Os botões "Ver módulos" e "Ver professores" do detalhe do curso levam para outras seções do menu (Modulos e Professores por Curso), e o "Voltar" dessas seções vai para a grade de cursos delas, não para o curso. O detalhe do curso do Admin também não fica na URL (estado local em `SecaoCursos.jsx`).

**Objetivo:** o Admin passa a ter a mesma **página única do curso** do Coordenador (`PainelCursoCoordenador.jsx`, rota `/app/cursos/:id`), com as ações que só o Admin tem.

## Decisões do usuário (10/11)

- **Página única do curso para o Admin**, no mesmo modelo do Coordenador.
- **Modulos e Professores por Curso saem do menu do Admin.** Módulos e professores ficam só dentro do curso, e o menu Acadêmico do Admin fica só com **Cursos**. Matrículas e Gestão (Alunos, Professores, Coordenadores) continuam como estão.

## O que fazer

### 1. Rota do curso para o Admin

- Em `SecaoCursos.jsx`, o Admin também passa a abrir o curso em `/app/cursos/:id`, como o Coordenador (`abrirDetalheCurso`, `voltarParaListaCursos` e o efeito que volta para `/app/cursos` quando o id não existe). Remover o `cursoSelecionadoIdLocal` do caminho do Admin.
- O breadcrumb do topo (`BarraTopo.jsx`, terceiro nível da rodada 2) vale para o Admin também: `CodeRyse Academy › Cursos › Título`, com "Cursos" como link.
- O Professor continua como está. Ele não usa esta tela para o seu curso.

### 2. Um componente para os dois perfis

- Reaproveitar `PainelCursoCoordenador.jsx`, sem copiar. Acrescentar uma prop de perfil (ex.: `perfil="Admin" | "Coordenador"`) e, se quiser, renomear para um nome neutro (ex.: `PainelCursoGestao.jsx`), ajustando os imports e os testes (`PainelCursoCoordenador.test.jsx`).
- O detalhe antigo do Admin em `SecaoCursos.jsx` (5 KPIs + 4 botões, ~linhas 700–790) deixa de ser usado pelo Admin. Se ninguém mais usar esse trecho, remover.

### 3. Topo da página (Admin)

- **Título** e **subtítulo**: `código · Coordenação: nome · modelo do curso · preço` (preço com `formatMoney`, modelo pelo rótulo já usado no modal). Assim o preço sai do KPI cortado ("R$ 1.59…").
- **Ações na mesma linha** (mesmo estilo compacto da rodada 2):
  - **Editar curso:** o modal atual do Admin, com Título, Descrição, Preço e Modelo (já existe em `SecaoCursos`; levar ou passar por prop).
  - **Foto de capa:** o modal atual de "Alterar foto de capa" (`POST /Cursos/{id}/imagem`, só Admin).
  - **Professores (N):** o mesmo modal do Coordenador, com `BlocoProfessoresCurso` (vincular e desvincular). As rotas `POST/DELETE/GET /Cursos/{id}/professores` já aceitam Admin.
  - **Coordenador:** é o **único lugar** para atribuir ou trocar o coordenador (a barra em massa sai da grade, ver item 7). Abre um modal pequeno com o seletor de coordenadores (o atual já marcado) e "Salvar", usando a rota que já existe, `PUT /Cursos/{id}/coordenador` (só Admin). Se o curso estiver sem coordenador, o botão vira **"Atribuir coordenador"** em destaque e o subtítulo mostra "Sem coordenação". Depois de salvar, atualizar o subtítulo e o selo do card na grade.
  - **Encerrar/Reabrir curso continuam só do Coordenador.** Não mudar essa regra.

### 4. KPIs (os mesmos 4 do Coordenador)

- Alunos, Progresso, Certificados ("N de M") e Média, vindos de `GET /Cursos/{id}/desempenho`, contando só matrículas aprovadas, como já é para o Coordenador.
- **Backend:** hoje `GET /Cursos/{id}/desempenho` é `[Authorize(Roles = "Coordenador")]` e filtra pelo coordenador logado (`CursosController.cs` ~280). Liberar para **Admin** sem esse filtro: o Admin vê qualquer curso, o Coordenador continua vendo só os seus. Reaproveitar o cálculo de `ObterDesempenhoPorCursoAsync` (ex.: um overload sem coordenador ou um método `...ParaAdminAsync(cursoId)`). Criar testes no backend para os 2 casos (Admin vê qualquer curso; Coordenador recebe 403/404 num curso que não é dele, como hoje).
- Sai o card "Professores" (que mostrava um nome cortado): o número de professores fica no botão "Professores (N)".

### 5. Abas "Módulos" e "Avaliações do curso"

- Mesmas abas da rodada 2, com as mesmas regras (avaliações só aparecem quando houver; quiz arquivado não conta; Prova/Exercício vinculada a módulo aparece em "Avaliações do curso").
- **No Admin, a aba Módulos também gerencia:**
  - botão **"Novo módulo"** acima da lista;
  - **⋮** em cada módulo com **Editar** e **Excluir**;
  - reaproveitar `ModaisModulo` / `useModaisModulo` (o mesmo de `SecaoModulos`), com o curso fixo;
  - o resto do módulo (contagens, materiais, métricas por `DetalheModuloDesempenho`) igual ao do Coordenador.
- O Coordenador continua sem "Novo módulo" e sem Editar/Excluir (decisão da rodada 2: criar módulo é do Professor e do Admin).

### 6. Menu do Admin

- Tirar **Modulos** (`/app/modulos`) e **Professores por Curso** (`/app/turmas`) do menu do Admin (`data/appConfig.js` / `WorkspaceScreen.jsx`). Com isso, o grupo Acadêmico do Admin fica com um item só (Cursos). Conferir como `GRUPOS_DEF` (`BarraLateral.jsx`) e `NavGrupo` se comportam com um item só: a barra de abas some quando há menos de 2 filhos, o que é o esperado. O item "Cursos" fica direto no menu ou no grupo, o que ficar mais limpo; avisar o que foi feito.
- Os links antigos `/app/modulos` e `/app/turmas` do Admin redirecionam para `/app/cursos`, como já é feito para o Coordenador (efeito em `WorkspaceScreen.jsx` ~108).
- A busca do topo (`BarraTopo`) não pode mais sugerir "Modulos" ou "Professores por Curso" para o Admin.
- `abrirSecaoRelacionada` e `cursoEmFocoPorSecao` deixam de ser usados pelo Admin. Remover o que ficar sem uso.
- `SecaoModulos` e `SecaoProfessoresCurso` só podem ser apagados se nenhum outro perfil usar. Conferir antes e avisar.

### 7. Grade de cursos mais limpa (decisão do usuário, 10/11)

A atribuição de coordenador passa a ser feita **só dentro do curso** (botão "Coordenador" do item 3). Na grade:

- **Sai** a barra de ação em massa inteira: "Selecionar todos os cursos listados", o seletor "Selecionar coordenador", o botão "Atribuir coordenador" e o contador "N de N cursos" que fica nessa barra.
- **Saem** as caixas de seleção dos cards de curso. Clicar no card só abre o curso.
- **Ficam:** título "Cursos", busca, filtro "Todos os coordenadores" + "Limpar filtros" e "Novo curso". Avisar se o filtro ficar melhor ao lado da busca, na mesma linha.
- No backend, a rota `PUT /Cursos/{id}/coordenador` continua, agora chamada de dentro do curso. Se houver rota ou função de atribuição em massa usada só por essa barra, remover junto com os testes dela e avisar.
- Remover do `SecaoCursos.jsx` o estado e as funções da seleção em massa que ficarem sem uso (ex.: `alternarCurso`, cursos marcados, coordenador escolhido para o lote).
- Efeito disso: atribuir o mesmo coordenador a vários cursos passa a ser um curso por vez. O usuário aceitou essa troca para deixar a grade mais limpa.

## Não mexer

- A tela do Coordenador: o que ele vê e pode fazer continua igual. Só o componente passa a ser compartilhado.
- As telas do Professor e do Aluno.
- As regras de preço e modelo (exclusivas do Admin, commit `7a60241`) e de Encerrar/Reabrir (só Coordenador).
- Matrículas e Gestão do Admin.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`.
- **Admin:**
  - Cursos → curso: a URL vira `/app/cursos/:id` e o breadcrumb mostra `Cursos › Título`.
  - Topo: preço, modelo e coordenador sem corte; Editar curso e Foto de capa funcionam e atualizam a página.
  - Professores (N): vincular e desvincular, com o N atualizado.
  - Coordenador: trocar e conferir o subtítulo e a grade; num curso sem coordenador, o botão aparece como "Atribuir coordenador".
  - Grade de cursos: sem caixas de seleção e sem a barra de atribuição em massa; busca, filtro e Novo curso funcionando.
  - Aba Módulos: Novo módulo, Editar e Excluir. A lista atualiza sem sair da página.
  - Refazer o roteiro do vídeo: ver módulos, ver professores, editar e trocar a foto **sem escolher o curso de novo**.
  - F5 e voltar do navegador mantêm o curso e voltam para a grade, respectivamente.
  - Menu sem Modulos e sem Professores por Curso; `/app/modulos` e `/app/turmas` voltam para Cursos.
- **Coordenador:** a tela do curso continua igual (sem Novo módulo, sem preço, sem foto, sem Coordenador).
- Temas escuro e claro; 1366px e 1920px; celular (375px).
- Rodar os testes do backend e do frontend e o build. Atualizar e criar testes para: perfil Admin no painel (ações visíveis), Coordenador sem as ações do Admin, redirecionamento das rotas antigas e o `GET /Cursos/{id}/desempenho` para Admin.
- Mandar print da página do curso do Admin e da do Coordenador.
