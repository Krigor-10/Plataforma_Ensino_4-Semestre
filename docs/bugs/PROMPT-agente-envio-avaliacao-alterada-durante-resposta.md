# Prompt: envio do aluno falha quando o professor arquiva, despublica ou exclui a avaliação durante a resposta (backend + frontend web)

## Problema

O sistema não guarda a tentativa "em andamento": ela só é gravada quando o aluno clica em **Enviar**. Se nesse meio-tempo o professor **arquiva, despublica ou exclui** a avaliação:
- o envio falha com o erro genérico **"Avaliacao nao encontrada."**;
- **as respostas do aluno se perdem**.

## Decisão do usuário (2026-11-16)

Caminho do meio, **sem** criar "tentativa em andamento" no banco:
1. **Arquivada ou despublicada depois que o aluno abriu:** o envio **continua sendo aceito**, dentro de uma janela de tempo.
2. **Excluída de verdade** (sem tentativas, apagada do banco): o aluno vê uma **mensagem clara**, e as respostas ficam guardadas no navegador para ele não perder o que escreveu.
3. **Questões alteradas no meio do caminho:** mensagem clara, e as respostas ficam guardadas no navegador.

Descartadas:
- (a) bloquear o professor;
- (b) só melhorar a mensagem.

## O que o agente de arquitetura já verificou (não repetir)

- **Envio:** `Services/AvaliacaoService.cs`, `EnviarRespostasAlunoAsync` (≈ linha 625).
  - Começa com `ObterAvaliacaoPublicadaDoAlunoAsync(avaliacaoId, alunoId)`, que só acha avaliação com status **Publicado**. Arquivada ou despublicada vira `KeyNotFoundException("Avaliacao nao encontrada.")`, o mesmo erro de excluída.
  - Depois vem `ValidarPeriodoAvaliacao(avaliacao)`.
  - As respostas precisam bater exatamente com as questões publicadas: senão, "Responda exatamente uma vez cada questao publicada.".
- **Exclusão:** `ExcluirAvaliacaoAsync` (≈ linha 228) **já arquiva** em vez de apagar quando existe alguma tentativa. Só apaga do banco quando ninguém nunca enviou.
- **Data da mudança:** a entidade tem `AtualizadoEm` e `PublicadoEm`, conforme o `AvaliacaoResponseDto`. Conferir se `Arquivar()` e despublicar atualizam o `AtualizadoEm`. Se não atualizarem, passar a atualizar.
- **Frontend:** o modal de avaliação do aluno fica em `pages/workspace/SecoesAluno.jsx` (≈ linhas 965–985, "Voltar às avaliações").

## Tarefa

### Backend

1. **`IniciadaEm` no envio:** `EnviarAvaliacaoAlunoDto` ganha `DateTime? IniciadaEm`. O frontend envia o momento em que o aluno abriu a avaliação, em UTC.
2. **Aceitar o envio de avaliação que saiu do ar durante a resposta:** em vez de usar só `ObterAvaliacaoPublicadaDoAlunoAsync`, buscar a avaliação do curso do aluno (matrícula ativa) com qualquer status e decidir assim:
   - **Publicada:** segue como hoje.
   - **Arquivada ou despublicada (Rascunho)** → aceitar **somente se** todas as condições forem verdadeiras:
     - `PublicadoEm` não é nulo, ou seja, já esteve publicada;
     - `IniciadaEm` foi informado e é **anterior** ao `AtualizadoEm`, ou seja, o aluno abriu antes da mudança;
     - a mudança foi há pouco tempo: `agora - AtualizadoEm` ≤ **janela de graça** = `TempoLimiteMinutos + 30 min` se houver tempo limite, senão **3 horas**;
     - as questões enviadas batem com as questões gravadas, com a mesma validação de hoje.
   - Fora dessas condições, o erro fica claro e com código (próximo item).
   - Continuam valendo: limite de tentativas, matrícula ativa, curso aberto e período de fechamento (`ValidarPeriodoAvaliacao`).
   - A tentativa aceita assim conta normalmente: nota, progresso e média, como hoje.
