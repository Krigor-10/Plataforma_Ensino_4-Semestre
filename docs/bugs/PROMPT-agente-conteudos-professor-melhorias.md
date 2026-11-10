# Prompt — Melhorias na tela de Conteúdos do professor (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`). Também vale para o desktop, que é o Electron abrindo o web. A tela é a trilha do curso vista pelo professor, onde ele cria, publica e ordena os materiais e quizzes de cada módulo: `TrilhaConteudosProfessor` em `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx` (≈ linhas 813–1187).

O usuário aprovou as **6 melhorias abaixo** (só frontend; nenhuma rota nova). Não mexer em `PreviaTrilhaAluno` ("Visualizar como aluno") nem na tela do aluno (`SecoesAluno.jsx`), a não ser para manter as classes CSS compartilhadas funcionando nas duas.

## 1. Quiz vinculado aparece dentro do conteúdo dele

Hoje todos os quizzes do módulo vão para uma lista separada no fim (`quizzesPorModuloIdCompleto`), inclusive os vinculados a um material. O material ainda repete "Quiz vinculado" na linha de meta.

- Quiz com `conteudoDidaticoId` → renderizar logo abaixo do material, recuado (sub-item do `<li>` do material), como já acontece na visão do aluno.
- Quiz sem `conteudoDidaticoId` ("Vale para o módulo inteiro") → continua no fim do módulo, depois dos materiais.
- Remover o texto "Quiz vinculado" da meta do material (a posição já mostra o vínculo) e o "Vinculado a X" da meta do quiz aninhado.
- Atenção: `quizPorConteudoId` guarda só **um** quiz por material (o último sobrescreve). Agrupar em lista, porque um material pode ter mais de um quiz.
- Reordenar um material leva os quizzes dele junto. As setas ↑↓ continuam valendo só para materiais.

## 2. Selo de status único, sempre no mesmo lugar

Hoje: material mostra `Insignia` à direita, mas o selo some quando o item está aberto (`!conteudoAtivo`); quiz mostra o status no meio da meta; o interruptor do item aberto só conhece Publicado/Rascunho, embora exista `Arquivado` (`statusPublicacao` 1/2/3).

- Todo item (material e quiz, aberto ou fechado) mostra **um** selo à direita, antes das ações: Publicado (verde), Rascunho (laranja) ou Arquivado (cinza), com as mesmas cores do `Insignia` atual.
- Tirar o status da linha de meta do quiz.
- Material arquivado: o interruptor publicar/despublicar não deve tratá-lo como rascunho. Sugestão: com Arquivado, oferecer só "Restaurar como rascunho" no menu do item 4.

## 3. Resumo honesto (topo e cabeçalho do módulo)

Hoje "X% publicado" e "N conteúdos · N publicados" contam só materiais. Por isso a tela mostra "100% publicado" com quiz em rascunho.

- Cabeçalho do módulo: `{materiais} conteúdo(s) · {quizzes} quiz(zes)` e, só quando houver, `· {n} rascunho(s)` em destaque laranja. Arquivados não contam como pendência.
- Topo do curso: o percentual considera materiais + quizzes não arquivados. Quando houver rascunho, mostrar ao lado "Falta publicar: n".
- Conferir se o cartão do curso na lista (`rodapeEsquerda` / "Parcialmente publicado", ≈ linha 516) deve seguir a mesma regra e alinhar.

## 4. Ações padronizadas e sempre visíveis

Hoje, para editar, publicar ou excluir um material é preciso expandir o item; no quiz, a linha inteira abre a edição e há um lápis ao lado do nome.

- Em **todo** item, à direita: selo de status → botão "Editar" (ícone de lápis + texto; vira só ícone com `aria-label` em telas estreitas) → menu "⋯" com:
  - material: Publicar / Voltar para rascunho, Restaurar (se arquivado), Mover para cima, Mover para baixo, Excluir (abre a confirmação que já existe);
  - quiz: as ações que o modal de quiz já suporta hoje (publicar/arquivar, se existirem na API usada por `onGerenciarQuizModulo`). Não inventar rota.
- Manter as setas ↑↓ visíveis para materiais (acessíveis por teclado), além do menu.
- Clicar na linha do material passa a só abrir/fechar a prévia (descrição). O painel de ações dentro da prévia (Editar / interruptor / Excluir) sai.
- No quiz, remover o lápis ao lado do título. A linha não precisa mais ser um botão gigante: "Editar" faz isso.
- Menu acessível: botão com `aria-haspopup="menu"` e `aria-expanded`, itens com `role="menuitem"`, setas/Enter/Esc funcionando, foco volta ao botão ao fechar, fecha ao clicar fora. Se já existir um menu/dropdown no projeto, reaproveitar.

## 5. Arquivados discretos

- Itens arquivados (material ou quiz) ficam escondidos por padrão. No fim do módulo aparece "Mostrar arquivados (n)" / "Ocultar arquivados".
- Quando visíveis, ficam com opacidade reduzida e selo "Arquivado".
- Arquivado não entra na contagem nem no percentual do item 3.

## 6. Acentos nos textos desta tela

Hoje vários textos estão sem acento: "Conteudos", "Modulo", "conteudo", "Pre-visualizacao", "nao", "acao", "Voltar para Conteudos" etc.

- Corrigir **todos os textos visíveis e `aria-label`s de `SecaoConteudosProfessor.jsx`**: trilha, lista de cursos, modais de criar/editar/excluir conteúdo, toasts e mensagens, prévia do aluno, e as opções `OPCOES_TIPO_CONTEUDO`/`OPCOES_STATUS_PUBLICACAO`.
- Não alterar identificadores, chaves, rotas, nomes de variáveis nem valores enviados à API.
- Se `normalizeContentType` / `normalizePublicationStatus` (helpers compartilhados) devolverem texto sem acento, corrigir lá. Avisar no resumo que isso também muda outras telas.
- Fora do escopo: a correção geral de acentos no resto do sistema fica para outro prompt.

## Testes e verificação

- Vitest/Testing Library para `TrilhaConteudosProfessor`:
  - quiz vinculado renderiza dentro do material;
  - dois quizzes no mesmo material aparecem os dois;
  - contagem do módulo com quiz em rascunho mostra "1 rascunho" e o topo não mostra 100%;
  - arquivados ocultos por padrão e o botão "Mostrar arquivados" funciona;
  - menu "⋯" abre e fecha pelo teclado (Enter, setas, Esc) e "Excluir" abre a confirmação.
- Conferir no navegador (modo demo serve: `VITE_DEMO_MODE=true`, conta `professor@demo.edtech`) em largura de desktop e de celular, tema escuro.
- `npm run lint` e `npm test` sem erros novos.
- "Visualizar como aluno" e a tela de Conteúdos do aluno continuam iguais.

## Entrega

No resumo final, listar o que mudou em cada um dos 6 itens, as decisões tomadas onde o prompt deixou opção (ações de quiz disponíveis, regra do cartão do curso) e prints antes/depois, se possível.
