# Prompt: web Admin — tabela de Alunos no mesmo padrão da de Professores (abas, seleção em lote e menu ⋮)

## Pedido do usuário (2026-11-25, prints de Gestão › Professores e Gestão › Alunos)

"Dá pra deixar a tabela de alunos igual à de professor, com os 3 pontinhos?"

Hoje a de Alunos tem:
- o seletor "Todos os status" no lugar das abas;
- só o ícone de olho na linha;
- nada de seleção em lote nem de menu ⋮.

**Ordem de aplicação:** este prompt **depende** de `PROMPT-agente-editar-e-inativar-aluno.md`, que cria `PUT /Alunos/{id}`, `POST /Alunos/{id}/inativar` (com motivo obrigatório) e `POST /Alunos/{id}/reativar`. Aplicar os dois juntos, ou este logo depois.

## Referência (verificado)

`frontend/src/pages/workspace/SecaoProfessores.jsx` (≈ 810 linhas):

- **Topo:** título "Professores"; à direita, a busca "Buscar por nome, e-mail ou…" e o botão "+ Cadastrar professor".
- **Abas Ativos | Inativos** com contagem (`abas-matriculas`, ≈ linhas 421–440).
- **Insígnias:** "N cadastrados · N ativos · N inativos" (≈ linhas 444–446) e "Limpar filtros".
- **Seleção em lote:** `useSelecaoEmLote(itensPagina)`, com o checkbox no cabeçalho e em cada linha. Com seleção, aparece a barra "N selecionados · Inativar selecionados / Reativar selecionados / Limpar seleção" (≈ linhas 455–470), com o modal de confirmação em lote (≈ linha 663).
- **Linha:**
  - clicável, abre os detalhes (`tabela-linha-clicavel`);
  - o checkbox e o menu ⋮ têm `stopPropagation`;
  - insígnia Ativo/Inativo;
  - **`MenuKebabTabela`** com "Ver detalhes", "Editar" e "Inativar/Reativar" (≈ linhas 544–556).
- **Paginação** com ‹ › embaixo.

`frontend/src/pages/workspace/SecaoAlunos.jsx` (≈ 300 linhas): o subtítulo "41 cadastrados - 40 ativos", o seletor "Todos os status", "Limpar filtros", a busca à direita, as colunas Aluno / Cadastro / Cursos matriculados / Status e o **ícone de olho**, que abre o modal "Detalhes do aluno".

## Tarefa (só `SecaoAlunos.jsx`, mais o que for comum)

### 1. Topo e filtros iguais aos de Professores

- **Título "Alunos";** à direita, a busca "Buscar por nome, e-mail ou RA". A busca de hoje procura por nome, e-mail e CPF mascarado; trocar o CPF pelo **RA**.
- **Sem botão de cadastrar:** o cadastro de aluno é feito pelo próprio aluno.
- **Sai** o seletor "Todos os status". **Entram as abas Ativos | Inativos** com contagem, no mesmo componente/classe de Professores. Aba inicial: **Ativos**.
- **Insígnias** "N cadastrados · N ativos · N inativos" ao lado das abas, e "Limpar filtros" (fantasma), como em Professores. **Sai** o subtítulo "41 cadastrados - 40 ativos".

### 2. Tabela

- **Colunas:** ☐ (seleção) | **Aluno** (avatar, nome, e-mail; ordenável como hoje) | Cadastro | Cursos matriculados | Status | ⋮.
- **Linha:** clicável e abre os detalhes, com a classe `tabela-linha-clicavel`. O checkbox e o ⋮ têm `stopPropagation`.
- **Insígnia de status:** igual à de Professores. Inativo passa a usar **neutro**, em vez do vermelho de hoje.
- **Sai** o ícone de olho.

### 3. Menu ⋮ (`MenuKebabTabela`)

