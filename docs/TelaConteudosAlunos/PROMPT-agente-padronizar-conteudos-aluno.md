# Prompt — Padronizar a trilha de Conteúdos do aluno com a do professor (web)

## Contexto

Refinamento visual da trilha do curso vista pelo aluno, para ela seguir o estilo de `TrilhaConteudosProfessor`. Também vale para o desktop, que é o Electron abrindo o web.

Leia também, nesta pasta:

- `PadronizarEstiloProfessor.txt`: objetivo do usuário;
- `sugestao tela conteudos aluno.png`: referência visual. Os dados são de exemplo.

Este prompt transforma esses arquivos em escopo fechado. Em caso de dúvida, ele prevalece.

**Só frontend. Sem rota nova, sem dependência nova e sem mudar regra de progresso.** Verifique no app real (`http://127.0.0.1:5173`, com o backend local), com uma conta de aluno. Não use modo demo. Os números de linha valem para a versão de 2026-11-06.

## Escopo

**Muda:**

- `SlideConteudosCurso` em `frontend/src/pages/workspace/SecoesAluno.jsx`;
- `PreviaTrilhaAluno` em `SecaoConteudosProfessor.jsx`, porque "Visualizar como aluno" precisa continuar parecido com a tela real;
- estilos em `frontend/src/styles/workspace.css`.

**Não muda:**

- `AvisoAvaliacaoLiberada` (linha 2293): **não mexer** em nada, nem texto, tamanho, cor, emoji ou botão;
- grade de cursos, `DetalheProgressoCurso`, Avaliações, Progresso e Módulos;
- app `mobile/` em React Native: vale só o site em tela pequena;
- navegação geral: `NavGrupo.jsx`, `BarraTopo.jsx`, barra lateral.

## 1. Estilo compartilhado sem afetar outras telas

O estilo do professor está em regras presas a `.tela-conteudos` e `.conteudos-modulo--editavel`. As classes base (`conteudos-modulo__*`, `atividades-curso__*`) também atendem outras telas: **não remova esses limites nem altere as regras base**.

- Criar uma classe própria das trilhas, como `.trilha-conteudos`, nas raízes de `TrilhaConteudosProfessor`, `SlideConteudosCurso` e `PreviaTrilhaAluno`.
- Mover para ela só as regras visuais comuns: variáveis, cartão do módulo, faixa, linhas, fundos, ícones, linha de ligação, faixa de quizzes e descrição.
- Regras de gerenciamento (caixas de seleção, barra de seleção, botões do professor) continuam em `.tela-conteudos`.
- Nas regras movidas, trocar o que for específico de `--editavel` por uma classe comum, como `conteudos-modulo--cartao`.
- Na trilha do aluno não há caixa de seleção: `--coluna-checkbox-conteudo` vale `0`, e o `gap` dessa coluna não pode sobrar nos cálculos de `--recuo-titulo-conteudo` e `--quiz-vinculado-centro-x`. Ajuste esses cálculos para continuarem corretos nas duas telas.
- A tela do professor deve ficar visualmente idêntica. Confira antes de seguir.

Não mude o `overflow` das animações da trilha do aluno: ela não tem menus flutuantes.

## 2. Módulos

- Mesmo cartão, mesma faixa e mesmo quadrado de número do professor. O texto "Módulo" fica só para leitor de tela, mantendo o nome acessível `Módulo 01`.
- Manter contagem, barra de progresso e check.
- Trocar o `▾` por `TbChevronDown`.
- **Módulo concluído:** mostrar o check **e** a seta. Hoje o check ocupa o lugar da seta, e nada indica que o módulo abre e fecha.
- **Módulo bloqueado:** mantém cadeado, aviso e comportamento, com aparência apagada.
- A lógica de qual módulo abre ao entrar não muda.

## 3. Contagem dos módulos (bug)

A linha 2015 mostra `{modulo.concluidos}/{modulo.conteudos.length}`, ignorando quizzes. Por isso aparecem "0/0" e "1/1" em módulos com mais itens.

- Exibir o total de conteúdos + quizzes vinculados + quizzes do módulo. Quiz concluído é o que tem `tentativasRealizadas > 0`.
- Texto no singular quando o total for 1: `1/1 concluído`.
- **Muda só esse texto.** `bloqueado`, `modulo.concluido`, `progresso` e a barra não mudam. Se isso gerar número incoerente com a barra, informe no resumo, sem alterar a regra.

## 4. Linhas

Da esquerda para a direita: ícone, título e tipo, status, ação. Status e ação ficam em colunas fixas, para alinhar em todas as linhas.

| Estado | Ícone | Status | Ação |
|---|---|---|---|
| Conteúdo disponível | Verde | Status atual de progresso | `acao.label` como botão discreto |
| Conteúdo concluído | Verde | Check + "Concluído" | `acao.label` |
| Conteúdo bloqueado | Cadeado cinza | Nenhum | Nenhuma |
| Quiz disponível | Roxo | Status atual | "Iniciar quiz" |
| Quiz indisponível | Roxo | Status atual | Nenhuma |
| Quiz concluído | Roxo | Check + "Concluído" | "Ver revisão" |

