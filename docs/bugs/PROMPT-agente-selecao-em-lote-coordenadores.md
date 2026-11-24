# Prompt — Seleção em lote na lista de Coordenadores, igual à de Professores (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário:** no acesso ADMIN, Gestão › Coordenadores, a lista não tem a caixa de seleção para marcar vários coordenadores, como a lista de Professores tem. Deve ficar igual.

## O que o agente de arquitetura já verificou (não repetir)

**Professores (`frontend/src/pages/workspace/SecaoProfessores.jsx`)** — referência:
- Estado: `selecionados` (Set), `confirmacaoLote`, `executandoLote`, `refCheckboxCabecalho` (≈ linhas 72–75).
- Seleção:
  - `todosSelecionadosNaPagina` e `algunsSelecionadosNaPagina` (≈ 125–126);
  - poda da seleção para os ids visíveis, que cobre troca de aba, busca e página (≈ 128–137);
  - caixa do cabeçalho com estado indeterminado (≈ 139–143);
  - `alternarSelecao`, `alternarSelecaoPagina` e `limparSelecao` (≈ 145–175).
- Ação em lote: `executarAcaoLote` (≈ 177–234) faz um `PUT /Professores/{id}` por item com o `ativo` novo. Em 401 chama `onSessionExpired`, conta sucessos e falhas, depois limpa a seleção, chama `onRefresh` e mostra o toast.
- Interface:
  - contador e ações à direita, dentro de `.barra-filtros`, em `.barra-filtros__selecao` (≈ 492–517, Opção A já aplicada): "N professor(es) selecionado(s)" com `aria-live`, "Inativar selecionados" na aba Ativos ou "Reativar selecionados" na aba Inativos, e "Limpar seleção";
  - na tabela, primeira coluna com caixa no `<th>` ("Selecionar todos … desta pagina") e em cada linha. A célula da linha tem `onClick={(event) => event.stopPropagation()}`, para marcar sem abrir o detalhe;
  - modal de confirmação (≈ 702–727).

**Coordenadores (`frontend/src/pages/workspace/SecaoCoordenadores.jsx`):**
- Não tem nada de seleção. A `.barra-filtros` (≈ linhas 370–374) só tem "Limpar filtros". A tabela (≈ 376 em diante) começa direto em "Coordenador" e tem `colSpan={4}` na linha vazia.
- `alternarStatusCoordenador` (≈ 275) já faz `PUT /Coordenadores/{id}` com o corpo completo e `ativo`. É o mesmo corpo para usar no lote.

**Backend:** `PUT /Coordenadores/{id}` (`Controllers/CoordenadoresController.cs`, só Admin) chama `CoordenadorService.AtualizarCoordenadorAsync`, que só ativa ou desativa, sem regra que bloqueie inativar coordenador com curso. Não precisa de endpoint novo.

A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Levar para `SecaoCoordenadores.jsx` o mesmo comportamento de seleção e ação em lote de Professores:
   - caixa no cabeçalho, com estado indeterminado, e em cada linha;
   - poda pelos ids visíveis;
   - contador e ações na linha do "Limpar filtros";
   - modal de confirmação;
   - execução item a item com o resultado parcial no toast.
   Os textos ficam no feminino/masculino certo: "coordenador(es) selecionado(s)", "Inativar selecionados", "Reativar selecionados", "Limpar seleção" e as mensagens de confirmação e toast.
2. Ajustar a tabela: nova primeira coluna e `colSpan` da linha vazia de 4 para 5. As caixas não podem abrir o detalhe do coordenador ao serem clicadas.
3. Para não duplicar a lógica, preferir extrair um hook compartilhado, por exemplo `useSelecaoEmLote(itensPagina)` em `frontend/src/hooks/`, com seleção, poda, indeterminado e as funções de alternar e limpar, e usá-lo nas duas telas. Se extrair, Professores tem que continuar idêntico em comportamento e visual.
4. Reaproveitar as classes de Professores (`.barra-filtros__selecao` e o contador). Não criar estilo novo se o existente servir.

**Não alterar** a busca, a ordenação, as abas, a paginação, o cadastro e edição nem a ação individual de inativar ou reativar pelo menu da linha.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Admin, em Gestão › Coordenadores:

- Cada linha e o cabeçalho têm a caixa. Marcar todos da página, marcar alguns (cabeçalho indeterminado) e desmarcar funcionam.
- Clicar na caixa da linha não abre o detalhe. Clicar no resto da linha continua abrindo.
- Com seleção, o contador e as ações aparecem à direita do "Limpar filtros", sem a tabela se mexer. "Inativar selecionados" na aba Ativos, "Reativar selecionados" na aba Inativos.
- Confirmar inativa ou reativa todos, atualiza as contagens das abas e limpa a seleção. Com falha parcial, o toast mostra "N de M".
- Trocar de aba, buscar ou mudar de página não deixa seleção "fantasma".
- Professores continua igual.
- Testes (vitest) da seleção e do lote em Coordenadores e, se houver hook, do hook. `npm run lint` e `npm test` sem erros novos.
