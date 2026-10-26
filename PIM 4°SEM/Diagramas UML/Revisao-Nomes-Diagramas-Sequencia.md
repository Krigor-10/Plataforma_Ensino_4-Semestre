# Revisão dos nomes nos diagramas de sequência × código

Data: 2026-10-26. Comparei as 166 mensagens dos 8 diagramas de sequência do arquivo `CodeRyse-Diagramas-Sequencia.asta` (versão salva em 25/10 às 21:39) com o código atual do backend (ASP.NET) e do frontend web (`frontend/src`).

Os caminhos são relativos à pasta `ConsoleApp3`.

## Legenda

| Marca | Significado | O que fazer |
|---|---|---|
| ✅ | O nome existe no código | Nada. Só acrescentar o local na Definition |
| 🔁 | Rota HTTP. No código, o método é a *action* do controller | Renomear para o nome da action e levar a rota para a Definition |
| ✏️ | Existe um método real, mas com outro nome | Renomear para o nome real |
| ⚠️ | Não existe método com esse nome: é um trecho de código dentro de outro método (um `if`, uma consulta ao banco, uma atribuição) | Ver "Decisão pendente" no fim |
| 🖥️ | Ação da tela (frontend). O nome real é a função do React | Renomear para a função real |

> `LoginAsync` existe: está em `Services/AuthService.cs` (linha 27), declarado na interface `Interfaces/IAuthService.cs` e chamado em `Controllers/AuthController.cs` (linha 30).

---

## 1. Login

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | informarCredenciais | 🖥️ | `handleSubmit` | frontend/src/pages/LoginScreen.jsx:21 |
| 2 | POST /auth/login | 🔁 | `Login` | Controllers/AuthController.cs:23 |
| 3 | validarCampos | ⚠️ | `if (string.IsNullOrWhiteSpace(dto.Email) …)` dentro de `Login` | Controllers/AuthController.cs:25 |
| 4 | LoginAsync | ✅ | `LoginAsync` | Services/AuthService.cs:27 |
| 5 | normalizarEmail | ⚠️ | `email.Trim().ToLower()` dentro de `LoginAsync` | Services/AuthService.cs:29 |
| 6 | buscarUsuarioPorEmail | ⚠️ | `_context.Usuarios.FirstOrDefaultAsync(…)` | Services/AuthService.cs:31 |
| 7 | verificarSenhaBCrypt | ⚠️ | `BCrypt.Net.BCrypt.Verify(…)` | Services/AuthService.cs:34 |
| 8 | verificarCadastroAtivo | ⚠️ | `if (!usuario.Ativo)` | Services/AuthService.cs:39 |
| 9 | MontarRespostaAsync | ✅ | `MontarRespostaAsync` | Services/AuthService.cs:191 |
| 10 | GerarRefreshTokenAsync | ✅ | `GerarRefreshTokenAsync` | Services/AuthService.cs:241 |
| 11 | removerTokensExpirados | ✏️ | `ExpurgarRefreshTokensAntigosAsync` | Services/AuthService.cs:261 |
| 12 | adicionarRefreshToken | ⚠️ | `RefreshToken.Emitir(…)` + `_context.RefreshTokens.Add(…)` | Services/AuthService.cs:248–249 |
| 13 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/AuthService.cs:250 |
| 14 | GerarAccessToken | ✅ | `GerarAccessToken` | Services/AuthService.cs:210 |
| 15 | salvarSessao | 🖥️ | `handleSessionStart` → `persistSession` | frontend/src/App.jsx:67 · frontend/src/lib/session.js |
| 16 | exibirDashboard | 🖥️ | `handleNavigate("/app")` dentro de `handleSessionStart` | frontend/src/App.jsx:70 |

