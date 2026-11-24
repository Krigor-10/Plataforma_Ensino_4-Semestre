# CodeRyse — Auditoria diagnóstica final (2026-11-18)

**Tipo:** somente análise. Nenhum arquivo de código, configuração, banco ou migration foi alterado. O único arquivo criado é este relatório.
**Prazo de referência:** 27/11/2026.
**Base analisada:** `main` em `6f12a94` ("Inscricoes v3"), mais o working tree, que tem uma alteração **em andamento** de outro agente: Etapa 1 do `PROMPT-agente-fluxo-professor-igual-coordenador.md` (`PreviaItemAluno.jsx` novo, `LeituraItemConteudo` removido, `TelaModuloGestao.jsx` modificado).

## Evidências de execução

| Suíte | Resultado | Observação |
|---|---|---|
| Backend (`dotnet test --no-build`, último build) | **482/482 aprovados** | Não reconstruí o projeto, para não disputar arquivos com a API em execução. |
| Web (`vitest run`) | **313/314** | **1 falha:** `PainelCursoGestao.test.jsx` › "abrir o quiz mostra o gabarito…". O teste é da tela do módulo, que está sendo alterada agora pela Etapa 1 (working tree), então é esperado até o agente terminar. |
| Mobile (`jest`) | **85/85** | Só existem testes de `src/lib` (10 suítes). **Nenhuma tela do mobile tem teste.** |
| Logs (`logs/dotnet-run.stdout.log`, 16/11) | Nenhum `fail:`/exception | Há 1 `warn:` do EF: `FirstOrDefault` sem `OrderBy`. |

**Não validado no app em execução:** o painel do navegador fechou durante a auditoria, e por isso os itens visuais foram avaliados pelo código e pelos prints que o usuário enviou. Eles estão marcados como NÃO VALIDADOS quando não houve comprovação.

**Referências em Downloads:** todas acessíveis. São `model conteudos.png`, `Modal de Edição de Avaliação em Roxo.png`, `tela meus cursos.jpg` e `tela avaliação aluno.png`. Atenção: esta última mostra o **cartão da lista de avaliações**, e não o modal da avaliação.

---

## PARTE 1 — Resumo executivo

**Estado geral:** o projeto está funcional e bem coberto no backend (482 testes, autorização por perfil no servidor, regras de certificado e de pagamento com testes). Os fluxos principais existem nas três frentes: compra/matrícula, progresso, quiz, avaliação, certificado, Inscrições e chatbot.

**Consolidado:**
- autenticação com refresh automático, compartilhada por web e mobile (`shared/apiClient.js`);
- pagamento simulado com desistência e vencimento em 3 dias (v3);
- trava de edição ao concluir e encerrar o curso;
- cálculo de progresso ponderado;
- tela Inscrições v3;
- configuração do chatbot só para Admin.

**Principais problemas reais encontrados:**
1. **Exclusão de módulo praticamente impossível.** Qualquer conteúdo (até arquivado) bloqueia, e conteúdo com progresso de aluno nunca é apagado, só arquivado. Um módulo que já teve aluno **nunca** pode ser excluído, e não existe arquivar módulo.
2. **Certificado não é emitido automaticamente** (Gratuito e Pacote). A emissão só acontece quando o aluno **abre** o certificado: web, `POST …/emitir` ao clicar; mobile, ao abrir a aba. Até lá, `CertificadoEmitidoEm` fica nulo, e os números de "certificados emitidos" do Admin ficam **subcontados**.
3. **Revisão da avaliação sem imagens.** O DTO da revisão não traz os anexos das questões, e a tela não os desenha. O modal também é menor que o da execução (820px contra 1024px).
4. **"Turmas" ainda aparece para o usuário:**
   - menu "Turmas" do Professor;
   - KPI "Turmas" no modal do professor;
   - textos do `appConfig`.
5. **A lista de Admin carrega tudo de uma vez:** `/Alunos` completo com `Include` das matrículas, mais `/Matriculas`, `/Turmas` e `/Modulos`. A paginação é feita no navegador (8 por página). Com milhares de alunos, a tela fica lenta.

**Riscos para a apresentação:**
- uma tela de professor está em refatoração agora (fluxo igual ao coordenador, prompt em 3 etapas), com 1 teste vermelho;
- o dashboard do aluno mostra os KPIs no fim da página;
- a revisão de prova perde as imagens;
- excluir módulo dá erro em demonstração.

