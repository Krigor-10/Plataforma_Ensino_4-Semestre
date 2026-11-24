# Prompt — Fluxo do curso gratuito que vira pacote pago (Professor → Coordenador → Admin)

## Contexto

Projeto CodeRyse Academy: backend ASP.NET (raiz do repositório) e frontend web (`frontend/`, React + Vite). O app mobile é só do Aluno e entra apenas no ponto do catálogo (item F).

O CodeRyse tem 3 modelos de curso (`ModeloCurso`): **Gratuito = 1**, **PagoPacote = 2** e **Acompanhado = 3**. Valores, criação e pacotes são do **Admin**.

### Fluxo aprovado pelo usuário (vale para o modelo **Gratuito**)

1. O **Professor** termina o curso gratuito e **conclui** o curso.
2. O **Coordenador** do curso recebe uma notificação e **encerra (fecha)** o curso.
3. O **Admin** é avisado, com uma notificação e um card no Dashboard, e encontra o curso na tela **Cursos › aba Encerrados**.
4. O Admin abre **"Preparar para venda"**, define o preço, o texto de venda e a capa, e vê a prévia do card na home.
5. Ele escolhe **"Salvar sem publicar"**, e o curso vira pacote pago mas fica fora da venda, ou **"Colocar à venda"**, e o curso aparece na home pública. Depois ele pode tirar da venda.

### Decisões do usuário

- O fluxo vale para o **Gratuito**. O Acompanhado continua como está.
- Na conversão, **o mesmo curso vira pago**: `ModeloCurso = PagoPacote` e `Preco > 0`. **Quem já estava matriculado mantém o acesso**; quem chegar depois compra.
- Publicar na home é um **passo separado** ("Colocar à venda"). Definir o preço não publica.
- Tela Cursos do Admin com **abas pelo caminho do curso**: **Em andamento › Encerrados › À venda › Fora da venda**. O modelo vira **etiqueta no card**, mais um **filtro por modelo**.
- **Card no Dashboard do Admin** ("N cursos encerrados aguardando você") e **notificação no sino** quando o Coordenador encerra.
- **Janela única "Preparar para venda"** com preço, descrição de venda, capa e **prévia do card da home**.

### Imagens aprovadas (nesta pasta)

- `parte1-aviso-dashboard.png`: card no Dashboard e notificação;
- `parte2-abas-cursos.png`: abas, etiqueta de modelo e filtro;
- `parte3-janela-preparar-venda.png`: janela com preço, prévia e botões.

Os números amarelos e o quadro lateral são só explicação, não fazem parte da tela.

## O que o agente de arquitetura já verificou (não repetir)

**Modelo `Models/Curso.cs`:**
- `Preco` e `EhGratuito` (`[NotMapped]`, `Preco <= 0`);
- `ModeloCurso`, com padrão `PagoPacote`;
- `ConcluidoPeloProfessorId/Em` e `EncerradoPorId/Em`;
- métodos `ConcluirPeloProfessor`, `Encerrar` e `Reabrir` (≈ linhas 96–125);
- **Não existe** campo de "à venda / publicado na home".

**Serviço `Services/CursoService.cs`:**
- `ConcluirCursoComoProfessorAsync` (≈ linha 205): só aceita **Acompanhado** ("Apenas cursos do modelo Acompanhado podem ser concluidos pelo professor."), exige professor vinculado e **já notifica o coordenador** (`TipoNotificacao.CursoConcluidoPeloProfessor`).
- `EncerrarCursoAsync` (≈ linha 230): só **Acompanhado**, só o coordenador do curso, exige conclusão do professor e **emite os certificados automaticamente** (`_certificadoService.EmitirCertificadosDoCursoAsync`). Essa emissão é regra do Acompanhado.
- `ReabrirCursoAsync` (≈ linha 271).
- `GarantirCursoAbertoAsync` (≈ linha 193): bloqueia alterações quando o curso é Acompanhado e está encerrado.

**Rotas `Controllers/CursosController.cs`:**
- `POST {id}/concluir` (Professor), `POST {id}/encerrar` e `POST {id}/reabrir` (Coordenador);
- `PUT {id}` (Admin/Coordenador; só Admin muda o preço, 403);
- `POST {id}/imagem` (Admin).

**Outros pontos do backend:**
- Notificações: `Models/Notificacao.cs`, enum `TipoNotificacao` com `MatriculaAprovada 0`, `AvaliacaoCorrigida 2`, `ConteudoPublicado 3`, `PagamentoConfirmado 4` e `CursoConcluidoPeloProfessor 5`.
- Compra: `Services/MatriculaService.cs` (rota `POST /Matriculas/comprar`).