## 2. Cadastro de Aluno

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | preencherDadosEEscolherCurso | 🖥️ | `handleSubmit` (valida com `validateSignup`, linha 549) | frontend/src/pages/CadastroScreen.jsx:130 |
| 2 | POST /alunos/cadastro-completo | 🔁 | `CadastroCompleto` | Controllers/AlunosController.cs:49 |
| 3 | CadastrarAlunoCompletoAsync | ✅ | `CadastrarAlunoCompletoAsync` | Services/AlunoService.cs:91 |
| 4 | NormalizarEGarantirDisponivelAsync | ✅ | `UsuarioValidacao.NormalizarEGarantirDisponivelAsync` | Common/UsuarioValidacao.cs:14 |
| 5 | existeEmailOuCpfCadastrado | ⚠️ | `context.Usuarios.AnyAsync(…)` (e-mail e CPF) | Common/UsuarioValidacao.cs:20 e 25 |
| 6 | buscarPrecoDoCurso | ⚠️ | consulta `_context.Cursos…FirstOrDefaultAsync()` | Services/AlunoService.cs:95 |
| 7 | BeginTransactionAsync | ✅ | `_context.Database.BeginTransactionAsync()` | Services/AlunoService.cs:101 |
| 8 | GerarCodigoAlunoAsync | ✅ | `GerarCodigoAlunoAsync` | Services/AlunoService.cs:128 |
| 9 | ConfigurarAcesso | ✅ | `Usuario.ConfigurarAcesso` | Models/Usuario.cs:96 |
| 10 | adicionarAluno | ⚠️ | `_context.Alunos.Add(aluno)` | Services/AlunoService.cs:119 |
| 11 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/AlunoService.cs:120 |
| 12 | MatricularComAprovacaoAutomaticaAsync | ✅ | `MatriculaService.MatricularComAprovacaoAutomaticaAsync` | Services/MatriculaService.cs:49 |
| 13 | CommitAsync | ✅ | `transaction.CommitAsync()` | Services/AlunoService.cs:123 |
| 14 | montarMensagemDeSucesso | ⚠️ | `var mensagem = cursoEhGratuito ? … : …` dentro de `CadastroCompleto` | Controllers/AlunosController.cs:53 |
| 15 | exibirCadastroConcluido | 🖥️ | `setStatus("success")` / `setMessage(…)` em `handleSubmit` | frontend/src/pages/CadastroScreen.jsx:169 |

## 3. Matrícula

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | solicitarMatricula | ✅🖥️ | `solicitarMatricula` | frontend/src/pages/workspace/SecaoMatriculas.jsx:271 |
| 2 | POST /matriculas | 🔁 | `PostMatricula` | Controllers/MatriculasController.cs:75 |
| 3 | UsuarioAtualPodeAcessarAluno | ✅ | `UsuarioAtualPodeAcessarAluno` | Controllers/MatriculasController.cs:185 |
| 4 | MatricularComAprovacaoAutomaticaAsync | ✅ | `MatricularComAprovacaoAutomaticaAsync` | Services/MatriculaService.cs:49 |
| 5 | BeginTransactionAsync | ✅ | `_context.Database.BeginTransactionAsync()` (só se não houver transação aberta) | Services/MatriculaService.cs:52 |
| 6 | CriarMatriculaPendenteAsync | ✅ | `CriarMatriculaPendenteAsync` | Services/MatriculaService.cs:74 |
| 7 | GarantirCursoAbertoAsync | ✅ | `CursoService.GarantirCursoAbertoAsync` | Services/CursoService.cs:180 |
| 8 | GerarCodigoMatriculaAsync | ✅ | `GerarCodigoMatriculaAsync` | Services/MatriculaService.cs:287 |
| 9 | RegistrarSolicitacao | ✅ | `Matricula.RegistrarSolicitacao` | Models/Matricula.cs:57 |
| 10 | AdicionarAsync | ✅ | `GenericRepository.AdicionarAsync` | Repositories/GenericRepository.cs:22 |
| 11 | SalvarAlteracoesAsync | ✅ | `GenericRepository.SalvarAlteracoesAsync` | Repositories/GenericRepository.cs:32 |
| 12 | AprovarMatriculaAutomaticamenteCoreAsync | ✅ | `AprovarMatriculaAutomaticamenteCoreAsync` | Services/MatriculaService.cs:312 |
| 13 | buscarMatriculaComAluno | ⚠️ | consulta `_context.Matriculas.Include(m => m.Aluno)…` | Services/MatriculaService.cs:314 |
| 14 | AprovarNoCursoAsync | ✅ | `AprovarNoCursoAsync` | Services/MatriculaService.cs:350 |
| 15 | buscarMatriculaAprovadaNoCurso | ✏️ | `ObterMatriculaAprovadaNoCursoAsync` | Services/MatriculaService.cs:401 |
| 16 | existeOutraPendenteNoCurso | ✏️ | `GarantirAlunoSemOutraMatriculaPendenteNoCursoAsync` | Services/MatriculaService.cs:410 |
| 17 | Aprovar | ✅ | `Matricula.Aprovar` | Models/Matricula.cs:72 |
| 18 | GarantirCodigoAlunoAsync | ✅ | `GarantirCodigoAlunoAsync` | Services/MatriculaService.cs:293 |
| 19 | adicionarPagamentoPendente | ✏️ | `CriarPagamentoPendenteSeNecessarioAsync` (usa `Pagamento.CriarPendente`) | Services/MatriculaService.cs:379 · Models/Pagamento.cs:24 |
| 20 | SalvarAlteracoesAsync | ✏️ | quem é chamado é `SalvarComProtecaoDeConcorrenciaAsync`, que por dentro chama `SalvarAlteracoesAsync` | Services/MatriculaService.cs:57 (definido na 171) |
| 21 | CommitAsync | ✅ | `transaction.CommitAsync()` | Services/MatriculaService.cs:61 |
| 22 | ObterMatriculaCompletaAsync | ✅ | `MatriculaRepository.ObterMatriculaCompletaAsync` | Repositories/MatriculaRepository.cs:14 |
| 23 | exibirMatriculaAprovada | 🖥️ | `setPopupMatricula(…)` em `solicitarMatricula` (componente `PopupResultadoMatricula`) | frontend/src/pages/workspace/SecaoMatriculas.jsx:283 |

