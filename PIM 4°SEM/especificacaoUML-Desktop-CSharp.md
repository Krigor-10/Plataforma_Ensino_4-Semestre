# Especificação UML — PlataformaEnsino (para Astah)

Base real: modelo de domínio do backend C# (`Models/`), extraído diretamente do código em 2026-09-22.
Notação: `+` público, `-` privado, `#` protegido. `{readOnly}` = setter privado (só muda via método de negócio, não por atribuição direta — é o encapsulamento real usado no projeto).

---

## 1. Diagrama de Classes — Hierarquia de Usuários (POO: abstração/herança)

Este é o exemplo mais forte de POO do projeto: `Usuario` é uma classe abstrata; os 4 papéis herdam dela e sobrescrevem `ExibirDados()`.

### Classe abstrata `Usuario` «abstract»

**Atributos:**
```
+ id : int
+ nome : string
+ email : string
+ cpf : string
+ telefone : string
+ cep : string
+ rua : string
+ numero : string
+ bairro : string
+ cidade : string
+ estado : string
+ tipoUsuario : string {readOnly}
+ dataCadastro : DateTime {readOnly}
- senhaHash : string
+ ativo : bool {readOnly}
- tokenRecuperacaoSenhaHash : string
- tokenRecuperacaoSenhaExpiraEm : DateTime
```

**Métodos:**
```
+ AlterarDados(nome, email, telefone, cep, rua, numero, bairro, cidade, estado) : void
+ ConfigurarAcesso(tipoUsuario : string, senhaHash : string, ativo : bool) : void
+ AtualizarSenhaHash(senhaHash : string) : void
+ DefinirTokenRecuperacaoSenha(tokenHash : string, expiraEm : DateTime) : void
+ LimparTokenRecuperacaoSenha() : void
+ Ativar() : void
+ Desativar() : void
+ ExibirDados() : string «virtual»
```

### Subclasses (generalização — seta vazada apontando para `Usuario`)

**`Aluno`**
```
+ matricula : string
+ ExibirDados() : string «override»
```

**`Professor`**
```
+ codigoRegistro : string
+ especialidade : string
+ ExibirDados() : string «override»
```

**`Coordenador`**
```
+ codigoRegistro : string
+ ExibirDados() : string «override»
```

**`Admin`**
```
+ ExibirDados() : string «override»
```

### Relacionamentos desta seção
```
Aluno, Professor, Coordenador, Admin  ──▷ (generalização)  Usuario
Usuario  "1" ── "0..*"  FeedbackAcademico   : recebe (destinatário)
Usuario  "1" ── "0..*"  FeedbackAcademico   : envia (autor)
Usuario  "1" ── "0..*"  Notificacao
```

---

## 2. Diagrama de Classes — Cursos e Estrutura Pedagógica

### `Curso`
```
+ id : int
+ codigoRegistro : string
+ titulo : string
+ descricao : string
+ preco : decimal
+ ehGratuito : bool {readOnly, derivado de preco}
+ imagemUrl : string
+ coordenadorId : int
+ criadoPor : int
--
+ AtribuirCoordenador(coordenador : Coordenador) : void
+ RemoverCoordenador() : void
+ AdicionarModulo(modulo : Modulo) : void
```

### `Modulo`
```
+ id : int
+ codigoRegistro : string
+ titulo : string
+ dataCriacao : DateTime
+ cursoId : int
--
+ AlterarTitulo(novoTitulo : string) : void
```

### `Turma`
```
+ id : int
+ codigoRegistro : string
+ nomeTurma : string
+ dataCriacao : DateTime
+ cursoId : int
+ professorId : int
--
+ DefinirProfessor(professor : Professor) : void
```