---

## PARTE 2 — Matriz de requisitos

| Perfil | Requisito | Status | Evidência | Problema | Causa | Recomendação | Risco | Prioridade |
|---|---|---|---|---|---|---|---|---|
| Admin | A. Lista de alunos | IMPLEMENTADO COM PROBLEMAS | `AlunosController.GetAlunos` (paginação opcional, `X-Total-Count`); `AlunoService.ListarAlunosAsync`; `frontend/src/lib/dashboard.js:19` chama `/Alunos` **sem** página; `SecaoAlunos.jsx` pagina no navegador (`ITENS_POR_PAGINA = 8`) | O backend sabe paginar, mas a web não usa. Não há busca no servidor. O snapshot do Admin também baixa `/Matriculas`, `/Turmas` e `/Modulos` inteiros. | Snapshot único carregado no login (`dashboard.js`) | Usar `pagina`/`tamanhoPagina` e acrescentar `termo` e `status` no endpoint; carregar a tela de alunos sob demanda | Lentidão e memória com muitos alunos | Média (não afeta a demo) |
| Admin | A. Detalhes do aluno | IMPLEMENTADO, MAS NÃO VALIDADO | `SecaoAlunos.jsx` ≈ 239: CPF, telefone, cidade/UF, cadastro, cursos matriculados | Não mostra progresso nem pagamento por curso | — | Opcional: progresso e situação de pagamento por curso | Baixo | Baixa |
| Admin | B. Modal do professor sem turmas | IMPLEMENTADO COM PROBLEMAS | `SecaoProfessores.jsx` 79–97 (`turmasPorProfessor`), 210 (cursos derivados de turmas), 638 (`CartaoEstatistica rotulo="Turmas"`) | O modal mostra o KPI **"Turmas"**, e os cursos do professor são **derivados das turmas**, não do vínculo `ProfessoresCursos` | Código anterior à regra "sem turmas na UI" | Trocar pela relação `ProfessoresCursos` (`GET /Cursos/{id}/professores` já existe) e mostrar "alunos por curso" | Professor vinculado ao curso sem turma aparece "sem cursos" | Alta |
| Admin | C. Custos do assistente | IMPLEMENTADO, MAS NÃO VALIDADO | `CartaoAssistenteAdmin.jsx`, renderizado em `SecaoChamados.jsx:164` só para Admin; `ChatbotController` `configuracao`/`uso` com `[Authorize(Roles="Admin")]`; tabela `ConfiguracaoChatbot` (Ativo, TetoMensalUsd) | Configuração da plataforma fica dentro da tela de **Chamados**. O modal de perfil **não** tem configuração operacional (só dados pessoais e senha), o que está correto | Não há área "Configurações da plataforma" | Recomendação (não urgente): mover o cartão para uma seção "Configurações" do Admin; manter o perfil só pessoal | Baixo | Baixa |
| Admin | D. Modal do coordenador | IMPLEMENTADO, MAS NÃO VALIDADO | `SecaoCoordenadores.jsx` 676–688, "Cursos sob supervisao" a partir de `curso.coordenadorId` | A lista só tem o texto do título, sem ícone nem modelo, e o rótulo está sem acento | — | Ícone ou miniatura + nome + selo de modelo; corrigir "supervisão". Há prompts não aplicados em `docs/bugs/PROMPT-agente-melhorias-tela-coordenadores.md` | Baixo | Baixa |
| Admin | E. Inscrições: espaço visual | IMPLEMENTADO, MAS NÃO VALIDADO | v3 aplicada (`6f12a94`): cabeçalho com cartão "Total de cursos", abas Alunos/Vendas, 4 KPIs, filtros e tabela paginada | Pelos prints, o cabeçalho, o cartão roxo e os KPIs grandes ocupam cerca de 380px antes da tabela | Opção por KPIs grandes (decisão do usuário) | Só ajuste fino: reduzir o padding do cabeçalho e o espaço entre os blocos; medir no app | Baixo | Baixa |
| Coord./Prof. | A. Exclusão de módulos | IMPLEMENTADO COM PROBLEMAS (proteção intencional, incompleta) | `ModulosController.ExcluirModulo` → `ModuloService.ExcluirModuloAsync:109` → `ModuloRepository.PossuiDependenciasAsync:59` (qualquer `ConteudoDidatico`, `Avaliacao`, `LancamentoNotaAluno`, `ProgressoConteudoAluno` ou `ProgressoModuloAluno`); FKs `Restrict` em `ConteudosConfiguration`/`ProgressoConfiguration` | Bloqueia até módulo só com rascunhos ou **arquivados**. Conteúdo com progresso é arquivado (`ConteudoDidaticoService` ≈ 178), nunca apagado, então o módulo fica **eterno**. Não existe arquivar módulo. A mensagem está sem acento | Proteção do histórico sem um caminho alternativo | **Solução única:** (1) excluir quando não houver histórico de aluno, levando junto conteúdos e quizzes sem uso; (2) **arquivar o módulo** quando houver histórico (some para professor e aluno novo, o progresso fica). Sem cascata em progresso ou nota | Apagar histórico se feito com cascata | **Alta** |
| Coord./Prof. | Mesmo endpoint e permissões | CONCLUÍDO E VALIDADO (código + testes) | Um endpoint só, `DELETE /Modulos/{id}` (`Admin,Coordenador,Professor`) + `CursoAutorizacaoService.PodeGerenciarModuloAsync` (Admin tudo; coordenador do curso; professor em `ProfessoresCursos`); `ModuloServiceTests`, `CursoAutorizacaoServiceTests` | Inconsistência: `POST /Modulos` é só `Admin,Professor`, então o coordenador edita e exclui, mas **não cria** | Decisões da planilha de permissões ainda não aplicadas (`docs/permissoes`) | Aplicar o prompt de permissões já aprovado | Médio | Média |
| Professor | B. Peso de progresso | CONCLUÍDO E VALIDADO (código + testes) | `ConteudoDidatico.PesoProgresso`, `Avaliacao.PesoProgresso` (quiz); `ProgressoAlunoService.RecalcularModuloAsync` ≈ 484 e o cálculo do curso ≈ 593; `SomarPeso` ignora peso ≤ 0 | Sem validação no backend (aceita 0 ou negativo, e aí o item conta como 0); a web valida > 0. A soma não precisa dar 100 (pesos relativos) | — | Validar `> 0` no DTO; explicar no modal "peso relativo, padrão 1" ou esconder (ver Parte 3) | Baixo | Baixa |
| Professor | B. Ordem de exibição no modal | IMPLEMENTADO, MAS NÃO VALIDADO | `OrdemExibicao` default = nº de itens do módulo (`SecaoConteudosProfessor.jsx:215`); "Mover para cima/baixo" troca as ordens (≈ 583) | O campo é redundante no modal | — | **Pode sair do modal**, mantendo o default automático e o Mover. A referência `model conteudos.png` já não tem o campo | Duplicar a ordem após exclusões (sem efeito visível grave) | Baixa |
| Professor | C. Modal de novo conteúdo sem rolagem | PARCIALMENTE IMPLEMENTADO | Campos atuais: curso, módulo, tipo, título, status, descrição/corpo, arquivo/link, **ordem**, **peso**; a referência mostra tipo em 5 botões, título+status lado a lado e só o campo condicional | Ordem e peso alongam o modal | — | Seguir a referência: tirar ordem/peso (ou recolher em "Avançado"), tipo em botões, 2 colunas | Baixo; vai junto com a refatoração do fluxo do professor | Média |
| Professor | D. Modal de avaliação (criar/editar) | IMPLEMENTADO, MAS NÃO VALIDADO | Um componente só para criar e editar, `AssistenteQuizAvaliacao.jsx` (título dinâmico ≈ 829; seção "Dados gerais" ≈ 942) | A referência (lista de questões à esquerda, "Dados gerais" e "Configurações") parece já ser o layout atual; não confirmei no app | — | Conferir no app; ajustar só espaçamentos se preciso | Baixo | Baixa |
| Professor | E. Fluxo de conteúdos (prévia antes de publicar) | PARCIALMENTE IMPLEMENTADO (em andamento) | `PROMPT-agente-fluxo-professor-igual-coordenador.md` (3 etapas); Etapa 1 no working tree | 1 teste web vermelho durante a refatoração | Obra em curso | Terminar a Etapa 1 com o teste verde antes das Etapas 2–3 | **Alto** (arquivo de 2.100 linhas) | Alta |
| Aluno | A. Dashboard: KPIs no topo | NÃO IMPLEMENTADO | `DashboardAluno.jsx`: o bloco "Resumo de atividades" (`grade-estatisticas`, ≈ 200) vem **depois** de "Continuar" e dos cursos ativos | KPIs no rodapé | Ordem das seções | Mover a seção de KPIs para logo abaixo da saudação (compactos) | Baixo | Média |
| Aluno | B. Avaliações: disponíveis/concluídas | PARCIALMENTE IMPLEMENTADO | `SecaoAvaliacoesAluno` (`SecoesAluno.jsx:1321`) conta "N disponíveis" por curso e já exclui quiz (`tipoAvaliacao === 1`) | Não há resumo "Disponíveis · Concluídas" no topo direito | — | Os dados existem no cliente (`/Avaliacoes/aluno/{id}`); prompt pronto e não aplicado: `docs/bugs/PROMPT-agente-metricas-avaliacoes-aluno-e-gestao.md` | Baixo | Média |
| Aluno | C. Meus Cursos: troféu de certificado | NÃO IMPLEMENTADO | `CartaoCursoMatricula` (`SecaoMatriculas.jsx`) não tem selo; `MatriculaResponseDto` **não** traz `CertificadoEmitidoEm` | — | Campo ausente no DTO | Expor `certificadoEmitidoEm` no DTO e mostrar o selo só com a data preenchida. **Depende do item "emissão automática"**: hoje a data só é gravada quando o aluno abre o certificado | Baixo | Média |
| Aluno | D. Modal de avaliação | IMPLEMENTADO, MAS NÃO VALIDADO | `SecoesAluno.jsx` ≈ 1169 (enunciado em `<p>`, anexos em `quiz-anexos`), `.modal-caixa--avaliacao-execucao` até 64rem | A referência enviada é o **cartão** da lista (status, questões, tentativas, última nota, "Iniciar avaliação"), não o modal | — | Confirmar com o usuário qual tela comparar | — | Baixa |
| Aluno | E1. Revisão menor que a execução | IMPLEMENTADO COM PROBLEMAS | `.modal-caixa--revisao-avaliacao` = `min(820px, 92vw)` (`workspace.css` ≈ 9395) contra `.modal-caixa--avaliacao-execucao` `min(100%, 64rem)` | Revisão menor que a execução | CSS separado | Usar a mesma largura da execução | Baixo | Média |
| Aluno | E2. Imagens na revisão | IMPLEMENTADO COM PROBLEMAS | Execução mostra `questaoAtual.anexos` (≈ 1176); `RevisaoTentativaAvaliacao.jsx:107` só mostra `enunciado`; `DTOs/RevisaoTentativaResponseDto.cs` **sem anexos** | Imagens somem na revisão (web e, pelo mesmo endpoint, mobile) | Backend não envia os anexos + front não desenha | Incluir os anexos no DTO da revisão e reaproveitar a renderização de `GabaritoQuestoes.jsx:168` | Baixo | **Alta** |
| Regra | 4.1 Modalidades | PARCIALMENTE IMPLEMENTADO | Compra/acesso: `MatriculaService.ComprarCursoAsync`, `IAcessoAcademicoService.TemAcessoLiberadoAsync`; vencimento: `PagamentoVencimentoExecutor` (testado); Acompanhado: concluir/encerrar/reabrir/devolver em `CursoService` | **Liberação periódica** = o professor publica aos poucos (`StatusPublicacao`); não há agenda de liberação nem bloqueio sequencial de módulos. Avaliações liberam por progresso (`ObterLiberacaoAvaliacoesAsync`) | — | Ver Parte 3 (decisão sobre liberação agendada ou sequencial) | Médio | Média |
| Regra | 4.2 Certificado automático | PARCIALMENTE IMPLEMENTADO | Critérios em `CertificadoService.ObterPendenciasAsync` (pagamento, 100%, prova corrigida, nota ≥ 7 só com avaliação formal, Acompanhado encerrado); lote no encerramento do Acompanhado (`CursoService:315`); web emite ao clicar (`SecaoCertificados.jsx:172`); mobile ao abrir a aba | Gratuito/Pacote **não** são automáticos no servidor. Em dev a "aprovação simulada" (`RecursosTeste:AprovacaoCertificadoSimulada=true`) emite com nota < 7. Certificado já emitido some se surgir pendência nova | Emissão ligada à interface | Emitir no servidor quando a última pendência some (no recálculo de progresso ou no lançamento de nota); status "Emitido" prevalece. Prompt mobile pronto: `docs/certificados-mobile` | **Alto** (integridade e KPIs) | **Alta** |
| Regra | 4.3 Responsabilidades | CONCLUÍDO E VALIDADO (código) | Professor: `POST /Cursos/{id}/concluir` (Gratuito/Acompanhado). Coordenador: encerrar/reabrir/devolver. Admin: criar, editar, pacote, publicar/despublicar venda, imagem | **Não existe** arquivar ou excluir curso, nem "encerrar inscrições" separado (o encerramento bloqueia matrícula) | — | Só documentar; sem ação para a apresentação | Baixo | Baixa |
| Regra | 4.4 Professor obrigatório no Acompanhado | NÃO IMPLEMENTADO | Vínculo em `ProfessoresCursos` (`CursoService.VincularProfessorAsync`); nenhuma validação exige professor no Acompanhado (criar, publicar ou matricular) | Acompanhado pode existir sem professor | — | Ver Parte 3. Sem professor, quem cria módulos é o **Admin** (`POST /Modulos` = Admin, Professor) | Médio | Média |
| Mobile | Fluxos do aluno | IMPLEMENTADO, MAS NÃO VALIDADO | Endpoints: login/logout/esqueci-senha, snapshot (`/Cursos`, `/Turmas`, `/Matriculas/aluno`, `/Modulos/aluno`, `/ConteudosDidaticos/aluno`, `/Avaliacoes/aluno`, `/Progressos/aluno`, `/Pagamentos/aluno`), comprar, cancelar pagamento, concluir conteúdo, quiz (questões, respostas, revisão), certificados (status/emitir), notificações, perfil | **Faltam:** chamados/suporte e chatbot. Certificados com o bug "emitido some" (prompt não aplicado). Telas sem testes | — | Parte 6 | Médio | Média |
| Mobile | Chatbot no mobile | PENDENTE DE DECISÃO (viável) | Parte 6 | — | — | — | — | Baixa |
| Geral | Turma na interface | IMPLEMENTADO COM PROBLEMAS (pequeno) | **Correção de 18/11:** o menu `turmas` do Professor aparece como **"Progresso"** (`WorkspaceScreen.jsx:90`), então não há menu "Turmas" visível. Ainda sobram: o texto de lista vazia em `SecaoTurmasProfessor.jsx:138` ("…turmas atribuidas…"), o KPI "Turmas" no modal do professor (Admin) e as descrições do `appConfig.js` (`:24`, `:115`) | Palavra "turma" em 3 textos | Legado | Trocar os textos; nenhuma decisão é necessária | Baixo | Baixa |
| Geral | Organização | IMPLEMENTADO COM PROBLEMAS | Arquivos grandes: `SecoesAluno.jsx` 2.791, `SecaoConteudosProfessor.jsx` 2.118, `AvaliacaoService.cs` 1.788, CSS somado 16.955 linhas; pasta solta `.claude/worktrees/agent-a8e0cd21…` com cópia antiga do código e branch `worktree-agent-a8e0cd21ed2e31dad` | Difícil manutenção; a busca acha código duplicado na pasta da worktree | — | Pós-apresentação: quebrar os arquivos grandes por seção; remover a worktree órfã (com aprovação) | Baixo | Baixa |
| Geral | SEO | PARCIALMENTE IMPLEMENTADO | `index.html` (title, description), `lib/pageMetadata.js` (troca title/description por rota) | Sem `canonical`, sem `robots`/`noindex` nas rotas autenticadas, sem `robots.txt`/`sitemap`, sem Open Graph | — | Acrescentar `noindex` em `/app/*`, canonical e OG na Home pública | Baixo | Baixa |
| Geral | Testes | PARCIALMENTE IMPLEMENTADO | Ver Parte 5 | Mobile sem testes de tela; sem E2E | — | — | — | Média |

