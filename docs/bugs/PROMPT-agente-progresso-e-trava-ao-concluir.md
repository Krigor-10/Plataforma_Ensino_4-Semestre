# Prompt único: progresso desatualizado + quiz vazio + trava de edição ao concluir o curso (backend + web + mobile)

Este prompt junta duas tarefas que mexem nas mesmas regras de "curso aberto para edição". **Aplique as duas partes na mesma entrega e nesta ordem:**

1. **Parte A, trava ao concluir:** define quando um curso aceita edição.
2. **Parte B, progresso e quiz vazio:** recalcula o progresso só em curso que aceita edição.

**Regra que liga as duas partes:** o recálculo da Parte B **não roda** quando a edição do curso está travada. A edição trava quando o curso está encerrado (`EncerradoEm`), ou concluído pelo professor no Gratuito ou no Acompanhado, como define a Parte A.
- Use **um só** método/regra para "curso aceita edição", por exemplo `CursoAceitaEdicao(curso)`. A trava (`GarantirCursoAbertoParaEdicaoAsync`) e o recálculo usam esse mesmo método.
- **Exceção:** a migração de dados da Parte B, que recalcula uma vez o progresso de todo mundo, roda em todo curso **não encerrado**, inclusive no concluído e aguardando. É só uma correção do que já estava errado.

Decisões do usuário em 2026-11-16, todas já tomadas e sem perguntas em aberto.

---

## Parte A — Travar a edição quando o professor conclui + "Devolver ao professor"

### Problema

Ciclo de hoje (Gratuito e Acompanhado):
1. **O professor conclui:** `CursoService.ConcluirCursoComoProfessorAsync` preenche `ConcluidoPeloProfessorEm`. O curso fica "Aguardando encerramento" e o coordenador recebe um aviso.
2. **O coordenador encerra:** `EncerrarCursoAsync` preenche `EncerradoEm`.
   - A edição de conteúdo, avaliação e módulo trava (`GarantirCursoAbertoParaEdicaoAsync`, chamado em 18 pontos dos services).
   - No Acompanhado, os certificados são emitidos nesse momento.
3. **O coordenador reabre:** `ReabrirCursoAsync` apaga **só** o `EncerradoEm`.

**O buraco:** entre o 1 e o 2, o professor continua podendo publicar e alterar tudo. O coordenador revisa uma versão e encerra outra. Também não existe como desfazer a conclusão: depois de reabrir, o curso fica "Aguardando encerramento" para sempre e o "Concluir curso" recusa ("ja foi marcado como concluido").

### Decisão do usuário (2026-11-16): "Travar + devolver"

1. **A edição trava assim que o professor conclui**, do mesmo jeito que trava no encerramento.
2. O coordenador ganha **"Devolver ao professor"**. Esse botão desfaz a conclusão, destrava a edição e avisa o professor.
3. **Reabrir um curso encerrado também devolve.** O curso volta para "Em andamento", o professor edita e conclui de novo quando terminar, e o coordenador recebe o aviso outra vez.

### Cuidado com o pacote que veio do Gratuito (verificado pelo agente de arquitetura)

No pacote pago, o `ConcluidoPeloProfessorEm` é o **sinal de que o curso veio do fluxo Gratuito → pacote**. Ele é usado em:
- `EncerrarCursoAsync` (≈ linha 263);
- `PublicarParaVendaAsync` (≈ linha 409: "Encerre o curso antes de publica-lo para venda");
- `PainelCursoGestao.jsx` (≈ linha 331, `temCicloDeEncerramento`).

`ConcluirCursoComoProfessorAsync` não aceita pacote. Se o `ConcluidoPeloProfessorEm` de um pacote for apagado, ele nunca mais pode ser concluído, e o pacote passa a poder ir à venda sem estar encerrado.

**Regra para não quebrar isso:**
- **Gratuito e Acompanhado:**
  - "concluído pelo professor" (`ConcluidoPeloProfessorEm` preenchido) trava a edição;
  - devolver e reabrir **apagam** `ConcluidoPeloProfessorEm` e `ConcluidoPeloProfessorId`, e reabrir também apaga o `EncerradoEm`.
- **Pacote pago:**
  - a trava por conclusão **não se aplica**, e só o `EncerradoEm` trava, como hoje;
  - reabrir continua apagando só o `EncerradoEm`;
  - não tem "Devolver ao professor".