## 4. Confirmação de Pagamento

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | abrirMeusPagamentos | 🖥️ | `loadWorkspaceSnapshot` (carrega os pagamentos ao abrir o painel) | frontend/src/lib/dashboard.js:4 (chamada na 68) |
| 2 | GET /pagamentos/aluno | 🔁 | `ListarMeusPagamentos` | Controllers/PagamentosController.cs:21 |
| 3 | ObterUsuarioIdAutenticado | ✅ | `ObterUsuarioIdAutenticado` | Controllers/PagamentosController.cs:46 |
| 4 | ListarPagamentosDoAlunoAsync | ✅ | `ListarPagamentosDoAlunoAsync` | Services/PagamentoService.cs:20 |
| 5 | buscarPagamentosDoAluno | ⚠️ | consulta `_context.Pagamentos…ToListAsync()` | Services/PagamentoService.cs:22 |
| 6 | MapResponse | ✅ | `MapResponse` | Services/PagamentoService.cs:54 |
| 7 | exibirPagamentosPendentes | 🖥️ | componente `SecaoMeusCursosMatriculados` | frontend/src/pages/workspace/SecaoMatriculas.jsx:136 |
| 8 | confirmarPagamento | ✅🖥️ | `confirmarPagamento` | frontend/src/pages/workspace/SecaoMatriculas.jsx:183 |
| 9 | POST /pagamentos/{matriculaId}/confirmar | 🔁 | `ConfirmarPagamento` | Controllers/PagamentosController.cs:34 |
| 10 | ObterUsuarioIdAutenticado | ✅ | `ObterUsuarioIdAutenticado` | Controllers/PagamentosController.cs:46 |
| 11 | ConfirmarPagamentoAsync | ✅ | `ConfirmarPagamentoAsync` | Services/PagamentoService.cs:32 |
| 12 | buscarPagamentoDaMatriculaDoAluno | ⚠️ | consulta `_context.Pagamentos…FirstOrDefaultAsync(…)` | Services/PagamentoService.cs:34 |
| 13 | ConfirmarPagamento | ✅ | `Pagamento.ConfirmarPagamento` | Models/Pagamento.cs:43 |
| 14 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/PagamentoService.cs:41 |
| 15 | NotificarAsync | ✅ | `NotificacaoService.NotificarAsync` | Services/NotificacaoService.cs:25 |
| 16 | MapResponse | ✅ | `MapResponse` | Services/PagamentoService.cs:54 |
| 17 | exibirAcessoLiberado | 🖥️ | `setPopupPagamento(…)` em `confirmarPagamento` | frontend/src/pages/workspace/SecaoMatriculas.jsx:188 |