---

## PARTE 3 — Pendências de decisão (só o que ainda não está decidido)

1. **Exclusão de módulo com histórico.**
   - **Dúvida:** o que acontece ao excluir um módulo que já teve aluno?
   - **Alternativas:**
     - (a) só bloqueia, como hoje;
     - (b) **arquivar o módulo** (esconde e mantém o histórico);
     - (c) excluir em cascata.
   - **Recomendação:** (b), mais (d) "excluir de verdade quando não há histórico, levando os rascunhos junto".
   - **Afeta:** professor, coordenador, Admin, progresso e certificado.
2. **Emissão automática no servidor.**
   - **Dúvida:** emitir no momento em que o aluno cumpre o último critério (recomendado), ou manter "emite quando o aluno abre"?
   - **Afeta:** os KPIs de certificados do Admin, o troféu em Meus Cursos, o mobile e a aprovação simulada de dev.
3. **Professor obrigatório no Acompanhado.**
   - **Dúvida:** exigir professor vinculado para publicar ou abrir inscrições no Acompanhado?
   - **Recomendação:** exigir no **matricular/publicar**, não na criação (o Admin cria e depois vincula).
4. **Liberação no Acompanhado.**
   - **Dúvida:** continuar "o professor publica quando quiser" (hoje), ou criar uma **data de liberação agendada** por módulo? Não há bloqueio sequencial.
   - **Recomendação para 27/11:** manter como está e documentar.