### `ConteudoDidatico`
```
+ id : int
+ titulo : string
+ descricao : string
+ tipoConteudo : TipoConteudoDidatico «enum»
+ corpoTexto : string
+ arquivoUrl : string
+ linkUrl : string
+ professorAutorId : int {readOnly}
+ turmaId : int
+ moduloId : int
+ statusPublicacao : StatusPublicacao «enum» {readOnly}
+ ordemExibicao : int
+ pesoProgresso : decimal
+ publicadoEm : DateTime {readOnly}
+ criadoEm : DateTime {readOnly}
+ atualizadoEm : DateTime {readOnly}
--
+ DefinirProfessorAutor(professorAutorId : int) : void
+ RegistrarCriacao(criadoEm : DateTime) : void
+ MarcarAtualizacao(atualizadoEm : DateTime) : void
+ DefinirStatusPublicacao(status : StatusPublicacao, referencia : DateTime) : void
```

### `Matricula`
```
+ id : int
+ codigoRegistro : string
+ dataSolicitacao : DateTime {readOnly}
+ notaFinal : decimal {readOnly}
+ status : StatusMatricula «enum» {readOnly}
+ certificadoEmitidoEm : DateTime {readOnly}
+ alunoId : int
+ cursoId : int
+ turmaId : int {readOnly}
--
+ RegistrarSolicitacao(dataSolicitacao : DateTime) : void
+ VincularTurma(turmaId : int) : void
+ AprovarComTurma(turmaId : int, cursoId : int) : void
+ Aprovar() : void
+ Rejeitar() : void
+ Cancelar() : void
+ Reabrir() : void
+ LancarNotaFinal(nota : decimal) : void
+ ZerarNotaFinal() : void
+ EmitirCertificado(emitidoEm : DateTime) : void
```

### `Pagamento`
```
+ id : int
+ matriculaId : int
+ valor : decimal {readOnly}
+ status : StatusPagamento «enum» {readOnly}
+ criadoEm : DateTime {readOnly}
+ pagoEm : DateTime {readOnly}
--
+ CriarPendente(matriculaId : int, valor : decimal) : Pagamento «static»
+ ConfirmarPagamento(pagoEm : DateTime) : void
+ Cancelar() : void
```

### `Notificacao`
```
+ id : int
+ usuarioId : int
+ titulo : string
+ mensagem : string
+ tipo : TipoNotificacao «enum»
+ link : string
+ lida : bool {readOnly}
+ criadoEm : DateTime {readOnly}
+ lidaEm : DateTime {readOnly}
--
+ Criar(usuarioId, titulo, mensagem, tipo, link) : Notificacao «static»
+ MarcarComoLida(agora : DateTime) : void
```

### `FeedbackAcademico`
```
+ id : int
+ destinatarioId : int
+ autorId : int
+ origem : string
+ mensagem : string
+ criadoEm : DateTime {readOnly}
+ lido : bool {readOnly}
--
+ RegistrarCriacao(criadoEm : DateTime) : void
+ MarcarComoLido() : void
```

### Relacionamentos desta seção
```
Curso        "1" ──● "0..*"  Modulo                (composição — módulo não existe sem curso)
Curso        "1" ──● "0..*"  Turma                 (composição)
Curso        "1" ── "0..*"  Matricula
Curso        "0..1" ── "0..*"  Coordenador          (Curso.coordenadorId)
Usuario      "1" ── "0..*"  Curso : criador         (Curso.criadoPor — Admin ou Coordenador)

Modulo       "1" ──● "0..*"  ConteudoDidatico       (composição)
Modulo       "1" ── "0..*"  Avaliacao

Turma        "*" ── "1"  Curso
Turma        "*" ── "1"  Professor
Turma        "1" ── "0..*"  Matricula
Turma        "1" ── "0..*"  ConteudoDidatico
Turma        "1" ── "0..*"  Avaliacao

ConteudoDidatico  "*" ── "1"  Professor : autor
ConteudoDidatico  "*" ── "1"  Turma
ConteudoDidatico  "*" ── "1"  Modulo

Matricula    "*" ── "1"  Aluno
Matricula    "*" ── "1"  Curso
Matricula    "*" ── "0..1"  Turma
Matricula    "1" ── "0..*"  Pagamento

Notificacao  "*" ── "1"  Usuario
FeedbackAcademico  "*" ── "1"  Usuario : destinatário
FeedbackAcademico  "*" ── "0..1"  Usuario : autor
```