**Frontend web:**
- Visibilidade no catálogo público: `isCursoVisivelNoCatalogoPublico` (`frontend/src/data/appConfig.js` ≈ linha 47) esconde só o Acompanhado encerrado. É usada em `PublicHome.jsx`, `CadastroScreen.jsx` e `SecaoMatriculas.jsx`.
- **Não há botão no web para o Professor concluir o curso.** A rota `POST /Cursos/{id}/concluir` existe, mas nenhuma tela a chama.
- Tela do curso do Coordenador e do Admin (`PainelCursoGestao.jsx`): os botões Encerrar e Reabrir (≈ linhas 252–260) só aparecem com `ehAcompanhado` (≈ linha 208). O status "Em andamento / Aguardando encerramento / Encerrado" está em ≈ linha 264.
- Tela Cursos do Admin (`SecaoCursos.jsx` ≈ linhas 628–720): grade `catalogo-grade` com busca, "Novo curso" e o filtro por coordenador. Ainda **não tem abas**.
- Abas: usar `.abas-matriculas` / `.linha-abas-status`, como Professores e Coordenadores.

**Mobile:** `mobile/src/screens/aluno/CatalogoScreen.jsx` ≈ linha 41 repete o filtro do catálogo (esconde o Acompanhado encerrado).

A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Riscos de regressão já identificados (tratar obrigatoriamente)

1. **CRÍTICO: o acesso do aluno depende do preço ATUAL do curso.** A regra "tem acesso se `Curso.Preco <= 0` ou se há pagamento confirmado" está espalhada em:
   - `Services/AcessoAcademicoService.cs` ≈ linha 32 (`TemAcessoLiberadoAsync`);
   - `Services/AvaliacaoService.cs` ≈ linha 85;
   - `Services/ProgressoAlunoService.cs` ≈ linha 32;
   - `Repositories/ConteudoDidaticoRepository.cs` ≈ linha 51;
   - `Repositories/ModuloRepository.cs` ≈ linha 50.

   Se o curso grátis passar a ter `Preco > 0`, **todo aluno que entrou de graça perde o acesso** a conteúdos, módulos, progresso e avaliações, porque não tem pagamento confirmado. Isso contradiz a decisão do usuário. No frontend web, o "pagamento pendente" vem dos registros de pagamento (`WorkspaceScreen.jsx` ≈ linha 229), então a tela não avisa nada: o aluno simplesmente para de ver o conteúdo.
2. **`GarantirCursoAbertoAsync`** é usado na criação e edição de avaliação (`AvaliacaoService` ≈ linhas 179 e 205), na de conteúdo (`ConteudoDidaticoService` ≈ linhas 72 e 113) e na matrícula (`MatriculaService` ≈ linha 127). Estendê-lo ao Gratuito encerrado é o comportamento desejado. Mas ele **não pode** passar a bloquear o que o aluno já matriculado faz: marcar conteúdo concluído, responder avaliação, ver a revisão e pedir certificado.
3. **Certificado:** `CertificadoService` ≈ linha 237 tem regra própria para o Acompanhado. O Gratuito encerrado e o Gratuito convertido em pacote **continuam** permitindo que o aluno antigo peça o certificado.
4. **Valor cobrado na compra:** `MatriculaService` ≈ linha 307 e `AlunoService` ≈ linha 96 leem `Curso.Preco` para criar o pagamento e para o cadastro com curso. Depois da conversão, o aluno **novo** paga o preço novo e o antigo não paga nada.
5. **Mobile:** `ConfirmacaoCompraSheet.jsx`, `CatalogoScreen.jsx` e `ConteudosScreen.jsx` também leem `modeloCurso`, `preco` e `encerradoEm`.
6. **Demo:** `frontend/src/lib/demoApi.js` simula essas regras. Atualizar para o modo demo não quebrar os testes de fumaça (`demoApi.smoke.test.js`).

## Tarefa