5. **Menu "Turmas" do professor.**
   - **Dúvida:** retirar o menu, ou renomear para "Alunos" (alunos dos meus cursos)?
   - **Afeta:** `SecaoTurmasProfessor.jsx` e os textos do `appConfig`.
6. **Peso de progresso no modal.**
   - **Dúvida:** esconder (todos com peso 1) ou manter em "Avançado"?
   - **Recomendação:** "Avançado", fechado por padrão.
7. **Referência "tela avaliação aluno".**
   - **Dúvida:** a imagem é o cartão da lista, não o modal. Qual tela o usuário quer ajustar?

---

## DECISÕES TOMADAS (18/11, uma por vez com o usuário)

1. **Módulo:**
   - sem histórico de aluno: **exclui de verdade**, levando junto rascunhos e itens sem uso;
   - com histórico: **arquiva** (o progresso e as notas ficam e dá para restaurar);
   - nunca usar cascata em progresso ou nota.
2. **Certificado:** **automático no servidor**, assim que o aluno cumpre o último critério, com notificação. O status "Emitido" prevalece sobre pendências novas.
3. **Professor no Acompanhado:**
   - obrigatório **já na criação**;
   - **não dá para desvincular o último professor**;
   - vale só enquanto o curso for Acompanhado.
   - **Extra:** um Acompanhado **encerrado pode virar pacote pago**, como o Gratuito (hoje `DefinirPacoteAsync` só aceita Gratuito encerrado). A partir daí a obrigação de professor deixa de valer.
