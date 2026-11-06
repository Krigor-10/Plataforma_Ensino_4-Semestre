# Prompt — Hierarquia da tela de Conteúdos do professor (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`). Também vale para o desktop, que é o Electron abrindo o web. A tela é a trilha do curso vista pelo professor: `TrilhaConteudosProfessor` em `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`, com estilos em `frontend/src/styles/workspace.css`.

Esta rodada continua `docs/bugs/PROMPT-agente-conteudos-professor-melhorias.md` e **substitui duas decisões daquele prompt**, marcadas nos itens 2 e 6.

**Objetivo:** deixar visível a estrutura curso → módulo → conteúdo → quiz e destacar só o que precisa de ação do professor. É só frontend: nenhuma rota nova e nenhuma dependência nova.

## Antes de começar

- `SecaoConteudosProfessor.jsx`, `SecaoConteudosProfessor.test.jsx` e `workspace.css` têm alterações não commitadas (painel "Ver arquivados", pendência de 05/11). Parta dessa versão e não descarte nada. Se esse trabalho ainda estiver em andamento, espere ele terminar.
- Os números de linha abaixo valem para essa versão de 2026-11-05. Em caso de diferença, localize pelo código citado.
- As classes `conteudos-modulo__*` e `atividades-curso__*` são usadas também por `SecoesAluno.jsx`, `SecaoModulos.jsx`, `SecaoAvaliacoesProfessor.jsx` e `PainelModulosDesempenho.jsx`. **Todo CSS novo deve ficar sob `.conteudos-modulo--editavel`** (ou em classe nova), para não alterar essas telas.

## 1. Corrigir a contagem do módulo (bug)

As linhas 1101–1102 usam `itensDoModuloTodos.length` e `quizzesDoModuloTodos.length`, que incluem arquivados. Na tela, o cabeçalho do Módulo 1 mostra "3 quizzes" com 2 quizzes visíveis, enquanto o próprio arquivo diz que arquivado não entra na contagem.

- Contar só itens não arquivados, com o mesmo critério do topo do curso (`itensCursoNaoArquivados`).
- Teste: módulo com 2 quizzes ativos e 1 arquivado mostra "2 quizzes".

## 2. Status só quando pede ação

**Substitui o item 2 do prompt anterior**, que pedia selo em todo item.

- Publicado passa a ser o estado padrão e fica sem selo visível. Rascunho mantém o selo laranja.
- Manter o status para leitor de tela: texto só para leitura `Publicado` no lugar do selo.
- Reservar o espaço do selo para a coluna não mudar de posição (item 6).
- Cabeçalho do módulo: `{n} conteúdo(s) · {n} quiz(zes)` e, só quando houver, `{n} rascunho(s)` em laranja. Remover "· {n} publicados".

## 3. Topo do curso

Linhas 1035–1053.