### 0. Antes de alterar qualquer arquivo: viabilidade e impacto
1. Mapear **todos** os usos de `ModeloCurso`, `EhGratuito`, `Preco`, `EncerradoEm` e `ConcluidoPeloProfessorEm` no backend, nos repositories, no frontend, no mobile, no `demoApi` e nos testes (`PlataformaEnsino.Tests`: `CursoServiceTests`, `MatriculaServiceTests`, `CertificadoServiceTests`, `AvaliacaoServiceTests`, `ConteudoDidaticoServiceTests` e `Integration/CursosControllerIntegrationTests`). Para cada uso, dizer se muda ou não com este fluxo.
2. Rodar `dotnet test` e, no frontend, `npm test` **antes** de mudar qualquer coisa, e guardar o resultado como linha de base. Falhas que já existirem não são desta tarefa, mas precisam ser listadas.
3. Se encontrar uma regra que conflita com as decisões do usuário e não está nesta lista de riscos, **parar e relatar** antes de implementar. Não inventar regra de negócio.

### A. Backend: concluir e encerrar também no Gratuito
1. `ConcluirCursoComoProfessorAsync` e `EncerrarCursoAsync` passam a aceitar **Gratuito** além de Acompanhado. As outras validações ficam: professor vinculado, coordenador do curso, já concluído, já encerrado. `ReabrirCursoAsync` acompanha.
2. A **emissão automática de certificados no encerramento continua só no Acompanhado**. No Gratuito, o aluno segue pedindo o certificado como hoje.
3. **Gratuito encerrado:**
   - não aceita matrícula nova ("começar grátis"): erro claro no `MatriculaService`;
   - bloqueia alteração de conteúdo e avaliação, estendendo `GarantirCursoAbertoAsync` ao Gratuito encerrado;
   - **quem já estava matriculado mantém o acesso.**
4. Ao encerrar, **notificar todos os Admins** com um tipo novo no enum, `TipoNotificacao.CursoEncerrado`, valor 6. Mensagem com o nome do curso e quem encerrou. Ao clicar, abre o curso.

### B. Backend: pacote e venda
1. Campo novo em `Curso`: `PublicadoParaVendaEm` (`DateTime?`). "À venda" = `ModeloCurso == PagoPacote && PublicadoParaVendaEm != null`. Migration EF.
   - **Na migration, todo curso PagoPacote que já existe recebe `PublicadoParaVendaEm = agora`**, para a home atual não perder nenhum curso.
2. Rotas novas, só Admin:
   - `PUT /Cursos/{id}/pacote` com `{ preco, descricao }`: transforma em pacote. Só aceita **Gratuito encerrado** ou um curso que já é PagoPacote (para editar o preço). Exige `preco > 0`. Muda `ModeloCurso` para `PagoPacote`, atualiza `Preco` e `Descricao` e **não publica**. Matrículas existentes ficam como estão.
   - `POST /Cursos/{id}/venda/publicar`: exige PagoPacote com preço; preenche `PublicadoParaVendaEm`.
   - `POST /Cursos/{id}/venda/despublicar`: limpa `PublicadoParaVendaEm`.
3. O DTO de resposta do curso passa a expor `publicadoParaVendaEm`, que já é público na listagem. `EncerradoEm` e `ConcluidoPeloProfessorEm` continuam como histórico.
4. A compra (`POST /Matriculas/comprar`) de um PagoPacote só aceita curso **à venda**.
5. **Acesso preservado de quem entrou de graça (resolve o risco 1):** a regra de acesso deixa de olhar o preço **atual** do curso e passa a olhar o valor **da matrícula**.
   - Recomendação: campo novo `Matricula.ValorNaMatricula` (`decimal`), gravado quando a matrícula é criada, seja compra, começo grátis ou cadastro com curso, com o preço do curso naquele momento.
   - A migration preenche as matrículas existentes com o `Preco` atual do curso de cada uma.
   - Nova regra de acesso: matrícula aprovada **e** (`ValorNaMatricula <= 0` **ou** pagamento confirmado).
   - Centralizar a regra num único lugar (por exemplo, `AcessoAcademicoService` ou uma expressão reaproveitável nas consultas EF) e usá-la nos 5 pontos do risco 1, em vez de repetir a condição.
   - **Não** criar pagamentos falsos de R$ 0 para os alunos antigos: isso sujaria os relatórios de receita.
   - Se o agente encontrar motivo técnico para outra solução, relatar antes de implementar.

### C. Frontend: catálogo público
`isCursoVisivelNoCatalogoPublico` passa a mostrar:
- **Gratuito** não encerrado;
- **Acompanhado** não encerrado, como hoje;
- **PagoPacote** com `publicadoParaVendaEm`.