4. **Liberação no Acompanhado:** **fica como está** (o professor publica aos poucos). Só documentar.
5. **Menu "Turmas":** não existe; o relatório estava errado (ver linha "Turma na interface"). Só trocar os textos.
6. **Peso de progresso:** **sai do modal**. Todo item passa a valer 1 na porcentagem; o campo continua no banco com o padrão 1. A **Ordem de exibição** também sai do modal (default automático + "Mover").
7. **Referência "tela avaliação aluno":** o usuário quer o **botão "Iniciar avaliação" igual ao modelo**:
   - pílula roxa cheia, um pouco maior que hoje;
   - ícone de play dentro de um círculo;
   - texto com acento ("Iniciar avaliação" / "Continuar avaliação");
   - à direita da linha de dados (Status · Questões · Tentativas · Última nota), centralizado na vertical.

   Hoje: `Botao tamanho="pequeno"` com `TbPlayerPlay` 14px e o texto "Iniciar avaliacao", em `SecoesAluno.jsx` ≈ 1526.

---

## PARTE 4 — Ajustes necessários

**Correções funcionais e de backend:**
1. Exclusão e arquivamento de módulo (depois da decisão 1).
2. Anexos no DTO da revisão de tentativa.
3. Emissão automática de certificado no servidor; status "Emitido" prevalece (decisão 2).
4. `CertificadoEmitidoEm` no `MatriculaResponseDto`.
5. Validar `PesoProgresso > 0` no backend.
6. Acentos nas mensagens de erro (módulo, certificado).

