# Revisão dos diagramas de sequência: telas, controllers e entidades × fluxo real

Data: 2026-10-26. Comparado com o código do commit `8284283`, o frontend web (`frontend/src`) e o backend.
O app mobile e o app desktop não entraram nesta revisão: os diagramas mostram o fluxo do site.

Legenda: ✅ bate com o código · ⚠️ existe, mas o fluxo real é diferente do desenho · ❌ não existe no código com esse nome

---

## 1. Telas (boundary)

| Diagrama | Tela no diagrama | Tela real (componente) | Situação |
|---|---|---|---|
| Login | TelaLogin | `LoginScreen` (pages/LoginScreen.jsx) | ⚠️ ver 1.1 |
| Cadastro de Aluno | TelaCadastroAluno | `CadastroScreen` (pages/CadastroScreen.jsx) | ✅ |
| Matrícula | TelaMatricula | `VistaAlunoMatriculas`, menu "Matrículas" (workspace/SecaoMatriculas.jsx) | ✅ |
| Confirmação de Pagamento | TelaPagamentos | `SecaoMeusCursosMatriculados`, tela "Meus Cursos" (workspace/SecaoMatriculas.jsx) | ⚠️ ver 1.2 |
| Acesso aos Conteúdos | TelaConteudos | `SecaoConteudosAluno` (workspace/SecoesAluno.jsx) | ⚠️ ver 1.2 e 1.3 |
| Avaliação | TelaAvaliacao | `SecaoAvaliacoesAluno` + hook `useExecucaoAvaliacao` (workspace/SecoesAluno.jsx) | ✅ |
| Geração de Questões com IA | TelaGeracaoQuestoes | `AssistenteGeracaoIA` (workspace/AssistenteGeracaoIA.jsx) | ⚠️ ver 1.4 |
| Emissão de Certificado | TelaCertificado | `SecaoCertificados` (workspace/SecaoCertificados.jsx) | ✅ |
| Emissão de Certificado | TelaVerificacaoCertificado | `VerificarCertificadoScreen` (pages/VerificarCertificadoScreen.jsx) | ✅ |

Todas as 9 telas existem e cada uma corresponde a um componente diferente. As chamadas feitas por TelaMatricula, TelaAvaliacao, TelaCertificado, TelaVerificacaoCertificado e TelaCadastroAluno são as mesmas que o código faz, na mesma ordem.

### 1.1 Login: quem grava a sessão não é a tela de login
No diagrama, a TelaLogin chama `onSessionStart` nela mesma e depois abre o painel (`exibirDashboard`).
No código, `onSessionStart` é a função `handleSessionStart` do `App.jsx`. É ela que grava a sessão no navegador e manda para `/app`. Ao abrir, o painel (`WorkspaceScreen`) carrega os dados do usuário.
A Definition da TelaLogin já cita isso. Para o desenho ficar fiel, a seta `onSessionStart` deveria ir para uma lifeline `App`. Isso é opcional.

### 1.2 Pagamentos e Conteúdos: a lista não é buscada pela tela
Nos dois diagramas, a primeira chamada ao servidor sai da tela quando o aluno a abre:
- `ListarMeusPagamentos`, em TelaPagamentos.
- `ListarConteudosDoAluno`, em TelaConteudos.

No código, nenhuma das duas telas faz essas chamadas. Quando o aluno entra no sistema, o painel (`WorkspaceScreen` → `loadWorkspaceSnapshot`, em lib/dashboard.js) busca tudo de uma vez:
- cursos, turmas, matrículas, módulos, conteúdos, avaliações, progresso e pagamentos (8 chamadas em paralelo);
- as telas só mostram o que já foi carregado.

Depois de uma ação, as telas também não usam a resposta do servidor. Elas chamam `onRefresh`, que refaz as 8 chamadas:
- isso vale para `confirmarPagamento` e `marcarConteudoConcluido`;
- vale também para a matrícula.

**Situação:** as Definitions já avisam isso, mas o desenho mostra outra origem para a chamada. Para corrigir, a seta GET deveria sair de uma lifeline do painel (`painel : WorkspaceScreen`) antes de o aluno abrir a tela.

### 1.3 Conteúdos: o progresso exibido vem do recarregamento
A última seta (`exibirProgressoAtualizado`) sugere que a tela mostra o progresso devolvido pelo servidor.
No código, `marcarConteudoConcluido` ignora o retorno do servidor (`ProgressoAlunoSnapshotDto`). Ela marca o conteúdo como concluído na própria tela e chama `onRefresh`, e é desse recarregamento que vem o progresso novo.