Some da home: Gratuito encerrado, Acompanhado encerrado e PagoPacote fora da venda. Aplicar a mesma regra no mobile (`CatalogoScreen.jsx` ≈ linha 41), de preferência numa função compartilhada em cada app.

### D. Frontend: Professor e Coordenador
1. **Professor:** botão **"Concluir curso"** para curso Gratuito e Acompanhado em que ele está vinculado, no topo da tela de Conteúdos do curso, perto de "Novo módulo".
   - Abre uma confirmação: "O coordenador será avisado para encerrar".
   - Chama `POST /Cursos/{id}/concluir`.
   - Depois de concluído, o botão vira um selo "Concluído, aguardando o coordenador".
2. **Coordenador** (`PainelCursoGestao.jsx`): Encerrar, Reabrir e o status (≈ linhas 252–264) passam a valer para **Gratuito** também. Trocar `ehAcompanhado` por "Gratuito ou Acompanhado".

### E. Frontend: Admin
1. **Dashboard do Admin** (`DashboardAdmin.jsx`): card "**N cursos encerrados aguardando você**" (Gratuito encerrado e ainda não pacote), com botão que abre Cursos na aba Encerrados. O card só aparece com N > 0. Ver `parte1-aviso-dashboard.png`.
2. **Tela Cursos** (`SecaoCursos.jsx`, **só para o Admin**; o Coordenador continua com a lista atual): abas com contagem. Ver `parte2-abas-cursos.png`.

   | Aba | Regra |
   |---|---|
   | **Em andamento** | Não encerrado e não PagoPacote, ou seja, Gratuito/Acompanhado ativos |
   | **Encerrados** | Com `encerradoEm`, ainda Gratuito ou Acompanhado |
   | **À venda** | PagoPacote com `publicadoParaVendaEm` |
   | **Fora da venda** | PagoPacote sem `publicadoParaVendaEm` |

   - Etiqueta do modelo em cada card: "Grátis", "Pago" ou "Acompanhado".
   - Filtro "Todos os modelos" ao lado da busca. O filtro por coordenador continua.
   - Na aba Encerrados, os cards de **Gratuito** têm o botão **"Preparar para venda"**. O clique no botão não abre o curso. O Acompanhado encerrado aparece sem esse botão.
3. **Janela "Preparar para venda"** (`Modal`), ver `parte3-janela-preparar-venda.png`:
   - à esquerda: preço (obrigatório, maior que 0), descrição de venda (é a descrição do curso, que aparece na home), "Trocar capa" (usa `POST /Cursos/{id}/imagem`) e o aviso "Quem já estava matriculado de graça continua com acesso.";
   - à direita: **prévia do card da home**, reaproveitando o componente de card do catálogo público e atualizando enquanto digita;
   - rodapé: "Cancelar", **"Salvar sem publicar"** (só `PUT /pacote`; o curso vai para Fora da venda) e **"Colocar à venda"** (`PUT /pacote` e depois `POST /venda/publicar`; o curso vai para À venda).
   - Também abrir pela tela do curso (`PainelCursoGestao.jsx`) para o Admin, quando o curso for Gratuito encerrado. Em PagoPacote, mostrar "Colocar à venda" ou "Tirar da venda" e "Editar preço".
4. Toasts de sucesso e erro, como no resto do app.

### F. Não alterar
- A emissão de certificados do Acompanhado e as matrículas e o progresso de quem já está no curso.
- O fluxo de compra do aluno, exceto a regra "só compra o que está à venda".
- A tela do Coordenador na lista de cursos.
- O prompt pendente `docs/permissoes/PROMPT-agente-ajuste-responsabilidades-perfis.md`: criar curso só Admin e Professores só Admin. Se ele já tiver sido aplicado, não desfazer.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, com um curso **Gratuito** com professor e coordenador vinculados e um aluno matriculado:

1. **Professor:** "Concluir curso", confirma, e o coordenador recebe a notificação. O botão vira "aguardando o coordenador".
2. **Coordenador:** na tela do curso, "Encerrar". Todos os Admins recebem a notificação "Curso encerrado".
3. **Curso encerrado:**
   - some da home e do catálogo do aluno, no web e no mobile;
   - um aluno novo não consegue começar;
   - o aluno já matriculado continua acessando;
   - o professor não consegue mais editar o conteúdo.