### Tarefa

#### Backend

1. **Trava de edição:** em `GarantirCursoAbertoParaEdicaoAsync`, além de `EncerradoEm`, bloquear quando `ConcluidoPeloProfessorEm` estiver preenchido **e** o modelo for Gratuito ou Acompanhado.
   - Mensagem: "Este curso foi concluido pelo professor e esta aguardando o encerramento. Para alterar, peca ao coordenador para devolver o curso."
   - Vale para todos os perfis, como a trava do encerramento.
2. **`DevolverAoProfessorAsync(cursoId, coordenadorId, motivo?)`**, com rota `POST /Cursos/{id}/devolver-ao-professor` e corpo opcional `{ motivo }` (até 500 caracteres):
   - só o coordenador responsável pelo curso pode usar, como acontece em encerrar e reabrir;
   - só funciona em Gratuito ou Acompanhado **concluído e não encerrado**. Fora disso, devolve um erro claro;
   - apaga `ConcluidoPeloProfessorEm` e `ConcluidoPeloProfessorId`, com um método novo no `Curso`, por exemplo `DesfazerConclusao()`;
   - notifica os professores do curso: título "Curso devolvido para ajustes", texto com o nome do curso e o motivo quando houver, link para o curso.
3. **Reabrir:** em `ReabrirCursoAsync`, para Gratuito e Acompanhado, também desfazer a conclusão e notificar os professores ("Curso reaberto para ajustes"). Pacote continua como hoje.
   - Certificados já emitidos **não mudam**.
4. **`ConcluirCursoComoProfessorAsync`** continua igual. Depois de devolver ou reabrir, o professor consegue concluir de novo, porque a conclusão foi apagada, e o coordenador recebe o aviso outra vez.

#### Frontend web

5. **Coordenador** (`PainelCursoGestao.jsx`, com status "Aguardando encerramento"):
   - botão **"Devolver ao professor"** ao lado de "Encerrar curso", com aparência secundária;
   - um diálogo de confirmação com o campo "Motivo (opcional)", no mesmo padrão da confirmação de encerrar e reabrir;
   - depois de devolver, o status vira "Em andamento".
6. **Reabrir:** o texto da confirmação passa a explicar que o curso volta ao professor para ajustes e que ele precisa concluir de novo.
7. **Professor** (`SecaoConteudosProfessor.jsx`, `SecaoAvaliacoesProfessor.jsx` e as telas de módulo):
   - quando o curso estiver concluído e aguardando, ou encerrado, mostrar uma faixa no topo, por exemplo: "Curso concluído — aguardando o encerramento pelo coordenador. A edição está travada.", ou "Curso encerrado. A edição está travada.";
   - **desativar** os botões de criar, editar, publicar e excluir, em vez de deixar o professor clicar e receber o erro do backend;
   - o "Concluir curso" some enquanto o curso estiver concluído.
   - Hoje essas telas nem tratam o encerramento direito: aproveitar e usar a mesma faixa para os dois casos.

**Não alterar:**
- a emissão de certificados do Acompanhado no encerramento;
- o fluxo de venda do pacote;
- a recusa de reabrir pacote à venda;
- as matrículas;
- o cálculo de progresso **nesta parte**. Ele é a Parte B deste prompt.

### Critérios de aceite

Testar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, com professor, coordenador e admin, num curso **Gratuito** e num **Acompanhado**.

1. **O professor conclui:**
   - a tela dele mostra a faixa e os botões de edição ficam desativados;
   - uma chamada direta à API para publicar ou editar conteúdo, avaliação ou módulo é recusada com a mensagem nova.
2. **O coordenador devolve com motivo:**
   - o professor recebe a notificação com o motivo;
   - o status volta para "Em andamento", a edição volta a funcionar e o "Concluir curso" reaparece.
3. **O professor conclui de novo:** o coordenador recebe o aviso outra vez e consegue encerrar.
4. **Reabrir um curso encerrado:**
   - o status vai para "Em andamento", não "Aguardando encerramento", e o professor pode editar e concluir de novo;
   - os certificados já emitidos continuam lá.