---

## 3. Diagrama de Classes — Sistema de Avaliação

Padrão importante pra explicar na apresentação: **banco de questões (`QuestaoBanco`) vs. snapshot publicado (`QuestaoPublicada`)** — quando uma avaliação é publicada, a questão é *copiada* (snapshot) pra não mudar retroativamente se o professor editar o banco depois.

### `QuestaoBanco`
```
+ id : int
+ professorAutorId : int
+ tituloInterno : string
+ contexto : string
+ enunciado : string
+ tipoQuestao : TipoQuestao «enum»
+ tema : string
+ subtema : string
+ dificuldade : byte  (1..5)
+ explicacaoPosResposta : string
+ ativa : bool
+ criadoEm : DateTime
+ atualizadoEm : DateTime
```

### `AlternativaQuestaoBanco`
```
+ id : int
+ questaoBancoId : int
+ letra : string
+ texto : string
+ ehCorreta : bool
+ justificativa : string
+ ordem : int
```

### `AnexoQuestaoBanco`
```
+ id : int
+ questaoBancoId : int
+ titulo : string
+ tipoAnexo : string
+ arquivoUrl : string
+ ordem : int
```

### `Avaliacao`
```
+ id : int
+ titulo : string
+ descricao : string
+ professorAutorId : int {readOnly}
+ turmaId : int
+ moduloId : int
+ conteudoDidaticoId : int
+ tipoAvaliacao : TipoAvaliacao «enum»
+ statusPublicacao : StatusPublicacao «enum» {readOnly}
+ dataAbertura : DateTime
+ dataFechamento : DateTime
+ tentativasPermitidas : int {readOnly}
+ tempoLimiteMinutos : int
+ notaMaxima : decimal
+ pesoNota : decimal
+ pesoProgresso : decimal
+ publicadoEm : DateTime {readOnly}
+ criadoEm : DateTime {readOnly}
+ atualizadoEm : DateTime {readOnly}
--
+ DefinirAutor(professorAutorId : int) : void
+ DefinirTentativasPermitidas(qtd : int) : void
+ Publicar(publicadoEm : DateTime) : void
+ Arquivar(atualizadoEm : DateTime) : void
+ VoltarParaRascunho(atualizadoEm : DateTime) : void
+ MarcarAtualizacao(atualizadoEm : DateTime) : void
```

### `QuestaoPublicada`
```
+ id : int
+ avaliacaoId : int
+ questaoBancoId : int
+ ordem : int
+ contextoSnapshot : string
+ enunciadoSnapshot : string
+ tipoQuestao : TipoQuestao «enum»
+ explicacaoSnapshot : string
+ pontos : decimal
```

### `AlternativaQuestaoPublicada`
```
+ id : int
+ questaoPublicadaId : int
+ letra : string
+ texto : string
+ ehCorreta : bool
+ justificativaSnapshot : string
+ ordem : int
```

### `TentativaAvaliacao`
```
+ id : int
+ avaliacaoId : int
+ matriculaId : int
+ numeroTentativa : int {readOnly}
+ statusTentativa : StatusTentativaAvaliacao «enum» {readOnly}
+ iniciadaEm : DateTime {readOnly}
+ enviadaEm : DateTime {readOnly}
+ corrigidaEm : DateTime {readOnly}
+ notaBruta : decimal {readOnly}
--
+ Iniciar(numeroTentativa : int, iniciadaEm : DateTime) : void
+ MarcarEnvio(enviadaEm : DateTime) : void
+ MarcarCorrecao(notaBruta : decimal, corrigidaEm : DateTime) : void
+ Expirar() : void
```

