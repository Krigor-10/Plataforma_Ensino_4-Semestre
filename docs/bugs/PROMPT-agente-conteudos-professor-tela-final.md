> **Substituído por `docs/TelaConteudosProfessor/PROMPT-agente-tela-conteudos-consolidado.md`.** Só as seções 4 e 5 e os testes de seleção continuam valendo, conforme aquele prompt.

# Prompt — Tela final de Conteúdos do professor, com seleção em massa (web)

## Contexto

O usuário aprovou uma imagem de referência e quer `TrilhaConteudosProfessor` nessa forma e nessa lógica. Arquivos principais: `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`, `frontend/src/styles/workspace.css` e `frontend/src/components/MenuAcoes.jsx`. Também vale para o desktop, que é o Electron abrindo o web.

**Sem rota nova e sem dependência nova.** As ações em massa usam as rotas que já existem.

**Antes de começar:**

- As rodadas anteriores desta tela ainda não foram commitadas. Parta dessa versão e não descarte nada.
- Aplique antes, se ainda não estiverem no código: `docs/bugs/PROMPT-agente-menu-acoes-sobreposicao.md`, `docs/bugs/PROMPT-agente-menu-adicionar-modulo-vazio.md` e `docs/bugs/PROMPT-agente-conteudos-professor-verde-icones.md`. A imagem mostra ícones coloridos, mas **vale o verde suave** do último prompt.
- Os números de linha valem para a versão de 2026-11-05.

**Escopo do CSS:** tudo sob `.tela-conteudos` e/ou `.conteudos-modulo--editavel`. "Visualizar como aluno" e as telas que compartilham as classes não mudam.

## Layout de referência

```
← Voltar para Conteúdos
Título do curso                                     [Visualizar como aluno]
▓▓▓▓▓▓▓▓▓▓▓░░░░   6 de 8 publicados • 2 pendentes • 2 arquivados

[01] Fundamentos da Web Moderna              3 conteúdos • 2 quizzes    ^
[ ] Selecionar tudo  |  [Excluir selecionados]  [Mais ações v]
[ ] [ícone] Título / tipo                    [Rascunho]  Editar  ⋮  v
[ ] [ícone] Título / tipo                                Editar  ⋮  v
 |  [ ] [troféu] Quiz do conteúdo / Quiz     [Rascunho]  Editar  ⋮  v
[troféu] QUIZZES DO MÓDULO
[ ] [troféu] Quiz do módulo / Quiz                       Editar  ⋮  v
[+ Adicionar]  [Gerar quiz com IA]

[02] Módulo fechado                          1 conteúdo • 2 quizzes     v
[03] Módulo vazio                 Vazio · não aparece para o aluno      v
```

## 1. Topo do curso

- Barra de progresso em verde sólido (`--cor-sucesso`), só nesta tela. `BarraProgresso.jsx` é compartilhado: use uma regra sob `.tela-conteudos`.
- À direita, em uma linha com separador `•`:
  - `6 de 8 publicados`, com o número em verde;
  - `2 pendentes` em laranja, com o comportamento atual de "Falta publicar: n";
  - `2 arquivados` como ação de texto discreta, abrindo o modal atual.
- Sem pendentes ou sem arquivados, o trecho correspondente some.
- Atualize os testes que usam "Falta publicar" e "Ver arquivados".

## 2. Módulos

- Cartão e faixa continuam como na rodada 2. A coluna do ícone passa a `2.5rem`.
- Contagem no cabeçalho: `3 conteúdos • 2 quizzes`.
- Rascunhos no cabeçalho: mostrar `· n rascunhos` só com o módulo **fechado**, para não esconder a pendência. Aberto, os selos das linhas já mostram isso.
- Módulo vazio: borda sólida, igual à dos demais. Sai a borda tracejada. O texto "Vazio · não aparece para o aluno" continua.

## 3. Linhas

Da esquerda para a direita: caixa de seleção, ícone, título e tipo, selo (só Rascunho), Editar, ⋮, seta de expandir.

- **Setas ↑↓ saem da linha.** Isso substitui a decisão anterior de mantê-las. "Mover para cima" e "Mover para baixo" continuam no menu ⋮ dos conteúdos, com teclado funcionando.
- **Seta de expandir:** vai para a direita, em todas as linhas, como `button` com `aria-expanded` e `aria-label`. Sem descrição, o painel mostra "Sem descrição." em texto discreto.
- **Quizzes:** ganham expansão com `quiz.descricao`, com a mesma regra.
- **Linha do conteúdo:** deixa de ter `role="button"` e `tabIndex`, porque a seta passa a ser o controle acessível. Clicar na área livre da linha continua abrindo e fechando. Clicar na caixa de seleção ou nas ações, não.
- **Quiz vinculado:** recuado, com caixa de seleção própria, e a guia vertical alinhada ao centro da caixa do conteúdo pai.
- **Quizzes do módulo:** faixa com troféu pequeno + título. As linhas ficam no mesmo nível dos conteúdos, sem recuo e com **uma** caixa de seleção. A imagem mostra duas caixas nessa linha: **não copiar**.