5. **Pacote vindo do Gratuito:**
   - reabrir, fora da venda, continua deixando editar como hoje;
   - encerrar de novo funciona;
   - "Colocar à venda" continua exigindo que o curso esteja encerrado;
   - não aparece "Devolver ao professor".
6. **Pacote criado direto:** nada muda.
7. **Permissões:**
   - um coordenador que não é o responsável não consegue devolver;
   - devolver um curso não concluído ou encerrado dá erro claro.

**Testes:**
- **Backend:**
  - trava por conclusão (Gratuito e Acompanhado sim, pacote não);
  - devolver: permissões, estados inválidos e notificação;
  - reabrir apaga a conclusão (só Gratuito e Acompanhado);
  - pacote vindo do Gratuito sem regressão em encerrar, publicar para venda e reabrir.
- **Web (vitest):** botão e diálogo de devolver, faixa e botões desativados para o professor.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.

---

## Parte B — Progresso fica em 100% mesmo com item novo, e quiz sem questões publicado

### Problema relatado pelo usuário (print do app mobile, 2026-11-16)

Aluno no curso **Desenvolvimento Web Full Stack**:
- o topo da trilha mostra **100%**;
- abaixo aparece o módulo **"Fundamentos de HTML e CSS"** como **"Em andamento"**, com o quiz **"teste conteudo · Quiz · 0 questões · sem nota"** e um cadeado.

### Causas (verificadas pelo agente de arquitetura, não repetir)

São quatro falhas que se somam.

#### 1. O progresso gravado não acompanha o que o professor publica

- `ProgressoCursoAluno` e `ProgressoModuloAluno` são gravados por `ProgressoAlunoService.RecalcularCursoAsync` e `RecalcularModuloAsync`.
- Esse recálculo **só roda quando o aluno age**:
  - concluir conteúdo (`ProgressoAlunoService.cs` ≈ linha 118);
  - enviar quiz (`RecalcularProgressoQuizAsync`, chamado em `AvaliacaoService.cs` ≈ linha 752).
- Quando o professor publica, despublica, arquiva ou exclui um conteúdo, quiz ou módulo, ou muda o peso, **nada é recalculado**.
- No banco local, a matrícula 1 tem `PercentualConclusao = 100`, com `AtualizadoEm` de 2026-11-04. O curso ganhou quizzes publicados em 2026-11-06.
- **Efeito grave:** o certificado do pacote e do Gratuito é pedido pelo aluno e confere `progresso.PercentualConclusao < 100` (`CertificadoService.cs` ≈ linha 175). Com o progresso desatualizado, o aluno consegue emitir o certificado sem ter feito o item novo.
  - Provas e exercícios novos já são conferidos na hora. Só conteúdo e quiz dependem do valor gravado.

#### 2. Existem quizzes publicados sem nenhuma questão

Consulta no banco local, com avaliação `StatusPublicacao = Publicado` e sem `QuestoesPublicadas`:

| Id | Título | Módulo |
|---|---|---|
| 2016 | Quiz Round 2 - teste popup | 1 |
| 8043 | Quiz - teste conteudo PDF | 1 |
| 8044 | teste conteudo | 14 (Fundamentos de HTML e CSS) |
| 8046 | teste conteudo quiz | 1 |

Brechas no backend:
- `AtualizarAvaliacaoAsync` (≈ linha 214) bloqueia publicar sem questões, mas **`CriarAvaliacaoAsync` aceita criar já como Publicado** (o comentário diz que isso foi deixado de propósito por causa dos testes).
- **`ExcluirQuestaoAsync` (≈ linha 613) remove a última questão de uma avaliação publicada** sem reclamar.
- Os ids 8043, 8044 e 8046 foram publicados com poucos segundos de diferença (2026-11-06 04:20:41 a 04:21:02). Provavelmente vieram de algum fluxo de "conteúdo + quiz" que cria o quiz publicado antes de ter questões.
  - **Descobrir qual fluxo foi e fechar a brecha nele.**

Consequência: no mobile, `obterDisponibilidadeAvaliacao` (`mobile/src/lib/avaliacoes.js` linha 14) devolve "Sem questões". A linha mostra o cadeado para sempre. Se o progresso for recalculado, esse quiz impede o aluno de chegar a 100%.

#### 3. Módulo que só tem quiz aparece sempre "Em andamento"

