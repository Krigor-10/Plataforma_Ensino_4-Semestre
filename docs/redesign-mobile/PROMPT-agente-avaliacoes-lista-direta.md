# Prompt: app mobile — Avaliações em lista direta, com abas "Disponíveis | Concluídas" e filtro por curso (só visual e navegação local)

## Pedido do usuário (2026-11-24, dois prints)

**Hoje a aba Avaliações tem dois passos:**
1. "Selecione um curso": a lista de **todos** os cursos, inclusive os que não têm avaliação.
2. Tocar num curso abre "Curso ativo · Trocar". Muitas vezes aparece só "Este curso ainda não possui avaliações disponíveis", e "Trocar" volta para a lista.

O usuário pediu sugestões, viu a imagem `docs/redesign-mobile/avaliacoes-opcoes.png` e escolheu a **opção A, a lista direta**: abrir já mostrando as avaliações de todos os cursos, **sem passo de seleção**.

## Onde está (verificado pelo agente de arquitetura)

- **Tela:** `mobile/src/screens/aluno/AvaliacoesScreen.jsx` (≈ 490 linhas).
  - Estado `cursoSelecionadoId` (≈ linha 57); sem curso, mostra o `SeletorCurso` (≈ linha 188).
  - Com curso, mostra o `CartaoCursoAtivo` com "Trocar" (≈ linha 236) e os cartões.
  - **Filtro:** só avaliações formais (`tipoAvaliacao !== TIPO_QUIZ`, ≈ linha 123). Quiz fica fora, como hoje.
  - A regra de "concluída" (≈ linha 34) e a de disponibilidade e bloqueio, as tentativas (`tentativasRealizadas`/`tentativasPermitidas`), a nota (`ultimaNota`, `notaMaxima`, mínimo 7) e o modal de confirmação **já existem nessa tela**.
- **Dados:** vêm do `snapshot.avaliacoes` (`GET /Avaliacoes/aluno/{id}`), que já traz as avaliações de **todos** os cursos, com `cursoId`. **Não precisa de endpoint novo.**
- **Componentes:**
  - `SeletorCurso.jsx` e `CartaoCursoAtivo.jsx` deixam de ser usados aqui; remover se ficarem sem uso em outro lugar;
  - **abas:** `mobile/src/components/AbasSegmentadas.jsx`, criado pelo prompt `docs/certificados-mobile/PROMPT-agente-certificados-abas-topo.md`. Se ainda não existir, criar neste prompt com a mesma especificação (trilho, pílula roxa, contador, `tablist`/`tab`) e a tela de Certificados reaproveita.
- **Barra de navegação flutuante** (`PROMPT-agente-barra-navegacao-quadrado-roxo.md`): o último cartão não pode ficar escondido.

## Tarefa

1. **Sem passo de seleção:** a tela abre direto na lista. Remover o `cursoSelecionadoId` como passo obrigatório, o `SeletorCurso` e o "Curso ativo · Trocar" desta tela.
2. **Topo:**
   - **`AbasSegmentadas`** com **"Disponíveis · N"** e **"Concluídas · N"**, com os totais dentro do filtro de curso atual;
   - logo abaixo, **chips de curso** com rolagem horizontal: "Todos os cursos" (padrão) e um chip por curso que **tem** pelo menos uma avaliação formal. Cursos sem avaliação **não aparecem**. Tocar num chip filtra as duas abas;
   - se o aluno vier de outra tela com um curso definido (ex.: o atalho de um curso), o chip desse curso já vem marcado.
3. **Cartão de avaliação** (reaproveitar o cartão atual e acrescentar o nome do curso):
   - **linha 1:** ícone; título; embaixo, o **nome do curso** (em "Todos os cursos"); à direita, o **selo de situação**: "Disponível" (verde), "Em andamento" (azul, se houver tentativa aberta), "Concluída" (azul ou neutro), "Bloqueada" (cinza) ou "Encerrada";
   - **linha 2, dados lado a lado:** "N questões", "N/M tentativas" e "última nota" (ou "—"); duração, se existir;
   - **botão de ação** em pílula roxa: "▶ Iniciar avaliação", "▶ Continuar" ou "Tentar de novo" (quando houver tentativa e não estiver concluída); em "Concluídas", "Ver revisão" (secundário);
   - o fluxo do toque (modal de confirmação e execução) **não muda**.
4. **Conteúdo das abas:**
   - **Disponíveis:** as liberadas, pendentes ou em andamento primeiro; **no fim**, um subtítulo "Ainda bloqueadas" com as bloqueadas e o motivo de hoje (ex.: "conclua os conteúdos"), sem botão;
   - **Concluídas:** as aprovadas, ou com tentativas esgotadas (a regra de "concluída" de hoje), da mais recente para a mais antiga;
   - **aba inicial:** "Disponíveis". Se estiver vazia e houver concluídas, abre em "Concluídas".
5. **Estados vazios:**
   - **Disponíveis:** "Nenhuma avaliação disponível agora." e, se houver bloqueadas, a dica do que falta;
   - **Concluídas:** "Você ainda não concluiu avaliações.";
   - **nenhuma avaliação em nenhum curso:** "Seus cursos ainda não têm avaliações." (substitui a mensagem por curso de hoje).

**Não alterar:**
- regras de disponibilidade, bloqueio, tentativas e nota;
- o modal de confirmação e a execução (`QuizModal`);
- a revisão;
- o quiz continua fora desta tela;
- os dados e endpoints;
- as outras abas.

## Testes (jest)

- **Abertura:** a tela abre sem passo de seleção, mostrando avaliações de mais de um curso, com o nome do curso no cartão.
- **Chips:** só aparecem cursos com avaliação formal; tocar num chip filtra a lista e os contadores.
- **Abas:** "Disponíveis" e "Concluídas" separam pela regra de hoje; as bloqueadas ficam no fim de "Disponíveis"; aba inicial certa.
- **Quiz:** não aparece.
- **Toque:** o botão continua abrindo o fluxo de hoje.

## Critérios de aceite

Verificar no app (Expo), num Android e num iPhone, logado como Aluno Demo:

- **Abertura:** tocar em "Avaliações" mostra **direto** as abas "Disponíveis | Concluídas", os chips de curso e os cartões (ex.: "Banco ENADE/CQA - Revisão" de Desenvolvimento Web Full Stack), **sem** a lista "Selecione um curso".
- **Cursos sem avaliação:** "Curso Teste Gratuito QA", por exemplo, não aparece nos chips.
- **Filtro:** tocar em "Desenvolvimento Web" mostra só as avaliações desse curso, e os contadores das abas mudam.
- **Fluxo:** "Iniciar avaliação" abre o mesmo modal de confirmação de hoje.
- **Barra flutuante:** o último cartão aparece inteiro acima da barra.
- `npm test` (mobile) e o lint sem erros novos.