### 1.4 Geração com IA: a tela faz mais chamadas do que o desenho mostra
O fluxo real do `AssistenteGeracaoIA` é este:
1. Se a avaliação ainda não existe, a tela cria antes uma avaliação em rascunho com `POST /Avaliacoes` (`AvaliacoesController.CriarAvaliacao`). **Não está desenhado**, só citado na Definition.
2. Gera as questões. Existem **dois caminhos**:
   - por arquivo: `POST {id}/ia/gerar-questoes` (`GerarQuestoesComIa`). É o único desenhado.
   - a partir de um conteúdo já publicado, no modo quiz: `POST {id}/ia/gerar-questoes-de-conteudo` (`GerarQuestoesComIaDeConteudo`). **Não aparece no diagrama.**
3. Confirma as questões com `POST {id}/questoes/lote` (`AdicionarQuestoesEmLote`). Está desenhado.
4. Ajusta a nota máxima pela soma dos pontos com `PUT /Avaliacoes/{id}` (`AtualizarAvaliacao`). **Não está desenhado**, só citado na Definition da seta 27.

---

## 2. Controllers

As 13 ações usadas nos diagramas existem e conferem nos três pontos:
- o nome da action;
- a rota;
- o service que cada uma chama.

| Diagrama | Controller.Action | Rota | Chama | Situação |
|---|---|---|---|---|
| Login | AuthController.Login | POST auth/login | IAuthService.LoginAsync | ✅ |
| Cadastro | AlunosController.CadastroCompleto | POST alunos/cadastro-completo | IAlunoService.CadastrarAlunoCompletoAsync | ✅ |
| Matrícula | MatriculasController.PostMatricula | POST matriculas | IMatriculaService.MatricularComAprovacaoAutomaticaAsync | ✅ |
| Pagamento | PagamentosController.ListarMeusPagamentos | GET pagamentos/aluno | IPagamentoService.ListarPagamentosDoAlunoAsync | ✅ (mas quem chama é o painel, ver 1.2) |
| Pagamento | PagamentosController.ConfirmarPagamento | POST pagamentos/{matriculaId}/confirmar | IPagamentoService.ConfirmarPagamentoAsync | ✅ |
| Conteúdos | ConteudosDidaticosController.ListarConteudosDoAluno | GET conteudosdidaticos/aluno/{alunoId} | IConteudoDidaticoService.ListarConteudosPorAlunoAsync | ✅ (mas quem chama é o painel, ver 1.2) |
| Conteúdos | ProgressosController.MarcarConteudoConcluido | PUT progressos/conteudos/{conteudoId}/concluir | IProgressoAlunoService.MarcarConteudoConcluidoAsync | ✅ |
| Avaliação | AvaliacoesController.ListarQuestoesDoAluno | GET avaliacoes/{id}/aluno/questoes | IAvaliacaoService.ListarQuestoesPorAlunoAsync | ✅ |
| Avaliação | AvaliacoesController.EnviarRespostasDoAluno | POST avaliacoes/{id}/aluno/respostas | IAvaliacaoService.EnviarRespostasAlunoAsync | ✅ |
| IA | AvaliacoesController.GerarQuestoesComIa | POST avaliacoes/{id}/ia/gerar-questoes | IAvaliacaoService.GerarQuestoesComIaAsync | ✅ |
| IA | AvaliacoesController.AdicionarQuestoesEmLote | POST avaliacoes/{id}/questoes/lote | IAvaliacaoService.AdicionarQuestoesEmLoteAsync | ✅ |
| Certificado | CertificadosController.Emitir | POST certificados/matricula/{matriculaId}/emitir | ICertificadoService.EmitirCertificadoAsync | ✅ |
| Certificado | CertificadosController.Verificar | GET certificados/verificar/{codigo} | ICertificadoService.ObterCertificadoPorCodigoAsync | ✅ |

**Sobre as interfaces C# (pasta `Interfaces/`):** os controllers recebem as interfaces, e não as classes. Por exemplo, o `AuthController` recebe `IAuthService`, e o `Program.cs` liga cada interface à sua classe.

Os diagramas mostram a classe concreta (`AuthService`), que é o objeto que roda de fato. Para o UML isso está correto. Só há problema em dois casos em que a classe muda conforme o ambiente:

| Lifeline no diagrama | No código | Situação |
|---|---|---|
| ArmazenamentoArquivoService (IA) | Não existe classe com esse nome. Existe a interface `IArmazenamentoArquivoService`, ligada a `ArmazenamentoArquivoLocalService` (local) ou `ArmazenamentoArquivoBlobService` (Azure), as duas baseadas em `ArmazenamentoArquivoServiceBase`. | ❌ renomear para `IArmazenamentoArquivoService` |
| GeminiAvaliacaoIAService + GeminiAPI (IA) | Vale só com `IA:Provedor = "Gemini"`, que é o caso do appsettings.Development.json. O padrão (produção/Azure) é `AvaliacaoIAService`, que chama a API da Anthropic. As duas implementam `IAvaliacaoIAService`. | ⚠️ já avisado na Definition; pode ficar |

As demais lifelines existem com o mesmo nome no código:
- `MatriculaRepository`, `ConteudoDidaticoRepository`, `UsuarioValidacao` (classe estática em Common/), `CursoService`, `AcessoAcademicoService`, `NotificacaoService`;
- `ExtratorTextoMaterialService`, `ValidadorQuestaoIaService`, `PlataformaContext`.

---

## 3. Entidades

Nenhum dos 8 diagramas tem lifeline de entidade (Usuario, Matricula, Pagamento etc.). O acesso a elas aparece como seta para o `PlataformaContext`, com a entidade só no tipo de retorno.

Por isso, os métodos que pertencem à entidade estão desenhados como chamada do service para ele mesmo:

| Método | Pertence à entidade |
|---|---|
| `ConfigurarAcesso` | `Usuario` |
| `RegistrarSolicitacao`, `Aprovar` e `EmitirCertificado` | `Matricula` |
| `ConfirmarPagamento` | `Pagamento` |
| `MarcarCorrecao` | `TentativaAvaliacao` |

Isso já está avisado nas Definitions.

Entidades que o fluxo real lê ou grava, mas que **não aparecem** no desenho:

| Diagrama | O que falta |
|---|---|
| Acesso aos Conteúdos | Depois de gravar o `ProgressoConteudoAluno`, o código recalcula `ProgressoModuloAluno` e `ProgressoCursoAluno` (`RecalcularModuloAsync` e `RecalcularCursoAsync`), grava de novo e devolve o snapshot (`ObterSnapshotAsync`). Está só na Definition da seta SaveChangesAsync. |
| Avaliação | Cada resposta vira uma `RespostaAluno` dentro da `TentativaAvaliacao`. A nota é lançada em `LancamentoNotaAluno` por `RecalcularNotaAvaliacaoAsync`. Quiz segue outro caminho: chama `RecalcularProgressoQuizAsync` e não envia notificação. O diagrama mostra só prova/exercício, como diz o título da Definition. |
| Emissão de Certificado | `verificarCursoConcluido` é a leitura de `ProgressoCursoAluno` (precisa estar em 100%). `existeAvaliacaoPendenteDeCorrecao` cruza `Avaliacao` com `LancamentoNotaAluno`. O certificado não é uma entidade própria: é o campo `CertificadoEmitidoEm` da `Matricula`. |
| Matrícula / Cadastro | O `Pagamento` pendente só é criado se o curso for pago (`CriarPagamentoPendenteSeNecessarioAsync`). No cadastro, a matrícula usa a transação já aberta pelo `AlunoService`, porque o `MatriculaService` não abre outra quando já existe uma. |

---

## 4. O que corrigir no Astah (por prioridade)

1. **Renomear a lifeline `ArmazenamentoArquivoService` para `IArmazenamentoArquivoService`** (IA). Hoje ela tem um nome de classe que não existe.
2. **Pagamentos e Conteúdos:**
   - incluir a lifeline `painel : WorkspaceScreen` e fazer a seta GET sair dela;
   - ou manter como está e deixar a explicação só na Definition, como hoje.
3. **IA:** acrescentar as setas `CriarAvaliacao` (antes de gerar, só se a avaliação não existir) e `AtualizarAvaliacao` (no fim, ajuste da nota máxima). O caminho "gerar a partir de conteúdo" pode virar uma observação no diagrama.
4. **Conteúdos:** acrescentar `RecalcularModuloAsync` e `RecalcularCursoAsync` depois do `SaveChangesAsync`. É opcional.
5. **Login:** a seta `onSessionStart` deveria ir para uma lifeline `App`. É opcional.