- Trocar "88% publicado" por uma barra de progresso com o texto `7 de 8 publicados`, usando `totalPublicadosCurso` e `itensCursoNaoArquivados.length`. A barra precisa de `role="progressbar"` e `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
- "Falta publicar: n" vira um botão: abre o primeiro módulo com rascunho, rola até o item e move o foco para ele. A rolagem deve acontecer depois da animação de abertura do módulo.
- "Visualizar como aluno" continua sendo o botão principal do cabeçalho.
- "Ver arquivados (n)" desce para a linha da barra de progresso, como ação discreta. Mantenha o rótulo, que é usado nos testes.

## 4. Hierarquia dos níveis

| Nível | Tratamento |
|---|---|
| Curso | Título e barra de progresso |
| Módulo | Faixa com fundo próprio, mais forte que as linhas |
| Conteúdo | Linha padrão |
| Quiz do conteúdo | Recuado, com guia vertical à esquerda, logo abaixo do conteúdo |
| Quizzes do módulo | Bloco no fim do módulo, com título visível |

- Dentro do módulo, trocar o cartão de cada linha por linhas com separador fino.
- Quiz sem `conteudoDidaticoId` (linhas 1313–1363): adicionar o título visível **"Quizzes do módulo"** acima da lista e remover o texto "Vale para o módulo inteiro" da meta, que fica redundante.
- **Não usar "Avaliação" nesse bloco.** Quiz e Avaliação são coisas diferentes no sistema, e quiz não gera nota.
- Manter o ícone de troféu em todos os quizzes.

## 5. Abertura e seta dos itens

- Módulo aberto ao entrar (linha 1000): o primeiro com rascunho; se não houver, o primeiro do curso. Hoje é sempre o primeiro.
- Conteúdo: mostrar a seta e a expansão só quando houver `conteudo.descricao`. Hoje a seta sempre aparece e, sem descrição, abre um painel vazio (linhas 1203 e 1259–1261).

## 6. Colunas de ações alinhadas

**Mantém as setas ↑↓ do prompt anterior.** Não implementar arrastar e soltar: o projeto não tem biblioteca para isso e as setas funcionam por teclado.

- Usar colunas fixas em todas as linhas: selo → Editar → menu ⋮ → setas.
- Quizzes não têm setas, então reservam esse espaço vazio. Assim, selo, Editar e menu ficam na mesma posição em todas as linhas.
- O recuo do quiz vale só para o lado esquerdo.
- Em telas estreitas, adaptar o bloco de media query existente de `.atividades-curso__acoes` sem criar rolagem horizontal.

## 7. Ações do módulo

Linhas 1365–1380.

- Juntar "Novo conteúdo" e "Adicionar Quiz" em um botão **"Adicionar"**, com menu de duas opções: "Conteúdo" e "Quiz".
- Reaproveitar `MenuAcoes`. Hoje o botão dele é fixo no ícone ⋮, então adicione uma prop opcional para botão com texto, mantendo o comportamento atual como padrão e a navegação por teclado.
- "Gerar quiz com IA" continua como botão separado, com a mesma condição de exibição.

## 8. Módulo vazio

- Módulo sem conteúdos nem quizzes não arquivados: no lugar de "0 conteúdos · 0 quizzes", mostrar **"Vazio · não aparece para o aluno"**, com borda tracejada.
- O texto confere com `SlideConteudosCurso` (`SecoesAluno.jsx:1924`), que esconde esses módulos. Se encontrar outra tela do aluno que os mostre, ajuste o texto e avise no resumo.

## 9. Título sugerido a partir do arquivo

Em `AssistenteGeracaoIA.jsx`, `nomeArquivoSemExtensao` (linhas 25–27, usado na linha 114) preenche o título com o nome cru do arquivo. É daí que vêm títulos como `ANALISE_DESENVOLV_SIST_TOMO_01`.

- Trocar `_` e `-` por espaço.
- Se o nome estiver todo em maiúsculas, converter para formato de frase.
- O campo continua editável. Não alterar títulos já salvos.

## Fora do escopo

Estes pontos pertencem a `docs/auditorias/PROMPT-agente-auditoria-interface-por-perfil.md`. Não mexa neles nesta rodada:

- Barra Acadêmico e setas `›` de `NavGrupo.jsx` (item 14.4, componente compartilhado entre perfis).
- Breadcrumb de `BarraTopo.jsx` e botão "Voltar para Conteúdos" (dependem da decisão do item 14.4).
- Rótulos sem acento da navegação, como "Conteudos" e "Avaliacoes" (item 15).

Também ficam de fora `PreviaTrilhaAluno`, `SecoesAluno.jsx` e o perfil repetido no topo e no menu lateral.

## Testes e verificação

Atualizar ou adicionar testes Vitest/Testing Library para `TrilhaConteudosProfessor`:

- contagem ignora arquivados;
- Publicado sem selo visível, mas disponível ao leitor de tela; Rascunho com selo;
- barra de progresso mostra `7 de 8 publicados`;
- "Falta publicar" abre o módulo certo e move o foco para o rascunho;
- módulo com rascunho abre ao entrar; sem rascunho, abre o primeiro;
- seta do conteúdo só aparece com descrição;
- menu "Adicionar" funciona por teclado e aciona os dois fluxos;
- módulo vazio mostra o aviso.

Conferir também:

- `npm run lint` e `npm test` sem erros novos;
- no navegador, em modo demo (`VITE_DEMO_MODE=true`, conta `professor@demo.edtech`), em largura de desktop e de celular, tema escuro;
- "Visualizar como aluno" e as telas que compartilham as classes CSS continuam iguais.

## Entrega

No resumo final, informar o que mudou em cada item, qualquer ponto em que o código divergiu deste prompt e, se possível, prints antes/depois.