4. **Admin, Dashboard:** o card mostra "1 curso encerrado aguardando você" e leva para Cursos › Encerrados.
5. **Admin, aba Encerrados:** o curso aparece com a etiqueta "Grátis" e o botão "Preparar para venda".
6. **Preparar para venda:**
   - preço 29,90, a prévia atualiza, "Salvar sem publicar": o curso vai para **Fora da venda** como "Pago" e não aparece na home;
   - depois, "Colocar à venda": vai para **À venda** e aparece na home com "Comprar";
   - o aluno antigo continua com acesso sem pagar, e um aluno novo compra normalmente;
   - "Tirar da venda" volta o curso para Fora da venda e tira da home.
7. Os cursos Pagos que já existiam continuam na home depois da migration, na aba À venda.
8. O Acompanhado continua igual: concluir, encerrar com certificados automáticos e fora da home quando encerrado.
9. **Regressão, conferir com dados reais:**
   - o aluno que entrou de graça, depois da conversão para pacote e da publicação, **continua vendo** módulos e conteúdos, marcando conteúdo concluído, respondendo avaliações e pedindo o certificado;
   - o aluno novo de um pacote **sem** pagamento confirmado **não** acessa; com pagamento confirmado, acessa;
   - um curso Pago que já existia antes da mudança: quem pagou continua com acesso, e um pagamento pendente continua bloqueando;
   - um curso Gratuito comum, nunca encerrado: matrícula, acesso e certificado como hoje;
   - a mesma conferência no app mobile (catálogo, compra e conteúdos);
   - o resultado final de `dotnet test` e `npm test` comparado com a linha de base do passo 0.
10. Testes:
   - backend: concluir e encerrar o Gratuito; notificação aos Admins; bloqueio de matrícula nova; `PUT /pacote` só em Gratuito encerrado ou Pago; publicar e despublicar; compra só à venda; migration (Pagos publicados e `ValorNaMatricula` preenchido); **a regra de acesso pelo valor da matrícula** (antigo grátis mantém acesso, novo sem pagamento não acessa);
   - frontend: as regras das abas, a regra do catálogo e a janela.
   - `dotnet test`, e no frontend `npm run lint` e `npm test`, sem erros novos.

Depois de aplicado, avisar o agente de arquitetura para atualizar a planilha de permissões e os diagramas (casos de uso de Admin, Coordenador e Professor; sequência de encerramento e venda).

---

## Adendo — revisão do plano de execução (2026-11-12)

O plano em 8 rounds do agente de código foi **aprovado com os ajustes abaixo**, que valem sobre o plano.

1. **Pacote continua travado (decisão do usuário).** Depois que o Gratuito encerrado vira PagoPacote, o conteúdo **continua congelado**: professor não edita conteúdo, quiz nem avaliação.
   - **Separar os dois usos de `GarantirCursoAbertoAsync`:**
     - **edição de conteúdo e avaliação:** bloqueia sempre que `EncerradoEm != null`, em qualquer modelo. Isso inclui o pacote convertido;
     - **matrícula nova:** bloqueia só Gratuito e Acompanhado encerrados. O pacote convertido e **à venda** aceita compra normalmente.

     Hoje o mesmo guard faz as duas coisas. Com a regra do plano (`(Acompanhado || Gratuito) && EncerradoEm`), o pacote ficaria editável; com "`EncerradoEm` sempre", ninguém conseguiria comprar.
   - **Caminho para editar um pacote:** o Admin tira da venda, e o Coordenador reabre. `ReabrirCursoAsync` e `EncerrarCursoAsync` passam a aceitar também o **PagoPacote fora da venda que veio do fluxo** (com `ConcluidoPeloProfessorEm` preenchido). Ao reencerrar, não exige nova conclusão do professor: a conclusão já está registrada.
   - **Publicar** (`POST /venda/publicar`) um pacote que veio do fluxo exige `EncerradoEm != null`, ou seja, travado. Os Pagos criados direto como pacote continuam sem essa exigência.
   - **Testes:** pacote convertido bloqueia a edição de conteúdo; aceita compra quando à venda; reabrir só com o pacote fora da venda; publicar exige encerrado.