### `RespostaAluno`
```
+ id : int
+ tentativaAvaliacaoId : int
+ questaoPublicadaId : int
+ alternativaQuestaoPublicadaId : int
+ respostaTexto : string
+ correta : bool {readOnly}
+ pontosObtidos : decimal {readOnly}
+ respondidaEm : DateTime {readOnly}
--
+ RegistrarEnvio(respondidaEm : DateTime) : void
+ Corrigir(correta : bool, pontosObtidos : decimal) : void
```

### `LancamentoNotaAluno`
```
+ id : int
+ matriculaId : int
+ avaliacaoId : int
+ moduloId : int
+ tentativaAvaliacaoId : int
+ professorResponsavelId : int
+ notaOficial : decimal {readOnly}
+ pesoNota : decimal {readOnly}
+ origemCorrecao : OrigemCorrecaoNota «enum» {readOnly}
+ liberadaAoAlunoEm : DateTime {readOnly}
+ feedbackProfessor : string
+ criadoEm : DateTime {readOnly}
+ atualizadoEm : DateTime {readOnly}
--
+ RegistrarCorrecao(notaOficial : decimal, pesoNota : decimal, origem : OrigemCorrecaoNota) : void
+ LiberarAoAluno(liberadaAoAlunoEm : DateTime) : void
+ MarcarAtualizacao(atualizadoEm : DateTime) : void
```

### Relacionamentos desta seção
```
QuestaoBanco  "*" ── "1"  Professor : autor
QuestaoBanco  "1" ──● "0..*"  AlternativaQuestaoBanco   (composição)
QuestaoBanco  "1" ──● "0..*"  AnexoQuestaoBanco          (composição)
QuestaoBanco  "1" ── "0..*"  QuestaoPublicada             (origem do snapshot)

Avaliacao     "*" ── "1"  Professor : autor
Avaliacao     "*" ── "1"  Turma
Avaliacao     "*" ── "0..1"  Modulo
Avaliacao     "*" ── "0..1"  ConteudoDidatico
Avaliacao     "1" ──● "0..*"  QuestaoPublicada           (composição)
Avaliacao     "1" ── "0..*"  TentativaAvaliacao
Avaliacao     "1" ── "0..*"  LancamentoNotaAluno

QuestaoPublicada  "*" ── "1"  Avaliacao
QuestaoPublicada  "1" ──● "0..*"  AlternativaQuestaoPublicada  (composição)
QuestaoPublicada  "1" ── "0..*"  RespostaAluno

TentativaAvaliacao  "*" ── "1"  Avaliacao
TentativaAvaliacao  "*" ── "1"  Matricula
TentativaAvaliacao  "1" ──● "0..*"  RespostaAluno          (composição)

RespostaAluno  "*" ── "1"  TentativaAvaliacao
RespostaAluno  "*" ── "1"  QuestaoPublicada
RespostaAluno  "*" ── "0..1"  AlternativaQuestaoPublicada

LancamentoNotaAluno  "*" ── "1"  Matricula
LancamentoNotaAluno  "*" ── "1"  Avaliacao
LancamentoNotaAluno  "*" ── "0..1"  Modulo
LancamentoNotaAluno  "*" ── "0..1"  TentativaAvaliacao
LancamentoNotaAluno  "*" ── "0..1"  Professor : responsável
```

**Enums usados nesta seção:** `TipoQuestao {MultiplaEscolha, VerdadeiroFalso, Dissertativa}`, `TipoAvaliacao {Quiz, Prova, Exercicio}`, `StatusTentativaAvaliacao {EmAndamento, Enviada, Corrigida, Expirada}`, `OrigemCorrecaoNota {Automatica, Manual, Mista}`, `StatusPublicacao {Rascunho, Publicado, Arquivado}`.

---

## 4. Diagrama de Classes — Progresso do Aluno

Três "classes de associação" (Matrícula × entidade pedagógica) que guardam o progresso calculado em cada granularidade.