## 4. Seleção

- Barra logo abaixo da faixa do módulo, só no módulo aberto e com pelo menos um item.
- "Selecionar tudo" marca todos os conteúdos e quizzes não arquivados do módulo. Com seleção parcial, a caixa fica indeterminada (`indeterminate`).
- Com itens marcados, o rótulo muda para `n selecionados`, anunciado por `aria-live="polite"`.
- A seleção vale por módulo: limpar ao fechar ou trocar de módulo. Depois de atualizar a lista, retirar da seleção os itens que não existem mais.
- Identificar os itens por tipo + id: conteúdo e quiz têm ids independentes.
- Rótulo acessível de cada caixa: `Selecionar {titulo}`.
- Em telas estreitas, a barra quebra linha sem rolagem horizontal.

## 5. Ações em massa

"Excluir selecionados" fica desabilitado sem seleção e, com seleção, usa a aparência de perigo. "Mais ações" usa `MenuAcoes` com:

- Publicar selecionados
- Voltar para rascunho
- Arquivar selecionados

Todas passam por **um único modal de confirmação**, com a quantidade de itens. Publicar avisa que os alunos serão notificados.

| Ação | Conteúdo | Quiz |
|---|---|---|
| Excluir | `DELETE /ConteudosDidaticos/{id}` | `DELETE /Avaliacoes/{id}` |
| Status | `PUT /ConteudosDidaticos/{id}` com `montarPayloadConteudo` | `PUT /Avaliacoes/{id}` com `montarPayloadAvaliacao` |

Regras:

- Executar em sequência, um item por vez. Bloquear a barra durante a execução.
- **Excluir quizzes antes dos conteúdos.** O backend recusa excluir conteúdo que tenha quiz vinculado, inclusive arquivado (`ConteudoDidaticoService.cs:166`).
- Conteúdo marcado cujo quiz não foi marcado vai falhar por essa regra. Mostre o motivo e siga para os demais.
- **Excluir pode arquivar:** as rotas respondem `arquivado: true` quando há progresso ou tentativa de aluno. O modal deve avisar disso, e o resumo deve contar esses itens como arquivados.
- Ações de status: ignorar itens que já estão no status pedido.
- Uma falha não interrompe o lote. Exceção: `401` chama `onSessionExpired` e para.
- No fim, `onRefresh()`, toast com o resumo (por exemplo, "3 excluídos, 1 arquivado, 1 falhou") e `InlineMessage` com título e motivo de cada falha. Itens que falharam continuam selecionados.
- Reaproveitar a lógica existente de payload e tratamento de erro. As ações individuais do menu ⋮ continuam funcionando.
- Publicar conteúdo já gera uma notificação por item no backend. Não altere isso; informe no resumo final quantas um lote pode gerar.
- Se `demoApi.js` não cobrir alguma dessas rotas, ajuste o modo demo.

## Fora do escopo

- `NavGrupo.jsx`, `BarraTopo.jsx`, acentos da navegação e perfil repetido.
- Títulos como "Teste conteúdo imagem", "APIs e Integracao" e `ANALISE_DESENVOLV_SIST_TOMO_01`: são dados cadastrados e não devem ser alterados por código.
- Backend e rotas.

## Testes

Atualizar os testes afetados e adicionar:

- "Selecionar tudo" marca, desmarca e fica indeterminado;
- seleção é limpa ao trocar de módulo;
- "Excluir selecionados" fica desabilitado sem seleção;
- exclusão em lote chama os quizzes antes dos conteúdos;
- resposta `arquivado: true` entra no resumo como arquivado;
- falha em um item não interrompe os demais, e o item continua selecionado;
- `401` interrompe o lote;
- status em lote ignora itens que já estão no status pedido;
- seta expande item sem descrição e mostra "Sem descrição.";
- mover pelo menu ⋮ continua funcionando;
- clicar na caixa de seleção não expande a linha;
- linha de quiz do módulo tem uma única caixa de seleção.

## Verificação

- `npm run lint` e `npm test` sem erros novos.
- No app real (`http://127.0.0.1:5173`, com o backend local), sem modo demo, comparar com a imagem de referência, em largura de desktop e de celular, temas escuro e claro.
- Fazer um lote misto de conteúdos e quizzes, com uma falha, e conferir o resumo.
- Conferir a navegação completa por teclado: caixas, barra, menus, Editar e setas de expandir.
- "Visualizar como aluno", telas do aluno, Módulos e Avaliações sem mudança.

## Entrega

No resumo final, informar o que mudou em cada item, qualquer diferença em relação à imagem e prints antes/depois. Se precisar de rota nova para cumprir algum item, pare e avise, sem criá-la.