## 5. Acesso aos Conteúdos

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | abrirConteudosDoCurso | 🖥️ | `loadWorkspaceSnapshot` (busca) / `abrirCurso` (abre a lista) | frontend/src/lib/dashboard.js:65 · frontend/src/pages/workspace/SecoesAluno.jsx:1690 |
| 2 | GET /conteudosdidaticos/aluno/{alunoId} | 🔁 | `ListarConteudosDoAluno` | Controllers/ConteudosDidaticosController.cs:41 |
| 3 | UsuarioAtualPodeAcessarAluno | ✅ | `UsuarioAtualPodeAcessarAluno` | Controllers/ConteudosDidaticosController.cs:137 |
| 4 | ListarConteudosPorAlunoAsync | ✅ | `ListarConteudosPorAlunoAsync` | Services/ConteudoDidaticoService.cs:46 |
| 5 | ValidarAlunoAsync | ✅ | `ValidarAlunoAsync` | Services/ConteudoDidaticoService.cs:186 |
| 6 | ListarPublicadosPorAlunoAsync | ✅ | `ListarPublicadosPorAlunoAsync` | Repositories/ConteudoDidaticoRepository.cs:38 |
| 7 | buscarPublicadosDoCursoMatriculadoEPago | ⚠️ | é a própria consulta de `ListarPublicadosPorAlunoAsync` | Repositories/ConteudoDidaticoRepository.cs:42 |
| 8 | MapResponse | ✅ | `MapResponse` | Controllers/ConteudosDidaticosController.cs:139 |
| 9 | exibirListaDeConteudos | 🖥️ | componente `SecaoConteudosAluno` | frontend/src/pages/workspace/SecoesAluno.jsx:1411 |
| 10 | abrirConteudo | ✏️🖥️ | `selecionarConteudoAluno` (no web; `abrirConteudo` só existe no app mobile) | frontend/src/pages/workspace/SecoesAluno.jsx:1694 |
| 11 | exibirConteudo | 🖥️ | componente `SlideConteudosCurso` | frontend/src/pages/workspace/SecoesAluno.jsx:1770 |
| 12 | marcarComoConcluido | ✏️🖥️ | `marcarConteudoConcluido` | frontend/src/pages/workspace/SecoesAluno.jsx:1698 |
| 13 | PUT /progressos/conteudos/{conteudoId}/concluir | 🔁 | `MarcarConteudoConcluido` | Controllers/ProgressosController.cs:33 |
| 14 | ObterAlunoId | ✅ | `ObterAlunoId` | Controllers/ProgressosController.cs:45 |
| 15 | MarcarConteudoConcluidoAsync | ✅ | `MarcarConteudoConcluidoAsync` | Services/ProgressoAlunoService.cs:69 |
| 16 | ValidarAlunoAsync | ✅ | `ValidarAlunoAsync` | Services/ProgressoAlunoService.cs:342 |
| 17 | buscarConteudoPublicado | ⚠️ | consulta `_context.ConteudosDidaticos…` | Services/ProgressoAlunoService.cs:73 |
| 18 | buscarMatriculaAprovada | ⚠️ | consulta `_context.Matriculas…` | Services/ProgressoAlunoService.cs:78 |
| 19 | TemAcessoLiberadoAsync | ✅ | `AcessoAcademicoService.TemAcessoLiberadoAsync` | Services/AcessoAcademicoService.cs:25 |
| 20 | buscarOuCriarProgresso | ⚠️ | consulta `_context.ProgressosConteudosAlunos` + `Add` se não existir | Services/ProgressoAlunoService.cs:92–105 |
| 21 | registrarConclusao | ⚠️ | atribuições `progresso.StatusProgresso = Concluido` etc. | Services/ProgressoAlunoService.cs:107–112 |
| 22 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/ProgressoAlunoService.cs:114 |
| 23 | exibirProgressoAtualizado | 🖥️ | `mostrarToast(…)` + `onRefresh()` em `marcarConteudoConcluido` | frontend/src/pages/workspace/SecoesAluno.jsx:1708 |

Não desenhado: depois do passo 22 o código ainda chama `RecalcularModuloAsync` e `RecalcularCursoAsync` (linhas 116–118).

