# Prompt — Confirmação com aviso ao encerrar e reabrir curso (Coordenador, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário:** quando o Coordenador for encerrar (finalizar) um curso, mostrar uma confirmação com aviso das consequências e os botões de confirmar e cancelar.

Hoje o botão **"Encerrar curso" age na hora, sem confirmação**: um clique sem querer tira o curso da home e trava o conteúdo. Num curso de Acompanhamento, ainda emite certificados, o que não volta atrás. O **"Reabrir curso"** também age direto.

**Imagem aprovada pelo usuário:** `confirmacao-encerrar-curso.png`, nesta pasta. À esquerda está o curso Grátis, à direita o de Acompanhamento. Os números amarelos e o quadro lateral são só explicação, não fazem parte da tela.

## O que o agente de arquitetura já verificou (não repetir)

- `pages/workspace/PainelCursoGestao.jsx`:
  - o botão "Encerrar curso" (≈ linhas 275–279) chama `onEncerrarCurso` direto;
  - o "Reabrir curso" (≈ linhas 280–290) chama `onReabrirCurso` direto, desabilitado quando `pacoteTravadoNaVenda`;
  - as condições usam `temCicloDeEncerramento` e `curso.concluidoPeloProfessorEm`;
  - o componente já importa `Modal` (≈ linha 28) e tem `desempenho.totalAlunos` (KPI "Alunos", ≈ linha 300).
- `pages/workspace/SecaoCursos.jsx`: `onEncerrarCurso` e `onReabrirCurso` levam a `executarAcaoCurso` (≈ linhas 292–314), que faz `POST /Cursos/{id}/encerrar|reabrir`, toast de sucesso ou erro e `onRefresh`.
- O Professor já tem uma confirmação parecida ao concluir o curso (`SecaoConteudosProfessor.jsx` ≈ linhas 1443–1465, `Modal` com Cancelar/Confirmar). Seguir o mesmo componente.
- Consequências reais do encerramento, no backend do fluxo de venda já aplicado:
  - **Grátis:** sai do catálogo e da home, sem matrícula nova; alunos atuais mantêm o acesso e podem pedir o certificado; conteúdo, quizzes e módulos ficam travados; os Admins são notificados e podem transformar em pacote.
  - **Acompanhamento:** sai do catálogo, conteúdo travado e **emissão automática de certificados** para quem cumpre os requisitos.
- O frontend **não tem** a contagem de "quantos vão receber o certificado" no Acompanhamento. Não criar endpoint só para isso.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Em `PainelCursoGestao.jsx`, **"Encerrar curso" passa a abrir uma janela de confirmação** (`Modal`) em vez de encerrar direto. Só o botão de confirmar da janela chama `onEncerrarCurso`.
2. **Conteúdo da janela, conforme a imagem:**
   - Título: `Encerrar "<título do curso>"?`, com o ícone de cadeado.
   - Linha de abertura: "O professor concluiu este curso em dd/mm. Confira o que acontece ao encerrar:", usando `curso.concluidoPeloProfessorEm`.
   - **Curso Grátis**, lista com ícones:
     - "Sai da home e do catálogo; **nenhum aluno novo** consegue entrar."
     - "Os **N alunos matriculados continuam** estudando e podem pedir o certificado." N vem de `desempenho.totalAlunos`; sem esse dado, "Os alunos matriculados continuam…".
     - "Materiais, quizzes e módulos ficam **travados** para edição."
     - "O **Admin é avisado** e pode transformar o curso em pacote pago."
     - Aviso **amarelo**: "Dá para **reabrir depois**, enquanto o curso não estiver à venda."
     - Botões: **"Cancelar"** (fantasma) e **"Encerrar curso"** (primário).
   - **Curso de Acompanhamento**, lista com ícones:
     - "Sai da home e do catálogo; nenhum aluno novo consegue entrar."
     - "**Os alunos que cumpriram os requisitos recebem o certificado automaticamente.**" Sem número, porque o front não tem essa contagem.
     - "Materiais, quizzes e módulos ficam travados para edição."
     - Aviso **vermelho**: "Os certificados emitidos **não são desfeitos**, mesmo se o curso for reaberto."
     - Botões: **"Cancelar"** e **"Encerrar e emitir certificados"**.
3. **Comportamento:**
   - enquanto encerra, o botão de confirmar mostra "Encerrando…" e os dois botões ficam desabilitados;
   - deu certo: fecha a janela e mantém o toast de sucesso atual;
   - deu erro: fecha a janela e mostra o toast de erro atual (comportamento de `executarAcaoCurso`). Se for simples, manter a janela aberta com a mensagem em `InlineMessage`, como na confirmação do Professor;
   - "Cancelar", o X e o clique fora fecham sem chamar nada.
4. **"Reabrir curso" também ganha confirmação**, simples e no mesmo padrão:
   - título `Reabrir "<título>"?`;
   - texto "O conteúdo volta a ser editável pelo professor e o curso volta a aceitar novos alunos.";
   - no Acompanhamento, mais uma linha: "Os certificados já emitidos continuam válidos.";
   - botões "Cancelar" e "Reabrir curso".
   - A regra do pacote à venda (botão desabilitado com a dica) continua igual.
5. Textos com acentuação correta. Ícones já usados no projeto (`TbLock`, `TbLockOpen`, `TbAlertTriangle` ou equivalente existente), com `aria-hidden`. A janela é acessível pelo próprio `Modal` (foco e Esc).

**Não alterar** o backend, as regras de quando os botões aparecem, a janela "Preparar para venda" nem a confirmação do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Coordenador, comparando com a imagem:

- **Curso Grátis concluído pelo professor:** "Encerrar curso" abre a janela com a data de conclusão, o número de alunos, os 4 itens e o aviso amarelo.
  - "Cancelar" não muda nada.
  - "Encerrar curso" encerra, com toast, e o curso fica "Encerrado".
- **Curso de Acompanhamento:** a janela mostra a linha dos certificados automáticos, o aviso vermelho e o botão "Encerrar e emitir certificados".
- **Reabrir:** abre a confirmação; "Cancelar" não muda nada; confirmar reabre.
- **Pacote à venda:** "Reabrir" continua desabilitado, com a dica.
- **Erro do backend:** aparece a mensagem e nada fica travado na tela.
- Testes (vitest): abrir e cancelar sem chamar a API; confirmar chama `onEncerrarCurso` uma vez; textos diferentes para Grátis e Acompanhamento; confirmação do reabrir. `npm run lint` e `npm test` sem erros novos.
