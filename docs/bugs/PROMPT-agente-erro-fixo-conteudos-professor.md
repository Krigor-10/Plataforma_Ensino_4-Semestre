# Prompt — Bug: mensagem de erro fixa na tela de Conteúdos do professor (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print):** na tela Acadêmico › Conteúdos do PROFESSOR, ao tentar publicar um quiz sem questões, aparece no topo a faixa vermelha "Adicione ao menos uma questao antes de publicar o quiz.". Ela não some mais, só ao recarregar a página.

## O que o agente de arquitetura já verificou (não repetir)

- O texto vem do backend: `Services/AvaliacaoService.cs` ≈ linha 213 (`InvalidOperationException`, regra do commit d1eaa3a). A regra está certa e **não deve mudar**.
- `frontend/src/pages/workspace/SecaoConteudosProfessor.jsx`:
  - estado `mensagemLista` (≈ linha 119), mostrado como `<InlineMessage>` no topo da trilha (≈ linha 1419), sem botão de fechar e sem tempo para sumir;
  - só é limpo ao trocar de curso (efeito ≈ linha 182) ou quando outra ação da lista começa (`setMensagemLista({ tone: "", message: "" })` no início de cada função). Por isso fica "para sempre";
  - **6 ações** gravam erro nele: `alternarPublicacao` (conteúdo, ≈ 452), `restaurarConteudoParaRascunho` (≈ 483), `alternarPublicacaoQuiz` (≈ 506, o caso do print), `restaurarQuizParaRascunho` (≈ 531), `arquivarQuiz` (≈ 554) e `reordenarConteudo` (≈ 577);
  - os **sucessos** dessas mesmas ações já usam toast (`mostrarToast(..., "sucesso")`), que some sozinho.
- `hooks/useToast.jsx`: `mostrarToast(mensagem, tipo, duracaoMs)` com duração padrão de 4 s. `components/Toast.jsx` já tem o tipo `"erro"`, e outras telas (Professores, Coordenadores) já mostram erro de ação em lote por toast.
- As mensagens dos modais (formulário, exclusão de conteúdo, exclusão de quiz) são outro estado e estão corretas: ficam dentro do modal e somem ao fechá-lo. **Fora do escopo.**
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Nas 6 ações da lista, trocar `setMensagemLista({ tone: "error", ... })` por `mostrarToast(mensagem, "erro")`, com o mesmo texto de hoje (do backend ou o padrão). Usar uma duração um pouco maior que a de sucesso, por exemplo 6 s, para dar tempo de ler o erro.
2. Remover o estado `mensagemLista`, o `<InlineMessage>` do topo, a prop `mensagemLista` passada ao filho (≈ linhas 669 e 980) e os resets que ficarem sem uso, incluindo o efeito da troca de curso, se servir só para isso.
3. Não alterar o tratamento de 401 (`onSessionExpired`), o `acaoEmAndamentoId`, as mensagens dos modais nem a regra do backend.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Professor, na tela Conteúdos:

- Publicar um quiz sem questões mostra o erro como toast vermelho, que some sozinho em alguns segundos ou ao clicar no "×" do toast. Nenhuma faixa fica fixa no topo.
- Publicar o quiz depois de adicionar questões mostra o toast de sucesso, como hoje.
- As outras ações com erro (por exemplo, arquivar ou reordenar sem conexão com o backend) também usam toast.
- Os erros dentro dos modais continuam iguais.
- Testes (vitest): o caso "publicar quiz sem questões → toast de erro e nenhuma faixa no topo". Ajustar os testes que procuravam a faixa. `npm run lint` e `npm test` sem erros novos.