---

## 5. Aplicado no Astah (2026-10-26)

Backup antes das mudanças: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26.asta`.

- **Nova tela `TelaPainel`** (boundary): o painel `WorkspaceScreen`, que abre depois do login e busca os dados com `loadWorkspaceSnapshot`.
- **`TelaPagamentos` renomeada para `TelaMeusCursos`**, que é o nome que o aluno vê no sistema.
- **Login:** alterado no próprio diagrama. As lifelines do servidor foram afastadas para a direita, para caber a `telaPainel` ao lado da `telaLogin`. O fim do fluxo agora é:
  1. `onSessionStart`;
  2. `handleNavigate` (de telaLogin para telaPainel);
  3. `loadWorkspaceSnapshot` (telaPainel);
  4. `exibirDashboard` (de telaPainel para o usuário).
- **Confirmação de Pagamento e Acesso aos Conteúdos:** foram recriados. As buscas `ListarMeusPagamentos` e `ListarConteudosDoAluno` agora saem da `telaPainel`, depois de `acessarPainel` e `loadWorkspaceSnapshot`. As setas novas são:
  - Pagamento: `abrirMeusCursos` e, no fim, `onRefresh`;
  - Conteúdos: `abrirCurso` e, no fim, `onRefresh`.
- Todas as outras mensagens, retornos e Definitions foram copiados dos diagramas antigos. Os antigos ficaram como "Confirmacao de Pagamento (ANTIGO)" e "Acesso aos Conteudos (ANTIGO)" e precisam ser excluídos à mão.

---

## 6. Popups incluídos como telas (2026-10-26)

Backup antes das mudanças: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26b.asta`.

Os popups são telas da interface, por isso agora aparecem como boundary.

**Nome usado:**
- Quando o popup tem componente próprio, a lifeline leva o nome desse componente.
- Quando o popup é o `Modal` genérico (`frontend/src/components/Modal.jsx`), a classe é `Modal` e o nome da lifeline é a variável do código que abre o popup.

**O que cada elemento recebeu:**
- Cada popup tem Definition na classe, na lifeline e nas setas.
- Cada popup tem uma **nota** no diagrama, com o arquivo e a função que o abre.
- A Definition de cada diagrama ganhou um parágrafo explicando os popups.

| Diagrama | Telas e popups acrescentados (lifeline : classe) | Como abre no código |
|---|---|---|
| Cadastro de Aluno | `publicHome : PublicHome`, `cursoModal : Modal` (detalhes do curso), `telaLogin : TelaLogin` (destino) | `setCursoModal` em PublicHome.jsx; o botão "Cadastrar-se" chama `onNavigate("/cadastro/{cursoId}")`; no fim, `onNavigate("/login")` |
| Matrícula | `popupResultadoMatricula : PopupResultadoMatricula`, `telaMeusCursos : TelaMeusCursos` (destino) | `setPopupMatricula` em solicitarMatricula; `onAcaoPrimaria` → `onNavigate("/app/cursos-matriculados")` |
| Confirmação de Pagamento | `popupResultadoMatricula : PopupResultadoMatricula`, `telaConteudos : TelaConteudos` (destino) | `setPopupPagamento` em confirmarPagamento; `onAcaoPrimaria` → `onNavigate("/app/conteudos/{cursoId}")` |
| Avaliação | `avaliacaoParaConfirmar : Modal` ("Antes de começar"), `avaliacaoEmExecucao : Modal` (prova e resultado), `revisaoTentativaAvaliacao : RevisaoTentativaAvaliacao` ("Revisão detalhada") | `abrirConfirmacaoAvaliacao` → `setAvaliacaoParaConfirmar`; `abrirExecucaoAvaliacao` → `setAvaliacaoEmExecucao`; `setRevisaoAberta` → `carregar` |
| Geração de Questões com IA | `secaoAvaliacoesProfessor : SecaoAvaliacoesProfessor` (origem), `escolhaNovaAvaliacaoAberta : Modal` ("Nova avaliação") | `abrirEscolhaNovaAvaliacao` → `setEscolhaNovaAvaliacaoAberta`; `escolherGeracaoIa` → `setGeracaoIaAberta` |
| Emissão de Certificado | `certificadoAberto : Modal` ("Certificado de Conclusão") | `setCertificadoAberto` e `setCertificadoEmitido` em abrirCertificado; botão `imprimirCertificado` |