3. **Erros com código**, para o frontend saber o que mostrar. Usar o formato de erro que a API já usa, mais um `codigo`:
   - **404 `AVALIACAO_REMOVIDA`:** a avaliação não existe mais, porque foi excluída.
   - **409 `AVALIACAO_INDISPONIVEL`:** foi arquivada ou despublicada e não passou nas regras do item 2 (fora da janela ou sem `IniciadaEm`).
   - **409 `AVALIACAO_ALTERADA`:** as questões enviadas não batem com as atuais, porque o professor mudou a prova.
   - Não mexer nos outros erros, como limite de tentativas e período encerrado.
4. **Segurança:**
   - o aluno só envia para avaliação do curso em que está matriculado e ativo, como hoje;
   - o `IniciadaEm` vem do cliente, por isso a **janela de graça** limita o efeito: nunca abre acesso a avaliação que o aluno não podia ver, nem depois da janela.
   - **Rejeitar** `IniciadaEm` no futuro (com uma folga de alguns minutos) ou anterior ao `PublicadoEm`.

### Frontend (aluno)

5. **Ao abrir a avaliação**, guardar `iniciadaEm = new Date().toISOString()` e enviar junto com as respostas.
6. **Rascunho local das respostas:**
   - enquanto o aluno responde, salvar as respostas em `sessionStorage`, com a chave por aluno + avaliação, sempre dentro de try/catch;
   - **apagar** só quando o envio der certo;
   - se o aluno reabrir a mesma avaliação, ela ainda estiver disponível e houver rascunho, oferecer **"Recuperar respostas salvas"**.
7. **Mensagens por código**, no modal, sem fechar e sem perder o que está na tela:
   - `AVALIACAO_REMOVIDA`: "O professor removeu esta avaliação enquanto você respondia. Suas respostas não puderam ser enviadas e não contam como tentativa."
   - `AVALIACAO_INDISPONIVEL`: "Esta avaliação foi retirada do ar pelo professor e não aceita mais envios. Suas respostas não contam como tentativa."
   - `AVALIACAO_ALTERADA`: "O professor alterou as questões desta avaliação enquanto você respondia. Abra a avaliação de novo para ver a versão atual." Com o botão "Abrir de novo".
   - Os outros erros continuam como hoje.

**Não alterar:**
- as telas e as ações do Professor (ele continua podendo arquivar, despublicar e excluir);
- a regra de excluir que vira arquivar;
- a correção, a nota e o progresso, além de aceitar a tentativa;
- as telas do Admin e do Coordenador.

## Critérios de aceite

Testar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, com duas sessões: aluno e professor.

1. **Arquivar durante a resposta:** o aluno abre um quiz, o professor **arquiva**, e o aluno envia em seguida → **aceito**. A tentativa aparece na revisão e conta no progresso.
2. **Despublicar durante a resposta:** mesmo teste, com resultado aceito.
3. **Fora da janela:** o aluno abre, o professor arquiva e o aluno tenta enviar depois da janela (simular ajustando o tempo no teste) → mensagem `AVALIACAO_INDISPONIVEL`, e o modal continua aberto.
4. **Excluir sem tentativas:** o aluno abre, o professor **exclui** (avaliação sem tentativas) e o aluno envia → mensagem `AVALIACAO_REMOVIDA`. Recarregar a página não apaga o rascunho local enquanto a aba estiver aberta.
5. **Questões alteradas:** o professor muda as questões durante a resposta → `AVALIACAO_ALTERADA` com "Abrir de novo".
6. **Abrir depois de arquivada:** um aluno que abre a avaliação **depois** de ela ser arquivada continua sem acesso, como hoje.
7. **Envio normal:** nada muda, e o rascunho é apagado depois do envio.

**Testes:**
- **Backend:** testes de serviço e de integração para os casos 1 a 6, incluindo `IniciadaEm` ausente, no futuro, anterior ao `PublicadoEm` e fora da janela.
- **Frontend (vitest):** mensagens por código, rascunho salvo e apagado, e "Recuperar respostas salvas".
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
