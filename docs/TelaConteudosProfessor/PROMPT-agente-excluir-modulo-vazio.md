# Prompt: excluir módulo vazio (o progresso de 0% não bloqueia) + mensagem dizendo o que prende o módulo

## Pedido do usuário (2026-11-25)

O usuário tentou excluir o **"Módulo 3"**, vazio ("Vazio · não aparece para o aluno"), no curso "Desenvolvimento Web". Apareceu "Não é possível excluir o módulo porque ele já possui dependências acadêmicas."
- O Módulo 1 do mesmo curso tem conteúdos, quizzes e progresso. **Isso não interfere**: a checagem é só do próprio módulo.
- A tela mostra **"Ver arquivados (1)"**.

**Pedido:** "Daria para, nesses casos de módulo vazio, ser excluído?" O usuário confirmou **"Sim, escreva"**.

## Causa (verificada pelo agente de arquitetura)

- **`Services/ModuloService.cs` → `ExcluirModuloAsync`** (≈ linha 99):
  - chama `GarantirCursoAbertoParaEdicaoAsync`;
  - se `PossuiDependenciasAsync(id)` → lança a mensagem genérica;
  - senão, apaga o módulo e chama `RecalcularProgressoDoCursoAsync`.
- **`Repositories/ModuloRepository.cs` → `PossuiDependenciasAsync`** (≈ linha 59) devolve `true` se houver, **com o `ModuloId` do módulo**:
  1. `ConteudosDidaticos` (qualquer status, **inclusive arquivado**);
  2. `Avaliacoes` (quiz, prova ou exercício, qualquer status, **inclusive arquivado**);
  3. `LancamentosNotasAlunos`;
  4. `ProgressosConteudosAlunos`;
  5. **`ProgressosModulosAlunos`**.
- **O item 5 prende módulos vazios:** o recálculo de progresso do curso cria um `ProgressoModuloAluno` (0%) para cada matrícula em **cada** módulo, mesmo sem nada dentro. Num curso com alunos, todo módulo novo já "tem dependência".
- **O item arquivado** ("Ver arquivados (1)") também prende, se for do módulo. A tela mostra "Vazio" porque não conta os arquivados.
- **Banco:** `Data/Configurations/ProgressoConfiguration.cs` ≈ linhas 50–53, `ProgressoModuloAluno → Modulo` com **`DeleteBehavior.Restrict`**. É preciso apagar o progresso do módulo **antes** do módulo, na mesma transação.
- **Web:** `frontend/src/components/ModaisModulo.jsx` ≈ linhas 34–53, janela "Excluir modulo":
  - mostra o erro em `InlineMessage`, mas **continua com o botão "Confirmar exclusao" ativo**;
  - os textos estão sem acento ("modulo", "acao", "nao").

## Regra nova

**Um módulo pode ser excluído quando NÃO tem:**
- conteúdo (publicado, rascunho ou **arquivado**);
- avaliação ou quiz (publicado, rascunho ou **arquivado**);
- nota lançada;
- progresso de aluno em conteúdo.

**O `ProgressoModuloAluno` do próprio módulo NÃO bloqueia.** Ele é apagado junto, porque sem conteúdo ou quiz ele é só o 0% automático.

> **Defesa:** se, por algum dado antigo, existir `ProgressoModuloAluno` do módulo com percentual > 0 ou status concluído, **bloquear**, com a mensagem "Há progresso de alunos registrado neste módulo." Não deveria acontecer num módulo sem conteúdo nem quiz, mas não apagar histórico real.

## Tarefa

### 1. Backend

- **`ModuloRepository`:** trocar (ou complementar) `PossuiDependenciasAsync` por um método que diga **o que** prende o módulo. Por exemplo, `ObterBloqueiosExclusaoAsync(moduloId)`, devolvendo contagens:
  - conteúdos **ativos** (publicado + rascunho) e conteúdos **arquivados**;
  - avaliações/quizzes **ativos** e **arquivados**;
  - notas lançadas;
  - progressos de conteúdo;
  - progressos de módulo **com avanço** (> 0% ou concluído).
  - **Não** contar os progressos de módulo em 0%.