**Setas e Definitions novas:**
- Avaliação: a busca da revisão no servidor (`ObterRevisaoTentativa` → `ObterRevisaoTentativaAsync` → banco).
- Geração com IA: a `TelaGeracaoQuestoes` (assistente) também é um popup; isso foi acrescentado à Definition e à nota.
- Geração com IA: a seta solta "Message0", sem nome e sem Definition, foi descartada.

Login e Acesso aos Conteúdos não têm popup no fluxo.

**Excluir à mão no Astah** (o MCP não apaga diagramas):
- "Cadastro de Aluno (ANTIGO)", "Matricula (ANTIGO)";
- "Confirmacao de Pagamento (ANTIGO)" e "(ANTIGO 2)";
- "Avaliacao (ANTIGO)", "Geracao de Questoes com IA (ANTIGO)", "Emissao de Certificado (ANTIGO)", "Acesso aos Conteudos (ANTIGO)";
- "ZZ teste".

---

## 7. Telas com o nome real do componente (2026-10-26)

Backup antes das mudanças: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26c.asta`.

As classes `Tela*` foram renomeadas para o nome real do componente React. As lifelines passaram a usar o mesmo nome, com a primeira letra minúscula.

A Definition de cada classe foi reescrita com três informações:
- o que a tela mostra e faz;
- onde ela fica no código;
- o nome que tinha antes nos diagramas.

| Antes | Agora (classe) | Lifeline | Arquivo |
|---|---|---|---|
| TelaLogin | LoginScreen | loginScreen | frontend/src/pages/LoginScreen.jsx |
| TelaCadastroAluno | CadastroScreen | cadastroScreen | frontend/src/pages/CadastroScreen.jsx |
| TelaMatricula | VistaAlunoMatriculas | vistaAlunoMatriculas | frontend/src/pages/workspace/SecaoMatriculas.jsx |
| TelaPagamentos / TelaMeusCursos | SecaoMeusCursosMatriculados | secaoMeusCursosMatriculados | frontend/src/pages/workspace/SecaoMatriculas.jsx |
| TelaConteudos | SecaoConteudosAluno | secaoConteudosAluno | frontend/src/pages/workspace/SecoesAluno.jsx |
| TelaAvaliacao | SecaoAvaliacoesAluno | secaoAvaliacoesAluno | frontend/src/pages/workspace/SecoesAluno.jsx |
| TelaGeracaoQuestoes | AssistenteGeracaoIA | assistenteGeracaoIA | frontend/src/pages/workspace/AssistenteGeracaoIA.jsx |
| TelaCertificado | SecaoCertificados | secaoCertificados | frontend/src/pages/workspace/SecaoCertificados.jsx |
| TelaVerificacaoCertificado | VerificarCertificadoScreen | verificarCertificadoScreen | frontend/src/pages/VerificarCertificadoScreen.jsx |
| TelaPainel | WorkspaceScreen | workspaceScreen | frontend/src/pages/WorkspaceScreen.jsx |

As Definitions dos diagramas que citavam `TelaPainel` agora citam `WorkspaceScreen`.

---

## 8. Feedback acadêmico removido dos diagramas (2026-10-26)

O commit `8284283` ("Remove FeedbackAcademico") tirou a função do código. Ela também foi retirada dos diagramas.

Backup antes das mudanças: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26d.asta`.

- **Casos de Uso - Professor:** removido "Registrar feedback ao aluno". Os casos de uso abaixo dele subiram para fechar o espaço, e as linhas foram realinhadas.
- **Casos de Uso - Aluno:** removido "Consultar feedback do professor". "Emitir certificado" subiu para o lugar dele.
- **Classes - Usuarios:** removida a classe `FeedbackAcademico`, junto com as associações "envia" e "recebe" com `Usuario`.
- **Atividade - Jornada do Professor:**
  - Removidos a decisão "Algum aluno precisa de orientação?", a nota dela e a ação "Enviar feedback ao aluno".
  - "Calcular notas e progresso dos alunos" agora segue direto para "Exportar desempenho?", e o fim do diagrama subiu.
  - As Definitions do diagrama e da raia Professor não citam mais "orientar alunos".
- **Mantido:** o campo `feedbackProfessor` de `LancamentoNotaAluno`, que é o comentário do professor junto da nota e continua no código.