**Frontend web:**
1. Revisão com a mesma largura da execução e com imagens.
2. KPIs do aluno no topo.
3. Resumo de avaliações no topo direito (prompt pronto).
4. Troféu em Meus Cursos.
5. Modal do professor sem "Turmas" e com cursos por `ProfessoresCursos`.
6. Modal de conteúdo sem Ordem (e Peso em "Avançado").
7. Terminar o fluxo do professor (Etapas 1 a 3).

**UX/UI:**
1. Lista de cursos com ícone no modal do coordenador.
2. Ajuste fino de espaço na tela Inscrições.

**Mobile:**
1. Aplicar o prompt de Certificados (o emitido não some).
2. Revisão com imagens (mesmo DTO).
3. Avaliar chamados para o aluno.

**Desempenho:** paginação e busca reais na lista de alunos; tirar `/Alunos`, `/Matriculas` e `/Turmas` completos do snapshot do Admin.

**Segurança:**
- confirmar que `RecursosTeste:AprovacaoCertificadoSimulada` fica **false** fora de dev (já bloqueado em Production pelo código, mas vale o checklist);
- timeout nas chamadas HTTP do `shared/apiClient.js`.

**Organização:** remover a worktree órfã; dividir os arquivos grandes (depois da apresentação); 1 aviso do EF (`FirstOrDefault` sem `OrderBy`).