- Reutilizar `.atividades-curso__icone--conteudo` e `.atividades-curso__icone--quiz`. O ícone mantém a cor da categoria no hover e no item aberto.
- **Título concluído:** tirar o tom apagado de `.atividades-curso__item--concluido` só nestas trilhas. Concluído não pode parecer desabilitado.
- **Item bloqueado:** mantém a aparência apagada.
- Tirar a linha de meta do status. O tipo continua abaixo do título.
- **"Ver revisão":** substitui o botão de olho, com texto visível, nos quizzes vinculados e nos do módulo. O clique continua chamando `onAbrirRevisao(quiz)`. Atualize `aria-label` e `data-tooltip`, que ficam redundantes.
- **Iniciar quiz:** hoje há "Fazer quiz" (primário) e "Iniciar quiz" (sucesso) para a mesma ação. Usar "Iniciar quiz", `variante="primario"`, nos dois casos.
- **Links `<a>` de ação:** mesma aparência de botão discreto, mantendo `href`, `target` e `marcarConcluidoAoAbrir`.

## 5. Conteúdo + quiz como um só bloco

Seguir o padrão do professor, com a linha de ligação:

- envolver linha + prévia em `.atividades-curso__item-aberto`, para reaproveitar o `::after` da ligação;
- sem divisória entre o conteúdo e seus quizzes, com a divisória depois do último quiz;
- quiz compacto, com ícone menor, e título ao lado;
- item bloqueado continua sem mostrar seus quizzes, como hoje.

## 6. Quizzes do módulo

Hoje eles estão na mesma lista dos conteúdos. Separar em lista própria, depois dos conteúdos, com a mesma faixa do professor: troféu pequeno + "Quizzes do módulo". Sem quizzes no módulo, a faixa não aparece.

- Texto abaixo do título: `n questão` ou `n questões`, sem "Quiz -" e sem "questao(oes)".
- A ordem interna dos quizzes não muda.

## 7. Texto repetido

- Mover `normalizarTextoComparavel`, `temDescricaoPropria`, `tituloQuizEhGenerico` e `montarNomesExibicaoQuizzesVinculados` de `SecaoConteudosProfessor.jsx` para um módulo compartilhado, e reutilizar. Não copie o código.
- Quiz vinculado com título genérico: exibir "Quiz do conteúdo", mantendo o título real em `title` e nas descrições acessíveis.
- Prévia: omitir o parágrafo vindo de `obterPreviaConteudoAluno` quando ele repetir o título. O texto padrão, o `corpoTexto` e a data continuam.
- A prévia do aluno sempre tem data, então a seta continua nos itens não bloqueados.
- Usar no painel aberto o mesmo estilo da descrição do professor.

## 8. Fundos, topo e acentos

- Mesmos níveis de fundo do professor. **Não criar** o "container principal" do item 9.4 do `.txt`: seria um nível que o professor não tem.
- Topo: título e progresso continuam como hoje, com `n% concluído` e `BarraProgresso`, alinhados ao padrão de espaçamento do professor.
- Acentos só nos textos deste escopo: "Voltar para Conteúdos", "Módulo", "concluído(s)", "Conteúdo bloqueado", "Conclua o módulo anterior para desbloquear", "Navegação da trilha de conteúdos", "Nenhum material publicado neste curso ainda".
- O texto do aviso de avaliação **não muda**, nem os acentos. O restante do sistema fica para o item 15 da auditoria.

## Testes

Atualizar `SecoesAluno.test.jsx` e os testes da prévia, se forem afetados, e adicionar:

- contagem inclui quizzes, com singular em `1/1 concluído`;
- módulo concluído mostra check e seta, e abre e fecha;
- "Ver revisão" aparece com texto e abre a revisão;
- "Iniciar quiz" aparece nos dois tipos de quiz e abre a confirmação;
- item bloqueado mantém cadeado, sem ação e sem quizzes;
- quiz com título genérico exibe "Quiz do conteúdo", e o título próprio é mantido;
- módulo sem quizzes não mostra a faixa.

Os testes do professor continuam passando depois de mover os helpers.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No app real, como aluno, conferir:
  - abrir PDF, imagem, vídeo, texto e link;
  - abrir um conteúdo marca como concluído e libera o próximo;
  - bloqueio entre conteúdos e entre módulos;
  - iniciar, concluir e revisar quiz;
  - aviso de avaliação liberada igual ao atual;
  - rolagem da página depois de abrir e fechar visualizadores.
- Desktop, tablet e celular, nos temas escuro e claro, sem rolagem horizontal nem sobreposição.
- Tela do professor, "Visualizar como aluno", Módulos, Progresso, Avaliações e grade de cursos sem regressão.

## Entrega

Informar o que mudou em cada item, qualquer diferença em relação à imagem e prints antes/depois: módulo aberto, bloqueado e concluído. Se precisar de rota nova ou mudar regra de progresso, pare e avise.