## 6. Avaliação

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | abrirAvaliacao | ✏️🖥️ | `abrirExecucaoAvaliacao` | frontend/src/pages/workspace/SecoesAluno.jsx:616 |
| 2 | GET /avaliacoes/{id}/aluno/questoes | 🔁 | `ListarQuestoesDoAluno` | Controllers/AvaliacoesController.cs:132 |
| 3 | ObterAlunoId | ✅ | `ObterAlunoId` | Controllers/AvaliacoesController.cs:434 |
| 4 | ListarQuestoesPorAlunoAsync | ✅ | `ListarQuestoesPorAlunoAsync` | Services/AvaliacaoService.cs:232 |
| 5 | ObterAvaliacaoPublicadaDoAlunoAsync | ✅ | `ObterAvaliacaoPublicadaDoAlunoAsync` | Services/AvaliacaoService.cs:790 |
| 6 | buscarAvaliacaoPublicadaComQuestoes | ⚠️ | consulta `_context.Avaliacoes…` | Services/AvaliacaoService.cs:794 |
| 7 | buscarMatriculaAprovada | ⚠️ | consulta `_context.Matriculas…` | Services/AvaliacaoService.cs:811 |
| 8 | TemAcessoLiberadoAsync | ✅ | `AcessoAcademicoService.TemAcessoLiberadoAsync` | Services/AcessoAcademicoService.cs:25 |
| 9 | MapQuestaoAluno | ✅ | `MapQuestaoAluno` | Services/AvaliacaoService.cs:1441 |
| 10 | exibirQuestoes | 🖥️ | estado atualizado em `abrirExecucaoAvaliacao` | frontend/src/pages/workspace/SecoesAluno.jsx:638 |
| 11 | responderEEnviar | ✏️🖥️ | `enviarRespostas` → `submeterRespostas` | frontend/src/pages/workspace/SecoesAluno.jsx:739 e 764 |
| 12 | POST /avaliacoes/{id}/aluno/respostas | 🔁 | `EnviarRespostasDoAluno` | Controllers/AvaliacoesController.cs:238 |
| 13 | ObterAlunoId | ✅ | `ObterAlunoId` | Controllers/AvaliacoesController.cs:434 |
| 14 | EnviarRespostasAlunoAsync | ✅ | `EnviarRespostasAlunoAsync` | Services/AvaliacaoService.cs:565 |
| 15 | ObterAvaliacaoPublicadaDoAlunoAsync | ✅ | `ObterAvaliacaoPublicadaDoAlunoAsync` | Services/AvaliacaoService.cs:790 |
| 16 | ValidarPeriodoAvaliacao | ✅ | `ValidarPeriodoAvaliacao` | Services/AvaliacaoService.cs:1388 |
| 17 | validarRespostasEnviadas | ⚠️ | verificações das respostas (vazias, duplicadas, quantidade) | Services/AvaliacaoService.cs:578–591 |
| 18 | contarTentativasRealizadas | ⚠️ | `_context.TentativasAvaliacao.CountAsync(…)` | Services/AvaliacaoService.cs:593 |
| 19 | corrigirQuestoesObjetivas | ⚠️ | laço `foreach (var questao in questoes)` que soma `notaObjetiva` | Services/AvaliacaoService.cs:609–652 |
| 20 | MarcarCorrecao | ✅ | `TentativaAvaliacao.MarcarCorrecao` | Models/TentativaAvaliacao.cs:51 |
| 21 | adicionarTentativa | ⚠️ | `_context.TentativasAvaliacao.AddAsync(tentativa)` | Services/AvaliacaoService.cs:661 |
| 22 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/AvaliacaoService.cs:665 |
| 23 | RecalcularNotaAvaliacaoAsync | ✅ | `ProgressoAlunoService.RecalcularNotaAvaliacaoAsync` | Services/ProgressoAlunoService.cs:123 |
| 24 | NotificarAsync | ✅ | `NotificacaoService.NotificarAsync` | Services/NotificacaoService.cs:25 |
| 25 | MapTentativaAluno | ✅ | `MapTentativaAluno` | Services/AvaliacaoService.cs:1486 |
| 26 | exibirNota | 🖥️ | resultado tratado em `submeterRespostas` | frontend/src/pages/workspace/SecoesAluno.jsx:789 |