- **Mobile:** em `mobile/src/screens/aluno/ConteudosScreen.jsx` (≈ linhas 444–445 e 479) e `ProgressoScreen.jsx` (≈ linhas 189–190):
  - `moduloConcluido = totalConteudos > 0 && modulo.concluido`;
  - a barra só aparece com `totalConteudos > 0`.
  - Um módulo só com quiz nunca fica "Concluído" e não mostra barra, mesmo que o backend diga 100%.
- **Web:** `pages/workspace/SecoesAluno.jsx` ≈ linha 373 (`DetalheProgressoCurso`) filtra `modulo.conteudos.length > 0`. O módulo só com quiz **some** da tela de progresso e não entra em "Módulos concluídos".
  - A tela de Conteúdos web (≈ linha 1962) já considera `quizzes`, e é ela que deve ser seguida.
- **Backend:** `RecalcularCursoAsync` conta `TotalModulos` e `ModulosConcluidos` só pelos módulos que têm conteúdo.

### Decisões do usuário (2026-11-16)

1. **Recalcular o progresso em todo curso aberto**, em qualquer modelo (Gratuito, Acompanhado, pacote pago e curso reaberto), sempre que o professor mudar algo que entra no progresso.
   - Quem já tinha 100% pode cair, por exemplo para 90%, e o item novo aparece como pendente.
2. **O certificado já emitido continua valendo.** Nunca apagar `CertificadoEmitidoEm` nem esconder o certificado de quem já emitiu.
3. **Curso que não aceita edição (encerrado, ou concluído e travado pela Parte A) não é recalculado.** Ele já não aceita alterações (`GarantirCursoAbertoParaEdicaoAsync`), e o histórico dele fica congelado.

### Tarefa

#### Backend

1. **Recalcular quando o professor muda algo.** Criar em `ProgressoAlunoService` um método, por exemplo `RecalcularProgressoDoCursoAsync(int cursoId)`, que:
   - recalcula todos os módulos e o curso de **todas as matrículas aprovadas** do curso;
   - reaproveita `RecalcularModuloAsync` e `RecalcularCursoAsync`;
   - **não faz nada** se o curso não aceitar edição, ou seja, se estiver encerrado ou concluído e travado, pela regra única da Parte A.

   Chamar o método depois de salvar, com sucesso, em todo caminho que muda o que entra no progresso:
   - conteúdo didático: criar já publicado, mudar status, peso ou módulo, e excluir (`ConteudoDidaticoService`);
   - quiz: criar já publicado, mudar status, peso ou módulo, e excluir ou arquivar (`AvaliacaoService`);
   - módulo: excluir (`ModuloService.ExcluirModuloAsync`);
   - qualquer outro caminho de publicação em lote que o agente encontrar.

   Não precisa chamar ao adicionar, editar ou reordenar questões, porque isso não muda o peso.
2. **Não publicar avaliação vazia:**
   - `CriarAvaliacaoAsync`: recusar status Publicado sem questões, com a mesma mensagem do update. Ajustar os testes que criavam a avaliação já publicada, por exemplo com um helper que cria e adiciona questão.
   - `ExcluirQuestaoAsync`: recusar a remoção da **última** questão de uma avaliação publicada, com a mensagem "Esta é a última questão de uma avaliação publicada. Despublique a avaliação antes de removê-la."
   - Fechar a brecha no fluxo que criou os quizzes da tabela acima.
3. **Defesa para dados antigos:** avaliação publicada **sem questões** é tratada como se não estivesse publicada para o aluno:
   - não entra no peso do progresso (`ObterQuizzesDoModuloAsync`, `ObterQuizzesDoCursoAsync` e a liberação de avaliações);
   - não aparece nas listas do aluno (`ListarAvaliacoesPorAlunoAsync` e o que alimenta a trilha);
   - não vira pendência de certificado (a consulta `existeAvaliacaoPendente` e `possuiAvaliacaoFormalPublicada` em `CertificadoService`).
