# Prompt — Ajuste: seleção em lote na tela Professores sem deslocar a tabela (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (vídeo de 12 s, acesso Coordenador, `/app/professores`):** ao marcar professores, a faixa "8 professores selecionados" entra acima da tabela e o cabeçalho das colunas (PROFESSOR / ESPECIALIDADE / …) desce. Ao desmarcar, a faixa some e a tabela sobe de novo. O usuário quer mudar esse comportamento.

**Decisão do usuário (Opção A, imagem `selecao-professores-opcao-a.png` nesta pasta):** o contador e as ações em lote aparecem à direita, na mesma linha do "Limpar filtros". Não há faixa nova e a tabela nunca se mexe.

## O que o agente de arquitetura já verificou (não repetir)

- Tela: `frontend/src/pages/workspace/SecaoProfessores.jsx`.
  - `.barra-filtros` (≈ linhas 492–496) contém só o "Limpar filtros".
  - `{selecionados.size > 0 ? <div className="toolbar-massa">…` (≈ linhas 498–518) é a faixa que entra entre a barra de filtros e a tabela, e por isso empurra a tabela.
  - Ações da faixa: "Inativar selecionados" (aba Ativos) ou "Reativar selecionados" (aba Inativos), com `setConfirmacaoLote`, e "Limpar selecao", com `limparSelecao` (≈ linha 173).
- `.toolbar-massa` (`frontend/src/styles/layout.css` ≈ linhas 1210–1234) só é usada nesta tela.
- `.barra-filtros` (`styles/componentes.css` ≈ linha 417) é flex com `flex-wrap` e `gap`, e é compartilhada por Alunos, Professores, Coordenadores e Cursos.
- Nenhuma outra tela tem seleção em lote com essa faixa.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login. O vídeo mostra o problema.

## Tarefa

1. Remover a faixa `.toolbar-massa` de cima da tabela.
2. Quando `selecionados.size > 0`, mostrar dentro de `.barra-filtros`, empurrado para a direita (`margin-left: auto` num grupo próprio):
   - o contador "N selecionado(s)";
   - o botão "Inativar selecionados" ou "Reativar selecionados", conforme a aba;
   - o botão "Limpar seleção" (com acento).
   Sem seleção, a linha fica só com "Limpar filtros", como hoje.
3. A altura da linha não pode mudar ao aparecer ou sumir a seleção. Os botões têm o mesmo tamanho (`tamanho="pequeno"`) do "Limpar filtros". Conferir que nada pula 1 ou 2px.
4. Em tela estreita, o grupo da direita pode quebrar para a linha de baixo pelo `flex-wrap`. Nesse caso, pode empurrar a tabela, mas só em celular.
5. Anunciar a mudança do contador para leitor de tela (`aria-live="polite"` no contador ou num texto oculto).
6. Remover as regras de `.toolbar-massa` que ficarem sem uso. A regra de impressão em `layout.css` ≈ linha 2210 também cita a classe: ajustar para esconder o novo grupo na impressão.

**Não alterar** a lógica de seleção, as confirmações em lote nem as outras telas que usam `.barra-filtros`. O estilo novo fica num modificador ou classe própria.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Coordenador, na tela Professores:

- Marcar e desmarcar um professor, todos da página e "Limpar seleção": o cabeçalho das colunas e as linhas não se mexem no desktop.
- Aba Ativos mostra "Inativar selecionados", aba Inativos mostra "Reativar selecionados". As confirmações funcionam como antes.
- Em ≈ 400px de largura, as ações quebram de linha sem cortar texto.
- Alunos, Coordenadores e Cursos sem mudança visual.
- `npm run lint` e `npm test` sem erros novos. Atualizar os testes que procuravam a faixa.