## 7. Emissão de Certificado

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | solicitarCertificado | ✏️🖥️ | `abrirCertificado` | frontend/src/pages/workspace/SecaoCertificados.jsx:125 |
| 2 | POST /certificados/matricula/{matriculaId}/emitir | 🔁 | `Emitir` | Controllers/CertificadosController.cs:23 |
| 3 | ObterAlunoId | ✅ | `ObterAlunoId` | Controllers/CertificadosController.cs:57 |
| 4 | EmitirCertificadoAsync | ✅ | `EmitirCertificadoAsync` | Services/CertificadoService.cs:19 |
| 5 | buscarMatriculaComDetalhes | ✏️ | `ObterMatriculaComDetalhesAsync` | Services/CertificadoService.cs:114 |
| 6 | verificarMatriculaAprovada | ⚠️ | `if (matricula.Status != StatusMatricula.Aprovada)` | Services/CertificadoService.cs:29 |
| 7 | TemAcessoLiberadoAsync | ✅ | `AcessoAcademicoService.TemAcessoLiberadoAsync` | Services/AcessoAcademicoService.cs:25 |
| 8 | verificarCursoConcluido | ⚠️ | `if (progresso is null \|\| progresso.PercentualConclusao < 100)` | Services/CertificadoService.cs:40 |
| 9 | existeAvaliacaoPendenteDeCorrecao | ⚠️ | consulta `_context.Avaliacoes…AnyAsync()` | Services/CertificadoService.cs:48 |
| 10 | verificarCursoEncerrado | ⚠️ | `if (… ModeloCurso.Acompanhado && !EncerradoEm.HasValue)` | Services/CertificadoService.cs:68 |
| 11 | EmitirCertificado | ✅ | `Matricula.EmitirCertificado` | Models/Matricula.cs:114 |
| 12 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/CertificadoService.cs:82 |
| 13 | MapResponse | ✅ | `MapResponse` | Controllers/CertificadosController.cs:59 |
| 14 | exibirCertificado | 🖥️ | `setCertificadoEmitido(resposta)` em `abrirCertificado` | frontend/src/pages/workspace/SecaoCertificados.jsx:133 |
| 15 | informarCodigoVerificacao | 🖥️ | o código chega pela URL; a tela chama `verificar` | frontend/src/pages/VerificarCertificadoScreen.jsx:26 |
| 16 | GET /certificados/verificar/{codigo} | 🔁 | `Verificar` | Controllers/CertificadosController.cs:51 |
| 17 | ObterCertificadoPorCodigoAsync | ✅ | `ObterCertificadoPorCodigoAsync` | Services/CertificadoService.cs:100 |
| 18 | normalizarCodigo | ⚠️ | `(codigo ?? string.Empty).Trim()` | Services/CertificadoService.cs:102 |
| 19 | buscarMatriculaPorCodigo | ✏️ | `ObterMatriculaComDetalhesAsync` | Services/CertificadoService.cs:104 (definido na 114) |
| 20 | MapResponse | ✅ | `MapResponse` | Controllers/CertificadosController.cs:59 |
| 21 | exibirCertificadoValido | 🖥️ | estado atualizado em `verificar` | frontend/src/pages/VerificarCertificadoScreen.jsx:33 |

## 8. Geração de Questões com IA