4. **Contagem de módulos:** em `RecalcularCursoAsync`, o módulo conta quando tem pelo menos um conteúdo publicado **ou** um quiz publicado com questões. "Concluído" quer dizer módulo com 100%, e não só os conteúdos.
5. **Corrigir os dados existentes:**
   - migração de dados: avaliações publicadas sem questões voltam para Rascunho, pelo mesmo efeito de `VoltarParaRascunho`;
   - depois disso, recalcular uma vez o progresso de todas as matrículas aprovadas dos cursos **não encerrados**, para corrigir quem está com 100% desatualizado.
   - Usar o mecanismo de inicialização ou seed que o projeto já tem. O recálculo é idempotente, então rodar mais de uma vez não causa problema.

#### Frontend web (aluno)

6. Em `DetalheProgressoCurso` (`SecoesAluno.jsx` ≈ linha 373), considerar o módulo que tem conteúdo **ou** quiz, como a tela de Conteúdos já faz:
   - "Módulos concluídos" e o status do módulo vêm de `modulo.progresso`, que vem do backend;
   - a contagem de itens já soma as avaliações.

#### Mobile (aluno)

7. Em `ConteudosScreen.jsx` e `ProgressoScreen.jsx`:
   - o pill ("✓ Concluído" ou "Em andamento") e a barra "Progresso da trilha" usam `modulo.concluido` e `modulo.progresso` do backend quando o módulo tem **qualquer item**, seja conteúdo ou quiz;
   - o `accessibilityLabel` da barra conta os itens, e não só os conteúdos.

**Não alterar:**
- a regra de liberação "Conclua o módulo anterior";
- o certificado do Acompanhado, que continua sendo emitido no encerramento;
- as regras de nota e de prova;
- as telas do professor, além das mensagens novas de recusa;
- o comportamento de curso encerrado.

### Critérios de aceite

Testar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000) e no mobile, **sem modo demo**.

1. **O print do usuário:** depois da migração, o aluno da matrícula 1 em "Desenvolvimento Web Full Stack":
   - não vê mais o quiz vazio "teste conteudo";
   - vê a porcentagem real do curso, que pode continuar 100% se o único item pendente era um quiz vazio.
   - Conferir no banco que `PercentualConclusao` bate com os itens publicados.
2. **Item novo em curso aberto:** um aluno com 100% e sem certificado → o professor publica um quiz com questões → a porcentagem do aluno cai na hora, sem ele fazer nada, e o certificado mostra a pendência "O curso ainda nao foi concluido.". O aluno faz o quiz → volta a 100% → consegue emitir.
3. **Certificado já emitido:** o aluno com certificado emitido continua vendo e baixando o certificado depois que a porcentagem cai.
4. **Despublicar e excluir:** o professor despublica ou exclui o único item pendente → o aluno volta a 100% sem fazer nada.
5. **Curso encerrado:** nada é recalculado, e a edição continua bloqueada como hoje.
6. **Quiz vazio:**
   - criar um quiz já publicado sem questões é recusado;
   - remover a última questão de um quiz publicado é recusado com a mensagem nova;
   - publicar depois de adicionar uma questão funciona.
7. **Módulo só com quiz:**
   - no mobile (Conteúdos e Progresso), o módulo mostra a barra e fica "✓ Concluído" quando o quiz é feito;
   - na web, ele aparece na tela de progresso e entra em "Módulos concluídos".

**Testes:**
- **Backend:**
  - recálculo disparado por publicar, despublicar e excluir conteúdo e quiz, e por excluir módulo;
  - curso encerrado sem recálculo;
  - certificado emitido preservado;
  - avaliação vazia recusada na criação e na exclusão da última questão;
  - avaliação vazia antiga ignorada no progresso, nas listas e nas pendências de certificado;
  - contagem de módulos só com quiz.
- **Web (vitest) e mobile:** módulo só com quiz com pill e barra corretos.
- `dotnet test`, `npm run lint` e `npm test` (web e mobile) sem erros novos.

---

## Verificação final (as duas partes juntas)

1. **Curso Gratuito concluído pelo professor e aguardando:**
   - o professor não consegue publicar quiz novo;
   - o progresso dos alunos não muda;
   - o coordenador devolve, o professor publica um quiz com questões e o progresso de quem tinha 100% cai;
   - o professor conclui de novo e a edição trava outra vez.
2. **Pacote à venda (o curso do print, "Desenvolvimento Web Full Stack"):** a edição continua liberada, como hoje, e publicar um item novo recalcula o progresso.
3. `dotnet test`, `npm run lint` e `npm test` (web e mobile) sem erros novos.
