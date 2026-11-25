# Auditoria de Bugs e Crashes — Web e Mobile (CodeRyse Academy / PlataformaEnsino)

**Data:** 25/11/2026
**Escopo pedido:** bugs funcionais e crashes em `frontend/` (web) e `mobile/` (app Expo/React Native). Backend (.NET) e infraestrutura ficaram fora do escopo, exceto quando um problema do backend causa diretamente um crash/comportamento quebrado no cliente.
**Calibração de severidade:** este projeto é um trabalho acadêmico (PIM IV) que também está implantado em produção real no Azure, com contas e dados de teste reais (não só mockados). Tratei achados como se importassem de verdade — não como protótipo descartável — mas sem o alarme que um sistema com usuários pagantes em massa exigiria.

## Resumo executivo

**Atualização (25/11/2026, mesmo dia):** os 5 achados abaixo foram corrigidos e cobertos por teste novo (6 testes: 2 em `chatbotApi.test.js`/`PainelAssistente.test.jsx`, 2 em `SecaoAlunos.test.jsx`, 2 em `ConteudosScreen.test.jsx`/`GradeCursosConteudos.test.jsx`). `dotnet test`/`npx vitest`/`npx jest` e os lints seguem sem falhas novas. O texto abaixo é o relatório original, mantido como registro do diagnóstico.

O app mobile está sólido: nenhum crash real foi encontrado. Os dois pontos levantados são cosméticos (um no-op silencioso e uma sobreposição de modais), nenhum derruba a tela. O web tem um bug real de severidade alta — o chat do Assistente CodeRyse trava permanentemente se a conexão cair no meio de uma resposta em streaming, exigindo recarregar a página — e dois problemas médios, um deles (telefone sem máscara ao editar aluno) introduzido na funcionalidade de editar/inativar aluno implementada nesta mesma sessão. As varreduras automatizadas de segredos e XSS não encontraram nada real: os alertas eram todos falsos positivos (bundle minificado do React, dados de teste, `.env` corretamente fora do versionamento).

**Os 3 achados mais importantes, em ordem de prioridade:**
1. **Alta** — Chat do Assistente trava se o streaming SSE cair no meio (`chatbotApi.js` + `PainelAssistente.jsx`).
2. **Média** — Telefone aparece sem máscara ao abrir "Editar dados" de um aluno (`SecaoAlunos.jsx`) — bug introduzido na sessão anterior, fácil de corrigir.
3. **Média** — Erro de formato de e-mail do backend vira mensagem genérica no formulário de aluno (incompatibilidade de formato entre `ValidationProblemDetails` do ASP.NET e o parser de erro do `apiClient`).

## Visão geral do projeto