| # | No diagrama | | Nome no código | Onde está |
|---|---|---|---|---|
| 1 | enviarMaterialEConfigurar | ✏️🖥️ | `gerarQuestoes` | frontend/src/pages/workspace/AssistenteGeracaoIA.jsx:154 |
| 2 | POST /avaliacoes/{id}/ia/gerar-questoes | 🔁 | `GerarQuestoesComIa` | Controllers/AvaliacoesController.cs:280 |
| 3 | ObterProfessorId | ✅ | `ObterProfessorId` | Controllers/AvaliacoesController.cs:432 |
| 4 | validarConfiguracao | ⚠️ | conversão de `tiposPermitidos` + `TryValidateModel(configuracao)` | Controllers/AvaliacoesController.cs:295–325 |
| 5 | GerarQuestoesComIaAsync | ✅ | `GerarQuestoesComIaAsync` | Services/AvaliacaoService.cs:861 |
| 6 | ObterAvaliacaoPorProfessorAsync | ✅ | `ObterAvaliacaoPorProfessorAsync` | Services/AvaliacaoService.cs:132 |
| 7 | buscarAvaliacaoDoProfessor | ✏️ | `ObterDetalheAsync` | Services/AvaliacaoService.cs:779 |
| 8 | validarArquivoPdfOuDocx | ⚠️ | `if (extensao != ".pdf" && extensao != ".docx")` | Services/AvaliacaoService.cs:867–876 |
| 9 | ExtrairTextoAsync | ✅ | `ExtratorTextoMaterialService.ExtrairTextoAsync` | Services/ExtratorTextoMaterialService.cs:26 |
| 10 | SalvarArquivoAsync | ✅ | `ArmazenamentoArquivoServiceBase.SalvarArquivoAsync` | Services/ArmazenamentoArquivoServiceBase.cs:58 |
| 11 | montarMaterialParaIa | ✏️ | `MaterialParaIaDto.DeTexto` / `MaterialParaIaDto.DeDocumento` | DTOs/MaterialParaIaDto.cs:7 |
| 12 | GerarQuestoesAsync | ✅ | `GeminiAvaliacaoIAService.GerarQuestoesAsync` | Services/GeminiAvaliacaoIAService.cs:38 |
| 13 | MontarPrompt | ✏️ | `PromptGeracaoQuestoesIa.MontarComTexto` / `MontarParaDocumentoAnexado` | Services/PromptGeracaoQuestoesIa.cs:13 e 25 |
| 14 | POST generateContent | 🔁 | `cliente.PostAsync("v1beta/models/{modelo}:generateContent")` (chamada externa ao Gemini) | Services/GeminiAvaliacaoIAService.cs:99 |
| 15 | Desserializar | ✅ | `RespostaIaUtil.Desserializar` | Services/RespostaIaUtil.cs:42 |
| 16 | ValidarEFiltrar | ✅ | `RespostaIaUtil.ValidarEFiltrar` | Services/RespostaIaUtil.cs:64 |
| 17 | ValidarOuLancar | ✅ | `ValidadorQuestaoIaService.ValidarOuLancar` | Services/ValidadorQuestaoIaService.cs:12 |
| 18 | exibirRascunhoParaRevisao | 🖥️ | estado atualizado em `gerarQuestoes` | frontend/src/pages/workspace/AssistenteGeracaoIA.jsx:217 |
| 19 | revisarEConfirmar | ✏️🖥️ | `confirmarRascunho` | frontend/src/pages/workspace/AssistenteGeracaoIA.jsx:413 |
| 20 | POST /avaliacoes/{id}/questoes/lote | 🔁 | `AdicionarQuestoesEmLote` | Controllers/AvaliacoesController.cs:167 |
| 21 | AdicionarQuestoesEmLoteAsync | ✅ | `AdicionarQuestoesEmLoteAsync` | Services/AvaliacaoService.cs:322 |
| 22 | ValidarDadosQuestao | ✅ | `ValidarDadosQuestao` | Services/AvaliacaoService.cs:1264 |
| 23 | adicionarQuestoesBancoEPublicadas | ⚠️ | `_context.QuestoesBanco.AddAsync` + `_context.QuestoesPublicadas.AddAsync` | Services/AvaliacaoService.cs:390–391 |
| 24 | SaveChangesAsync | ✅ | `_context.SaveChangesAsync()` | Services/AvaliacaoService.cs:397 |
| 25 | exibirQuestoesDaAvaliacao | 🖥️ | final de `confirmarRascunho` | frontend/src/pages/workspace/AssistenteGeracaoIA.jsx:461 |

Observações: o provedor padrão de IA é a Anthropic (`AvaliacaoIAService`). O Gemini só é usado com `IA:Provedor = "Gemini"` (Program.cs:82–93). Além disso, quando a avaliação ainda não existe, a tela primeiro cria a avaliação (`POST /Avaliacoes`, linha 173), e esse passo não está no diagrama.

---

## Resumo

| Situação | Mensagens (de 166) |
|---|---|
| ✅ Nome igual ao código | 83 |
| 🔁 Rota no lugar do nome da action | 14 |
| ✏️ Método existe com outro nome | 17 |
| ⚠️ Trecho interno, sem método próprio | 32 |
| 🖥️ Ação da tela (frontend) | 29 |

(Alguns itens se encaixam em mais de uma marca.)

### Tipos de retorno que diferem do código (detalhe menor)

- `ObterAlunoId`, `ObterProfessorId` e `ObterUsuarioIdAutenticado` retornam `int?`, e não `int`.
- `ListarQuestoesPorAlunoAsync`, `ListarConteudosPorAlunoAsync` e `AdicionarQuestoesEmLoteAsync` retornam `IEnumerable<…>`, e não `List<…>`.
- As actions dos controllers retornam `IActionResult`/`ActionResult<…>`. O DTO que está no rótulo é o conteúdo da resposta.

### O que não deu para conferir sem o Astah aberto

Li o .asta direto do arquivo, porque o servidor MCP do Astah estava desligado. Assim deu para ver os nomes e a numeração, mas não **qual lifeline recebe cada mensagem**. Quando o Astah estiver aberto, preciso conferir se a classe de destino de cada seta bate com a coluna "Nome no código". Exemplo: `Desserializar` precisa chegar em `RespostaIaUtil`.

## Decisão pendente: o que fazer com os ⚠️