- **`ModuloService.ExcluirModuloAsync`:**
  - mantém `GarantirCursoAbertoParaEdicaoAsync`, porque o curso travado continua bloqueando;
  - com algum bloqueio, lança `InvalidOperationException` com uma **mensagem específica** que junta os motivos, por exemplo:
    - "Não é possível excluir: o módulo tem 1 quiz arquivado. Exclua ou restaure o item em 'Ver arquivados' antes."
    - "Não é possível excluir: o módulo tem 2 conteúdos e 1 quiz."
    - "Não é possível excluir: já existem notas lançadas neste módulo."
  - sem bloqueio, **na mesma transação**:
    1. apaga os `ProgressosModulosAlunos` do módulo;
    2. apaga o módulo;
    3. `SaveChanges`.
    - Depois, `RecalcularProgressoDoCursoAsync`, como hoje.
  - A transação pode ser feita com `Database.BeginTransactionAsync` ou com um único `SaveChanges`, respeitando a ordem por causa do `Restrict`.
- **Rota de pré-checagem (opcional, recomendada):** `GET /Modulos/{id}/bloqueios-exclusao` devolve `{ podeExcluir, motivos: [...] }`, para a janela já abrir sabendo. As permissões são as mesmas do `DELETE`.
  - Se preferir não criar a rota, a janela tenta e mostra o motivo que vier no erro. Nesse caso, ver o item 2.
- **Numeração dos módulos:** ao excluir, os módulos seguintes continuam com a ordem que já têm. Se a numeração exibida for por posição (índice), ela se ajusta sozinha. **Não** reordenar no banco.

### 2. Web — janela "Excluir módulo" (`ModaisModulo.jsx`)

- **Textos com acento:**
  - título "Excluir módulo";
  - corpo "Deseja excluir o módulo **{título}**? Esta ação não pode ser desfeita.";
  - botões "Cancelar" e "Confirmar exclusão".
- **Bloqueio** (vindo da pré-checagem ao abrir, ou do erro ao confirmar):
  - mostrar o motivo específico em `InlineMessage` de aviso (não de erro grave);
  - **esconder** o "Confirmar exclusão" e deixar só "Fechar";
  - se o motivo for item arquivado, mostrar o link **"Ver arquivados"**, que abre a lista de arquivados que já existe.
- **Sem bloqueio:** a janela fica como hoje e, ao confirmar, o módulo some da lista, com o toast "Módulo excluído."

**Não alterar:**
- quem pode excluir módulo (permissões atuais);
- a trava de curso concluído, publicado ou encerrado;
- a exclusão ou arquivamento de conteúdos e quizzes;
- o recálculo de progresso (só é chamado como hoje).

## Testes

### xUnit (backend)

- **Módulo vazio:** num curso com 2 alunos matriculados, que já têm `ProgressoModuloAluno` em 0% nele → **exclui**. Os progressos do módulo são apagados e o recálculo do curso roda.
- **Bloqueios:**
  - módulo com 1 quiz **arquivado** → bloqueia, com a mensagem citando "arquivado";
  - módulo com conteúdo em rascunho → bloqueia;
  - módulo com nota lançada → bloqueia;
  - módulo com `ProgressoModuloAluno` > 0% (dado antigo) → bloqueia, com a mensagem de progresso.
- **Curso travado:** com o curso concluído, publicado ou encerrado, continua bloqueado pela trava de edição, com a mensagem atual.
- **Outros módulos:** excluir o Módulo 3 não altera os conteúdos, quizzes nem o progresso do Módulo 1.

### Vitest (web)

- **Com bloqueio:** a janela mostra o motivo, esconde "Confirmar exclusão" e mostra o link "Ver arquivados" quando o motivo é um item arquivado.
- **Sem bloqueio:** "Confirmar exclusão" chama o `DELETE` e fecha a janela.
- **Textos:** aparecem com acento.

## Critérios de aceite

Verificar no app real, no curso "Desenvolvimento Web":

1. **Módulo 3:** excluir o "Módulo 3", vazio.
   - Se o item arquivado **não** for dele, o módulo é excluído, a lista fica com Módulo 1 e Módulo 2, e o Módulo 1 continua igual.
   - Se o item arquivado **for** dele, a janela diz "o módulo tem 1 … arquivado", sem o botão de confirmar e com o link "Ver arquivados". Depois de excluir o item arquivado, o módulo pode ser excluído.
2. **Módulo com material:** tentar excluir o "Módulo 1" mostra "o módulo tem 3 conteúdos e 2 quizzes", sem o botão de confirmar.
3. **Aluno:** o aluno matriculado continua com o progresso do curso correto depois da exclusão.
4. **Testes:** `dotnet test` e `npm test` (web) sem falhas novas.