---

## PARTE 5 — Riscos de regressão

| Alteração | Arquivos | Dependentes | Endpoints | Entidades | Perfis | Testes necessários | Risco indireto |
|---|---|---|---|---|---|---|---|
| Arquivar/excluir módulo | `ModuloService`, `ModuloRepository`, `ModulosController`, `Modulo` (+ migration de status) | `SecaoConteudosProfessor`, `PainelCursoGestao`, `TelaModuloGestao`, progresso | `DELETE/PUT /Modulos` | Modulo, ConteudoDidatico, Avaliacao, Progresso*, LancamentoNota | Admin, Coord., Prof., Aluno | `ModuloServiceTests` (com e sem histórico), recálculo de progresso, aluno não vê módulo arquivado | Progresso e certificado recalculados errado |
| Certificado automático | `CertificadoService`, `ProgressoAlunoService`, `AvaliacaoService` (lançar nota) | Inscrições (KPI), Dashboard, Certificados web/mobile | `/Certificados/*` | Matricula | Aluno, Admin | `CertificadoServiceTests` (emite ao concluir, não emite com pendência, emitido prevalece) | Emissão indevida em dev (aprovação simulada) |
| Anexos na revisão | `RevisaoTentativaResponseDto`, `AvaliacaoService`, `RevisaoTentativaAvaliacao.jsx`, mobile `RevisaoQuizModal.jsx` | `GabaritoQuestoes` | `GET …/tentativas/{id}/revisao` | AnexoQuestaoBanco | Aluno | Teste de DTO + vitest da revisão | Resposta maior (imagens só por URL) |
| Fluxo do professor | `SecaoConteudosProfessor.jsx`, `TelaModuloGestao.jsx`, `PreviaItemAluno.jsx` | Coordenador e Admin (tela do módulo) | nenhum novo | — | Prof., Coord., Admin | `SecaoConteudosProfessor.test.jsx`, `PainelCursoGestao.test.jsx` (hoje 1 vermelho) | Perder ações em lote e a trava de edição |
| Modal do professor sem turmas | `SecaoProfessores.jsx` | `dashboard.js` (snapshot) | `/Cursos/{id}/professores` | ProfessorCurso, Turma | Admin | vitest do modal | Contagem de alunos diferente da atual |
| Paginação de alunos | `dashboard.js`, `SecaoAlunos.jsx`, `AlunoService` | Dashboard Admin (usa `alunos.length`) | `GET /Alunos` | Aluno | Admin, Coord. | `AlunoService` (página e termo) | KPIs que dependem da lista completa |

---

## PARTE 6 — Auditoria mobile (só aluno)

- **Estrutura:**
  - Expo SDK 57, RN 0.86, React 19.2;
  - `@react-navigation` (tabs + native-stack), sem Expo Router;
  - telas em `src/screens/aluno` (Início, Cursos/Conteúdos, Avaliações, Progresso, Certificados, Catálogo, Busca, Notificações, Perfil);
  - perfil não aluno vai para `AcessoNaoSuportadoScreen` (`App.js:104`), o que está correto.
- **Autenticação e sessão:** `shared/apiClient.js` (o mesmo da web), com refresh automático no 401 e fila única de renovação; tokens em `secureStorage`. JWT de 20 min com refresh token. **Sem timeout** nas requisições.
- **Endpoints:** usa os mesmos endpoints da web para o aluno (lista na Parte 2), incluindo compra, desistência (`/Pagamentos/{id}/cancelar`), conclusão de conteúdo e quiz.
- **Fluxos incompletos ou inconsistentes:**
  1. Certificados: o emitido some quando aparece pendência nova (prompt pronto, não aplicado).
  2. Revisão de quiz/avaliação sem imagens (mesma causa do backend).
  3. Sem chamados/suporte para o aluno (a web tem `AbaMeusChamados`).
  4. Sem chatbot.
  5. Snapshot também carrega `/Turmas`.
  6. Nenhum teste de tela.