- **Admin:**
  - **Ver detalhes** abre o modal de detalhes;
  - **Editar dados** abre a edição definida em `PROMPT-agente-editar-e-inativar-aluno.md`: só nome, e-mail, telefone e RA;
  - **Inativar acesso** abre a confirmação **com motivo obrigatório** (mesmo modal do outro prompt). Para aluno inativo, a opção vira **Reativar acesso**, com confirmação simples.
- **Coordenador:**
  - o menu ⋮ só com **Ver detalhes**;
  - **sem** coluna de seleção nem barra de lote.
- `rotulo` de acessibilidade: "Ações para {nome}".

### 4. Seleção em lote (só Admin)

- Reaproveitar `useSelecaoEmLote(itensPagina)`, com o checkbox no cabeçalho para selecionar a página.
- **Barra de seleção igual à de Professores:**
  - "N aluno(s) selecionado(s)";
  - **Inativar selecionados**, que aparece na aba Ativos;
  - **Reativar selecionados**, que aparece na aba Inativos;
  - "Limpar seleção".
- **Inativar em lote:** o modal pede **um motivo obrigatório** (5–300), aplicado a todos, e chama `POST /Alunos/{id}/inativar` para cada aluno, no mesmo laço com contagem de sucesso/falha de Professores. Resultado em toast: "N inativados" e, se houver, "N falharam".
- **Reativar em lote:** confirmação simples, chamando `POST /Alunos/{id}/reativar` para cada um.
- Depois do lote: limpar a seleção e recarregar a lista.

### 5. Paginação e estado vazio

- Mesma paginação com ‹ › de Professores, com o mesmo tamanho de página.
- **Estado vazio por aba:** "Nenhum aluno ativo encontrado." / "Nenhum aluno inativo.", como em Professores.

### 6. Código comum (opcional, recomendado)

- Se o topo (abas + insígnias + limpar) e a barra de lote ficarem iguais nas duas telas, extrair componentes pequenos, por exemplo `CabecalhoFiltrosUsuarios` e `BarraSelecaoLote`, e usar nas duas.
- **Sem mudar** o visual nem o comportamento de Professores.

**Não alterar:**
- as regras e rotas de editar, inativar e reativar (vêm do outro prompt);
- o conteúdo do modal "Detalhes do aluno", além do que o outro prompt já define (botões e aviso de inativação);
- a tela de Professores, além da extração opcional;
- o backend.

## Testes (Vitest)

- **Abas:** "Ativos" e "Inativos" filtram e mostram as contagens; não existe mais o seletor "Todos os status".
- **Linha:** clicar na linha abre os detalhes; clicar no checkbox ou no ⋮ **não** abre.
- **Menu ⋮ do Admin:** mostra "Ver detalhes", "Editar dados" e "Inativar acesso"; para aluno inativo, "Reativar acesso".
- **Coordenador:** o menu ⋮ só tem "Ver detalhes" e não há checkboxes.
- **Lote:**
  - selecionar dois alunos mostra a barra "2 alunos selecionados";
  - "Inativar selecionados" exige motivo e chama `/inativar` duas vezes;
  - o toast mostra a contagem.
- **Busca:** encontra pelo RA.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173) como Admin e depois como Coordenador:

- **Topo e tabela:** Gestão › Alunos tem o **mesmo visual** de Gestão › Professores:
  - abas Ativos | Inativos com contagem e as insígnias de totais;
  - checkboxes;
  - linha clicável;
  - menu ⋮ no fim de cada linha.
- **Menu ⋮:** "Editar dados" abre a edição dos 4 campos; "Inativar acesso" pede o motivo, e o aluno passa para a aba Inativos.
- **Lote:** selecionar alguns alunos e "Inativar selecionados" pede um motivo e inativa todos. Na aba Inativos, "Reativar selecionados" devolve os alunos.
- **Coordenador:** vê a tabela com o ⋮ só com "Ver detalhes", sem seleção.
- `npm test` (web) e o lint sem erros novos.