- **Stack:** backend ASP.NET Core / .NET 10 + EF Core (SQL Server); web React + Vite; mobile Expo/React Native; gateway Express fino entre os dois.
- **Tamanho:** 655 arquivos de código, ~190 mil linhas (112k em C#, 42k em `.jsx`, 10k em `.js`). 102 arquivos de teste (proporção aproximada de 15,6% arquivo-de-teste/arquivo-de-código — razoável para um projeto deste porte, com suíte de testes ativa nos três lados: `dotnet test`, `vitest`, `jest`).
- **CI/CD:** há pipelines em `.github/workflows/ci.yml` e `deploy-azure.yml`.
- **Achado de limpeza (não é bug):** existe uma pasta `.claude/worktrees/agent-a8e0cd21ed2e31dad/` com uma cópia inteira do projeto (incluindo `wwwroot/` compilado) — provavelmente um worktree de uma sessão de agente anterior que não foi removido. Não afeta o funcionamento do app, mas vale limpar para não confundir buscas/greps futuros.

## Metodologia

1. Inventário automatizado (`inventory.py`) para mapear stack, tamanho e arquivos grandes.
2. Varredura heurística de segredos (`detect_secrets.py`) e de padrões de risco/XSS (`security_scan.py`) — todo achado foi lido em contexto antes de entrar neste relatório.
3. Dois agentes dedicados fizeram leitura manual guiada por checklist: um em `frontend/src/**`, outro em `mobile/src/**` + `shared/*.js`, caçando especificamente acesso a `null`/`undefined` sem guarda, promises sem tratamento de erro, condições de corrida, params de navegação assumidos, e incompatibilidade de nomes de campo entre backend e cliente.
4. Achados reportados por esses agentes foram revisados e consolidados aqui — nenhum foi aceito sem a evidência de arquivo:linha.

## Achados por categoria

### Web (`frontend/`)

#### 🔴 Alta — Chat do Assistente trava permanentemente se o streaming cair no meio — ✅ Corrigido

- **Onde:** `frontend/src/lib/chatbotApi.js:77-89` (loop `while (true) { const { done, value } = await leitor.read(); ... }` sem `try/catch`) e `frontend/src/components/chatbot/PainelAssistente.jsx:168-183` (`await enviarMensagemChatbotStream(...)` sem `try/catch` ao redor).
- **Por que importa:** se a conexão cair no meio de uma resposta em streaming (wifi instável, deploy/restart do backend, timeout de proxy), `leitor.read()` rejeita e a exceção sobe sem ser capturada. Como `setEnviando(false)` só roda na linha seguinte ao `await`, ele nunca executa: a flag `enviando` fica `true` para sempre, a mensagem otimista com `aguardandoResposta: true` nunca é resolvida, e o guard `if (... || enviando) return;` em `enviarPergunta` bloqueia qualquer novo envio. O usuário fica com o indicador "digitando..." preso e o chat inutilizável pelo resto da sessão — só recupera recarregando a página inteira.
- **Correção aplicada:** `try/catch` no loop de leitura em `chatbotApi.js` (chama `onErro` com `codigo: "rede"`) e `try/catch/finally` em `enviarPergunta` (`PainelAssistente.jsx`), garantindo `setEnviando(false)` mesmo numa exceção totalmente inesperada.

#### 🟡 Média — Telefone aparece sem máscara ao abrir "Editar dados" do aluno — ✅ Corrigido

- **Onde:** `frontend/src/pages/workspace/SecaoAlunos.jsx`, função `abrirEdicao` — `telefone: alunoDetalhe.telefone || ""` usa o valor cru salvo no banco (ex. `"11999990000"`) em vez de `maskTelefone(alunoDetalhe.telefone || "")`.
- **Por que importa:** o campo só fica formatado depois que o admin digita algo, porque a máscara só é aplicada no `onChange` (`atualizarCampoEdicao`). Como praticamente todo aluno tem telefone salvo sem máscara no banco, isso aparece em quase toda abertura do modal de edição — contraria o próprio requisito "Telefone (com máscara)" do prompt que motivou esta tela. Esse bug foi introduzido na sessão anterior (implementação de editar/inativar aluno) e é fácil de corrigir.
- **Correção aplicada:** `telefone: maskTelefone(alunoDetalhe.telefone || "")` em `abrirEdicao`.

#### 🟡 Média — Erro de formato de e-mail do backend vira mensagem genérica — ✅ Corrigido

- **Onde:** `AtualizarAlunoAdminDto.cs` usa `[EmailAddress]`, validado automaticamente pelo `[ApiController]` do ASP.NET **antes** de chegar ao serviço — essa validação devolve o corpo padrão do ASP.NET (`ValidationProblemDetails`, formato `{ title, errors: {...} }`), diferente do formato `{ erro, mensagem, codigo }` que `shared/apiClient.js` (`lerRespostaOuFalhar`) sabe interpretar.
- **Por que importa:** como o formulário em `SecaoAlunos.jsx` não valida formato de e-mail no cliente, um admin que digitar um e-mail mal formatado recebe só "Não foi possível concluir a operação." em vez de uma mensagem útil tipo "O e-mail fornecido não é válido.". O mesmo padrão de DTO provavelmente se repete em `SecaoProfessores.jsx`/`SecaoCoordenadores.jsx` — não é exclusivo desta tela nova.
- **Correção aplicada:** validação de formato de e-mail no cliente (`SecaoAlunos.jsx`, antes de chamar a API), mostrando "O e-mail fornecido não é válido." — a opção mais simples das duas sugeridas. `SecaoProfessores.jsx`/`SecaoCoordenadores.jsx` continuam com o mesmo gap (fora do escopo desta rodada).

#### Verificado e descartado (sem achado)

`JSON.parse` em todos os 7 usos do projeto (`demoApi.js`, `BarraLateral.jsx`, `SecoesAluno.jsx`, `chatbotApi.js`) já tem tratamento de erro; `.then()` sem `.catch()` não foi encontrado nos componentes revisados (`PainelCursoGestao.jsx`, `useProfessoresCurso.js`, `CartaoAssistenteAdmin.jsx` já guardam com flag `ativo`/`ignore` e tratam 401); nomes de campo entre `AlunoResponseDto`/`AtualizarAlunoAdminDto` do backend e `SecaoAlunos.jsx` batem exatamente.

**Fora do orçamento desta rodada** (não lidos linha a linha, por volume): `frontend/src/lib/demoApi.js` (3996 linhas, só afeta modo demo) e `frontend/src/pages/workspace/SecoesAluno.jsx` (2534 linhas). Candidatos naturais para uma próxima rodada dedicada.

### Mobile (`mobile/`)

#### 🔵 Baixa — "Detalhes" na vitrine de Cursos falha silenciosamente se o curso sumir do snapshot — ✅ Corrigido

- **Onde:** `mobile/src/screens/aluno/ConteudosScreen.jsx` — `cursoPorId.get(itemGradeDetalhe.id)` pode devolver `undefined` se o curso sumir de `snapshot.cursos` enquanto a matrícula ainda existe (cenário raro: curso excluído no backend com matrícula ativa). `DetalheCursoSheet` já trata isso (`if (!curso) return null`), então **não crasha** — mas o toque em "Detalhes" vira um no-op sem nenhum feedback.
- **Correção aplicada:** `abrirDetalheCurso` (novo, em `ConteudosScreen.jsx`) confere `cursoPorId.get(item.id)` antes de abrir o sheet; se o curso não existir, mostra um Toast de erro em vez de um no-op.

#### 🔵 Baixa — Toque na capa abre "Detalhes" por cima da confirmação de "Desistir da compra" — ✅ Corrigido

- **Onde:** `mobile/src/components/GradeCursosConteudos.jsx`, `CardCurso` — com `confirmandoDesistencia=true`, tocar na capa do cartão ainda chama `onAbrirCapa` e abre o sheet de Detalhes por cima da confirmação em andamento.
- **Correção aplicada:** `onAbrirCapa` vira `undefined` (Pressable sem efeito) enquanto `confirmandoDesistencia` estiver ativo.

#### Verificado e descartado (sem achado)

Guardas de `route.params` nulo (`AvaliacoesScreen.jsx`, `ConteudosScreen.jsx`); todo acesso a `AsyncStorage`/`SecureStore`/`JSON.parse` já envolto em try/catch (`quizRascunho.js`, `shared/session.js`); download/compartilhamento de arquivo (`abrirArquivoSeguro.native.js`) sempre chamado dentro de try/catch; guard de double-submit no `QuizModal.jsx`; `shared/apiClient.js` (incluindo a mudança `USUARIO_INATIVO` desta sessão) sempre aguarda o storage assíncrono corretamente.

**Fora do orçamento desta rodada:** telas não tocadas nesta sessão não foram lidas por completo (`PerfilScreen.jsx`, `NotificacoesScreen.jsx`, `CertificadoDetalheScreen.jsx`) — passaram só por varredura de padrões de risco, não leitura integral.

### Segurança (verificação rápida, fora do foco principal)

As varreduras automatizadas não encontraram nada real:
- Os 22 alertas de "XSS potencial"/"execução dinâmica de código" do `security_scan.py` são, sem exceção, dentro do **bundle minificado do React** (`wwwroot/assets/react/*.js` — código de terceiros compilado, não nosso) ou falsos positivos óbvios (`RegExp.prototype.exec` confundido com `eval`/`exec`, `document.body.innerHTML = ""` num teste).
- Os 6 "segredos hardcoded" são todos dados de teste/seed conhecidos e documentados (`DevelopmentDataSeeder.cs`, chaves de API fake em testes, senha demo pública em `demoMode.js`).
- Os três arquivos `.env` no disco (`./`, `frontend/`, `gateway/`) **não estão versionados** — confirmei via `git ls-files` que nenhum está rastreado, e o `.gitignore` já cobre `.env`/`.env.local`/`*.env` corretamente. Não é um achado.

## Matriz de priorização

| Achado | Severidade | Esforço | Status |
|---|---|---|---|
| Chat trava se o streaming SSE cair | Alta | Pequeno (try/catch + finally) | ✅ Corrigido |
| Telefone sem máscara ao editar aluno | Média | Trivial (1 linha) | ✅ Corrigido |
| Erro de e-mail vira mensagem genérica | Média | Pequeno/médio (validação client-side ou parser de erro) | ✅ Corrigido (client-side) |
| "Detalhes" falha silenciosamente se o curso sumir | Baixa | Trivial (1 Toast) | ✅ Corrigido |
| Toque na capa sobrepõe confirmação de desistência | Baixa | Pequeno | ✅ Corrigido |
| Worktree órfão em `.claude/worktrees/` | Housekeeping | Trivial (remover pasta) | Pendente |

## Recomendações de próximos passos

1. ~~Corrigir o travamento do chat do Assistente~~ — ✅ feito.
2. ~~Aplicar a máscara de telefone ao abrir a edição de aluno~~ — ✅ feito.
3. ~~Validar e-mail no cliente~~ — ✅ feito nesta tela; `SecaoProfessores.jsx`/`SecaoCoordenadores.jsx` continuam com o mesmo gap (DTO equivalente, mesma causa raiz) — vale aplicar o mesmo padrão lá numa próxima rodada.
4. Se houver tempo numa próxima rodada: revisão dedicada de `demoApi.js` e `SecoesAluno.jsx` (maiores arquivos do projeto, não cobertos em profundidade aqui) e das telas mobile não tocadas nesta sessão.
5. Remover a pasta `.claude/worktrees/agent-a8e0cd21ed2e31dad/` (housekeeping, não é bug) — ainda pendente.