1. **Trocar pela chamada real.** Quando o trecho chama algo (`FirstOrDefaultAsync`, `AnyAsync`, `BCrypt.Verify`, `Add`), a mensagem passa a ter esse nome. Quando é só um `if` (ex.: `validarCampos`, `verificarCadastroAtivo`), a seta sai e a regra vai para a Definition do método que a contém. Fica 100% pesquisável, mas o diagrama fica mais "técnico".
2. **Manter o nome descritivo.** A Definition passa a dizer "não é um método; é um trecho dentro de `LoginAsync` (Services/AuthService.cs)". O diagrama fica legível, mas a busca no código continua não achando.

## Formato proposto para o local na Definition

Ao final do texto já aprovado, acrescentar uma linha:

> **No código:** `Services/AuthService.cs` → `AuthService.LoginAsync`

Para as rotas:

> **No código:** `POST /api/v1/auth/login` → `Controllers/AuthController.cs` → `AuthController.Login`

Sem número de linha, porque as linhas mudam a cada alteração no código e o arquivo + método continuam valendo.

---

## O que foi aplicado no Astah (2026-10-26)

Valem para os 8 diagramas: os trechos internos (⚠️) mantiveram o nome descritivo, e todas as mensagens, operações e classes ganharam a linha **"No código: …"** na Definition. As classes Tela* não foram renomeadas.

**Renomeados para o nome real:**

| Diagrama | Antes → Agora |
|---|---|
| Login | informarCredenciais → handleSubmit · POST /auth/login → Login · salvarSessao → onSessionStart |
| Cadastro de Aluno | preencherDadosEEscolherCurso → handleSubmit · POST /alunos/cadastro-completo → CadastroCompleto |
| Matrícula | POST /matriculas → PostMatricula |
| Confirmação de Pagamento | GET /pagamentos/aluno → ListarMeusPagamentos · POST /pagamentos/{matriculaId}/confirmar → ConfirmarPagamento |
| Acesso aos Conteúdos | GET /conteudosdidaticos/aluno/{alunoId} → ListarConteudosDoAluno · abrirConteudo → selecionarConteudoAluno · marcarComoConcluido → marcarConteudoConcluido · PUT /progressos/conteudos/{conteudoId}/concluir → MarcarConteudoConcluido |
| Avaliação | abrirAvaliacao → abrirExecucaoAvaliacao · responderEEnviar → enviarRespostas · GET …/aluno/questoes → ListarQuestoesDoAluno · POST …/aluno/respostas → EnviarRespostasDoAluno |
| Emissão de Certificado | solicitarCertificado → abrirCertificado · POST …/emitir → Emitir · GET …/verificar/{codigo} → Verificar |
| Geração de Questões com IA | enviarMaterialEConfigurar → gerarQuestoes · revisarEConfirmar → confirmarRascunho · POST …/ia/gerar-questoes → GerarQuestoesComIa · POST …/questoes/lote → AdicionarQuestoesEmLote |

A rota HTTP de cada um continua na Definition.

**Itens marcados como ✏️ no relatório que ficaram com o nome descritivo:** a seta deles vai para o banco (`context`), mas o método real pertence ao service. Renomear deixaria a seta apontando para a classe errada. A Definition explica de qual método o trecho faz parte:

- `removerTokensExpirados` — está em `ExpurgarRefreshTokensAntigosAsync`.
- `buscarMatriculaAprovadaNoCurso` — está em `ObterMatriculaAprovadaNoCursoAsync`.
- `existeOutraPendenteNoCurso` — está em `GarantirAlunoSemOutraMatriculaPendenteNoCursoAsync`.
- `adicionarPagamentoPendente` — está em `CriarPagamentoPendenteSeNecessarioAsync`.
- `buscarMatriculaComDetalhes` e `buscarMatriculaPorCodigo` — estão em `ObterMatriculaComDetalhesAsync`.
- `buscarAvaliacaoDoProfessor` — está em `ObterDetalheAsync`.
- `montarMaterialParaIa` e `MontarPrompt` — são chamadas a `MaterialParaIaDto` e a `PromptGeracaoQuestoesIa`.

**Setas que chegam na classe "errada" (avisado na Definition, não redesenhado):** os métodos abaixo pertencem ao objeto de domínio, mas estão desenhados como chamada do service para ele mesmo.

- `ConfigurarAcesso` — é de `Usuario`.
- `RegistrarSolicitacao`, `Aprovar` e `EmitirCertificado` — são de `Matricula`.
- `ConfirmarPagamento` (no PagamentoService) — é de `Pagamento`.
- `MarcarCorrecao` — é de `TentativaAvaliacao`.
- `Desserializar` e `ValidarEFiltrar` — são da classe utilitária `RespostaIaUtil`.