- **Viabilidade do chatbot no mobile: VIÁVEL, complexidade média.**
  - **Backend pronto:** `POST /Chatbot/mensagens` (perfil Aluno), histórico (`GET /Chatbot/conversas/atual`), feedback, limites (100 mensagens/dia, 1.000 caracteres, teto mensal com corte automático).
  - **Streaming:** a web usa SSE com `response.body.getReader()` e `TextDecoder`. O `fetch` padrão do React Native **não** expõe o corpo em stream. Há dois caminhos:
    - (a) usar `?stream=false`, que já existe no controller e é simples;
    - (b) usar `expo/fetch`, que tem streaming em versões recentes do Expo e precisaria ser testado.
  - **Dependências de navegador:** só `document.addEventListener` (Esc) no painel web, o que não se aplica ao mobile.
  - **Consumo:** só texto, impacto baixo.
  - **Estimativa:** 1–2 dias para uma tela de chat com histórico e envio sem streaming.

---

## PARTE 7 — Plano de execução até 27/11/2026

**Bloco 1 — Integridade (até 21/11):**
1. Terminar a Etapa 1 do fluxo do professor, com o teste verde.
2. Anexos e largura da revisão.
3. Decisões 1 e 2.
4. Certificado automático e "emitido prevalece" (web e mobile).
5. Arquivar/excluir módulo.

**Bloco 2 — Aluno e Admin visível (até 24/11):**
1. KPIs do aluno no topo.
2. Resumo de avaliações.
3. Troféu em Meus Cursos (depende do Bloco 1, item 4).
4. Modal do professor sem turmas.
5. Etapas 2–3 do fluxo do professor.
6. Modal de conteúdo sem Ordem.

**Bloco 3 — Acabamento (até 26/11):**
1. Modal do coordenador.
2. Espaço da tela Inscrições.
3. SEO `noindex`/canonical.
4. Decisão sobre o menu "Turmas".

**Dia 27/11 — regressão manual + suítes:** `dotnet test`, `vitest`, `jest`, mais o roteiro da Parte 8.

**Depois da apresentação:** paginação real de alunos, chatbot e chamados no mobile, divisão dos arquivos grandes, limpeza da worktree órfã.

---

## PARTE 8 — Recomendação final

1. **O que precisa ser corrigido:**
   - exclusão de módulo (arquivar);
   - certificado automático e "emitido prevalece";
   - imagens e tamanho da revisão;
   - "Turmas" no modal do professor;
   - KPIs do aluno no topo;
   - terminar o fluxo do professor.
2. **O que está pronto e não deve ser mexido:**
   - autenticação e refresh;
   - compra, pagamento e vencimento;
   - trava de edição e ciclo de vida do curso;
   - cálculo de progresso;
   - Inscrições v3;
   - configuração do chatbot (Admin);
   - autorização por perfil no backend.
3. **Decisões pendentes:** as 7 da Parte 3. As mais urgentes são a 1 (módulo) e a 2 (certificado).
4. **Itens de maior risco:**
   - refatoração do fluxo do professor (arquivo grande, em andamento);
   - certificado automático (integridade acadêmica);
   - arquivar módulo (progresso).
5. **O que testar antes da apresentação:**
   - login e expiração (deixar 20 min parado);
   - compra → desistir → comprar de novo;
   - concluir conteúdo e quiz → progresso;
   - prova com imagem → revisão;
   - certificado (Gratuito, Pacote e Acompanhado após encerrar);
   - excluir e arquivar módulo;
   - professor: criar, revisar e publicar;
   - coordenador e Admin: prévia;
   - mobile: o mesmo aluno vendo progresso e certificado.
6. **O projeto está pronto para a apresentação?** **Quase.** O núcleo está estável e testado (482 testes no backend, 313/314 na web, 85 no mobile). Faltam, antes de 27/11:
   - concluir a refatoração do professor, que está em andamento;
   - corrigir a revisão sem imagens;
   - fechar as duas decisões de integridade (módulo e certificado).

   Com isso feito, o risco da demonstração fica baixo.