```
ProgressoConteudoAluno
+ id : int
+ matriculaId : int
+ conteudoDidaticoId : int
+ moduloId : int
+ statusProgresso : StatusProgressoAprendizagem «enum»
+ percentualConclusao : decimal
+ primeiroAcessoEm : DateTime
+ ultimoAcessoEm : DateTime
+ concluidoEm : DateTime

ProgressoModuloAluno
+ id : int
+ matriculaId : int
+ moduloId : int
+ statusProgresso : StatusProgressoAprendizagem «enum»
+ percentualConclusao : decimal
+ pesoConcluido : decimal
+ pesoTotal : decimal
+ conteudosConcluidos : int
+ totalConteudos : int
+ avaliacoesConcluidas : int
+ totalAvaliacoes : int
+ mediaModulo : decimal
+ atualizadoEm : DateTime

ProgressoCursoAluno
+ id : int
+ matriculaId : int
+ cursoId : int
+ statusProgresso : StatusProgressoAprendizagem «enum»
+ percentualConclusao : decimal
+ pesoConcluido : decimal
+ pesoTotal : decimal
+ modulosConcluidos : int
+ totalModulos : int
+ mediaCurso : decimal
+ atualizadoEm : DateTime
```

### Relacionamentos
```
ProgressoConteudoAluno  "*" ── "1"  Matricula
ProgressoConteudoAluno  "*" ── "1"  ConteudoDidatico
ProgressoConteudoAluno  "*" ── "1"  Modulo

ProgressoModuloAluno  "*" ── "1"  Matricula
ProgressoModuloAluno  "*" ── "1"  Modulo

ProgressoCursoAluno  "*" ── "1"  Matricula
ProgressoCursoAluno  "*" ── "1"  Curso
```

---

## 5. Diagrama de Arquitetura em Camadas (Package Diagram)

Mostra a "organização em camadas" e "modularização" pedidas pela matéria. O padrão se repete pra todo domínio (Curso, Avaliação, Usuário etc.) — mostre uma fatia vertical como exemplo (`Curso`) e explique que o mesmo desenho vale pros demais.

```
┌──────────────────────────────────────────────┐
│  Controllers  (HTTP)                          │
│  CursosController                             │
│    - depende de → ICursoService (interface)   │
└───────────────────┬────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────┐
│  Services  (regra de negócio)                  │
│  CursoService : ICursoService                  │
│    - depende de → ICursoRepository (interface) │
└───────────────────┬────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────┐
│  Repositories  (acesso a dados)                │
│  GenericRepository<T> ──▷ IRepository<T>       │
│    - usa → PlataformaContext (EF Core)         │
└───────────────────┬────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────┐
│  Models  (entidades de domínio)                │
│  Curso, Modulo, Turma, Matricula, ...          │
└──────────────────────────────────────────────────┘

Pacotes transversais:
  DTOs        → contratos de entrada/saída (não expõem entidade direto)
  Interfaces  → contratos de todos os Services/Repositories (injeção de dependência)
  Common      → ApiExceptionMiddleware (tratamento global de erro)
```

**Por que isso é modularização real (não só pastas):** cada camada só conhece a **interface** da camada de baixo (`ICursoService`, `ICursoRepository`), nunca a implementação concreta — trocar `CursoRepository` por outro banco não muda `CursoService` nem `CursosController`. Isso é Inversão de Dependência (o "D" do SOLID), registrado via injeção de dependência no `Program.cs`.

No Astah, represente como **diagrama de pacotes** com dependências (`<<import>>` ou setas tracejadas) entre `Controllers → Interfaces → Services → Interfaces → Repositories → Models`.

---

## 6. Diagrama de Componentes — Alinhamento Web / Mobile / Desktop

Esse é o diagrama que responde diretamente "definir a arquitetura da solução em alinhamento com Web e Mobile":