2. **Catálogo:** a regra nova **continua mostrando o Acompanhado não encerrado**. O texto do Round 4 do plano lista só "Gratuito não encerrado e PagoPacote à venda"; não perder o Acompanhado ativo.
3. **Notificação aos Admins:** o link deve abrir **o curso** (`/app/cursos/{id}`), não só a lista `/app/cursos`, como diz a tarefa A.4 do prompt.
4. **Compatibilidade com o prompt da Home pública** (`docs/home-publica/PROMPT-agente-home-publica.md`, ainda não aplicado). Ele também mexe no `Curso` (`EmDestaque`, `DestaqueEm`, `PUT /Cursos/{id}/destaque`) e cria a página pública `/cursos`.
   - As **migrations saem em sequência**, sem mexer na migration do outro.
   - A home, a vitrine de destaques, `/cursos` e o catálogo do aluno no web e no mobile usam **a mesma regra** de visibilidade (`shared/catalogoVisibilidade.js`, como o plano propõe no Round 7).
   - **Curso destacado que deixar de ser visível** (encerrado ou fora da venda) não aparece na vitrine. O Admin não consegue destacar curso não visível.
   - Se a Home pública já tiver sido aplicada quando este prompt for executado, integrar com ela. Se não, deixar a função de visibilidade pronta para ela reaproveitar.
5. **Itens do plano confirmados, sem mudança:**
   - extrair `MatriculaTemAcessoLiberado` e manter os 3 predicados IQueryable duplicados, com comentário;
   - certificado automático só no Acompanhado;
   - `CriarPagamentoPendenteSeNecessarioAsync` lendo `ValorNaMatricula`;
   - `CartaoCursoPublico.jsx`;
   - correção do "Total" no mobile;
   - rotas demo;
   - baseline de 304 testes no backend e 170 no frontend, no commit 648ac05.

---

## Adendo 2 — revisão do plano revisado (2026-11-12)

O plano revisado (8 rounds, com o Adendo 1) foi **aprovado**. Faltam 2 correções, ambas sobre o "pacote travado":

1. **Reabrir um pacote só quando estiver fora da venda.** O plano diz que `ReabrirCursoAsync` funciona para PagoPacote "sem nenhuma mudança", porque o método só confere a posse e `EncerradoEm`. Mas assim o Coordenador poderia reabrir, e o Professor editar, um pacote **que está à venda**, mudando o que os alunos estão comprando.
   - Regra: se `ModeloCurso == PagoPacote` e `PublicadoParaVendaEm != null`, **recusar** a reabertura com a mensagem "Tire o curso da venda antes de reabrir" (só o Admin tira da venda).
   - No `PainelCursoGestao.jsx`, o botão Reabrir do Coordenador fica desabilitado nesse caso, com a mesma explicação.
   - Teste: reabrir um pacote à venda falha; fora da venda, funciona.
   - Também ficou implícito que `EncerrarCursoAsync` aceita `PagoPacote && ConcluidoPeloProfessorEm` (Adendo 1 e achado 10). Ele precisa estar na lista de mudanças do **Round 1** ou do **Round 3**, não só no texto dos achados.
2. **A trava de edição precisa cobrir todas as alterações de conteúdo, não só criar e editar.** Hoje `GarantirCursoAberto…` só é chamado em 5 métodos. As alterações abaixo **não passam pela trava**, e o pacote convertido continuaria alterável por elas (o mesmo vale hoje para o Acompanhado encerrado):
   - `ConteudoDidaticoService.ExcluirConteudoAsync`;
   - `AvaliacaoService.ExcluirAvaliacaoAsync`;
   - questões da avaliação: `AdicionarQuestaoAsync`, `AdicionarQuestoesEmLoteAsync`, `AtualizarQuestaoAsync`, `ReordenarQuestoesAsync` e `ExcluirQuestaoAsync`;
   - geração com IA: `GerarQuestoesComIaAsync` e `GerarQuestoesComIaDeConteudoAsync` (gravam questões na avaliação);
   - módulos: `ModuloService.CriarModuloAsync`, `AtualizarModuloAsync` e `ExcluirModuloAsync`. Atenção ao prompt `docs/permissoes/PROMPT-agente-ajuste-responsabilidades-perfis.md`, que dá ao Professor editar e excluir módulo.

   Incluir `GarantirCursoAbertoParaEdicaoAsync` em todos esses pontos, no Round 1 (separação dos guards). Os anexos do banco de questões (`AdicionarAnexoQuestaoAsync` e `RemoverAnexoQuestaoAsync`) pertencem ao banco do professor, não ao curso: ficam de fora.

   Testes: com o curso encerrado (Gratuito, Acompanhado e pacote convertido), cada uma dessas operações é recusada; depois de reabrir, volta a funcionar.

   No frontend, os botões dessas ações no curso travado podem continuar visíveis, porque o erro do backend aparece como toast. Se for simples, desabilitá-los com a dica "Curso encerrado: peça ao coordenador para reabrir".