```
┌───────────────┐   ┌───────────────┐   ┌─────────────────────┐
│  Web (React)   │   │  Mobile (RN)   │   │  Desktop (Electron)  │
│  :5173         │   │  Expo, :8081   │   │  janela nativa        │
└───────┬────────┘   └───────┬────────┘   └──────────┬────────────┘
        │  HTTP/JSON          │  HTTP/JSON             │  HTTP/JSON
        │  (Authorization:    │  (Authorization:       │  (mesma SPA
        │   Bearer <JWT>)     │   Bearer <JWT>)        │   web embutida)
        └──────────┬──────────┴───────────┬────────────┘
                    ▼                      ▼
         ┌────────────────────────────────────┐
         │   Gateway (Node/Express) :4000       │
         │   Reverse proxy — sem lógica própria │
         │   Repassa /api/* e /uploads/*        │
         └──────────────────┬────────────────────┘
                             ▼
         ┌────────────────────────────────────┐
         │   API .NET (ASP.NET Core) :5000      │
         │   Controllers → Services →            │
         │   Repositories (EF Core)             │
         └──────────────────┬────────────────────┘
                             ▼
                  ┌────────────────────┐
                  │  SQL Server (LocalDB)│
                  └────────────────────┘
```

**Ponto-chave pra falar na apresentação:** Web, Mobile e Desktop são **três clientes diferentes do mesmo backend C#** — nenhum duplica regra de negócio; o Gateway existe só pra dar um ponto de entrada único, sem lógica própria. Isso é exatamente "arquitetura em alinhamento" — um único domínio (camada de Services/Models em C#) servindo três interfaces.

No Astah: **diagrama de componentes** com os componentes acima e conectores rotulados com o protocolo (HTTP/JSON + JWT).

---

## 7. Diagrama de Casos de Uso

Os casos de uso são os mesmos independentemente do cliente (Web/Mobile/Desktop) — o que muda é só a interface. Bom argumento pra "alinhamento com Web e Mobile".

### Ator: Aluno
```
- Fazer login / Logout
- Recuperar senha esquecida
- Consultar catálogo de cursos
- Matricular-se em curso                 «include» Efetuar pagamento (curso pago)
- Acompanhar progresso (curso/módulo/conteúdo)
- Acessar conteúdo didático
- Responder avaliação (quiz/prova/exercício)
- Consultar notas e feedback do professor
- Emitir certificado de conclusão
- Consultar notificações
- Editar perfil
```

### Ator: Professor
```
- Fazer login / Logout
- Gerenciar banco de questões (criar, editar, anexar arquivo)
- Criar e publicar conteúdo didático
- Criar avaliação a partir do banco de questões    «include» Publicar avaliação
- Corrigir tentativa de avaliação (dissertativas)
- Lançar e liberar nota ao aluno
- Registrar feedback acadêmico sobre aluno
- Visualizar desempenho da turma
```

### Ator: Coordenador
```
- Fazer login / Logout
- Gerenciar cursos (criar, editar, vincular a si)
- Gerenciar módulos e turmas
- Aprovar / rejeitar matrícula pendente
- Visualizar desempenho de cursos e turmas
- Exportar relatório de desempenho (Excel)
```

### Ator: Admin
```
- Fazer login / Logout
- Gerenciar usuários (Aluno, Professor, Coordenador, Admin)
- Gerenciar cursos e turmas (nível plataforma)
- Consultar histórico completo de matrículas
```

### Ator: Visitante (não autenticado)
```
- Cadastrar-se na plataforma
- Verificar autenticidade de certificado (código público)
```

### Relações entre casos de uso
```
"Matricular-se em curso"      «include»  "Efetuar pagamento"        (só se curso pago)
"Criar avaliação"             «include»  "Selecionar questões do banco"
"Responder avaliação"         «include»  "Iniciar tentativa"
"Corrigir tentativa"          «extend»   "Liberar nota ao aluno"
```

---

## Resumo — o que levar pro Astah

| Diagrama Astah | Seções deste doc |
|---|---|
| Class Diagram — Usuários | Seção 1 |
| Class Diagram — Cursos | Seção 2 |
| Class Diagram — Avaliação | Seção 3 |
| Class Diagram — Progresso | Seção 4 |
| Package Diagram — Camadas | Seção 5 |
| Component Diagram — Arquitetura | Seção 6 |
| Use Case Diagram | Seção 7 |
