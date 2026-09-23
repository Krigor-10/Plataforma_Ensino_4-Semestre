IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
CREATE TABLE [Cursos] (
    [Id] int NOT NULL IDENTITY,
    [Titulo] nvarchar(max) NOT NULL,
    [Descricao] nvarchar(max) NOT NULL,
    [Preco] decimal(18,2) NOT NULL,
    [CoordenadorId] int NOT NULL,
    [CriadoPor] int NOT NULL,
    CONSTRAINT [PK_Cursos] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Usuarios] (
    [Id] int NOT NULL IDENTITY,
    [Nome] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Cpf] nvarchar(max) NOT NULL,
    [Telefone] nvarchar(max) NOT NULL,
    [Cep] nvarchar(max) NOT NULL,
    [Rua] nvarchar(max) NOT NULL,
    [Numero] nvarchar(max) NOT NULL,
    [Bairro] nvarchar(max) NOT NULL,
    [Cidade] nvarchar(max) NOT NULL,
    [Estado] nvarchar(max) NOT NULL,
    [DataCadastro] datetime2 NOT NULL,
    [Ativo] bit NOT NULL,
    [TipoUsuario] nvarchar(13) NOT NULL,
    [Matricula] nvarchar(max) NULL,
    [TurmaAtual] nvarchar(max) NULL,
    [Aluno_Feedbacks] nvarchar(max) NULL,
    [CursoResponsavel] nvarchar(max) NULL,
    [TurmasAtribuidas] nvarchar(max) NULL,
    [Feedbacks] nvarchar(max) NULL,
    CONSTRAINT [PK_Usuarios] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Modulos] (
    [Id] int NOT NULL IDENTITY,
    [Titulo] nvarchar(max) NOT NULL,
    [DataCriacao] datetime2 NOT NULL,
    [CursoId] int NOT NULL,
    CONSTRAINT [PK_Modulos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Modulos_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Turmas] (
    [Id] int NOT NULL IDENTITY,
    [NomeTurma] nvarchar(max) NOT NULL,
    [DataCriacao] datetime2 NOT NULL,
    [CursoId] int NOT NULL,
    [ProfessorId] int NOT NULL,
    CONSTRAINT [PK_Turmas] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Turmas_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Turmas_Usuarios_ProfessorId] FOREIGN KEY ([ProfessorId]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Matriculas] (
    [Id] int NOT NULL IDENTITY,
    [DataSolicitacao] datetime2 NOT NULL,
    [NotaFinal] decimal(18,2) NOT NULL,
    [Status] int NOT NULL,
    [AlunoId] int NOT NULL,
    [TurmaId] int NOT NULL,
    CONSTRAINT [PK_Matriculas] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Matriculas_Turmas_TurmaId] FOREIGN KEY ([TurmaId]) REFERENCES [Turmas] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Matriculas_Usuarios_AlunoId] FOREIGN KEY ([AlunoId]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Matriculas_AlunoId] ON [Matriculas] ([AlunoId]);
GO

CREATE INDEX [IX_Matriculas_TurmaId] ON [Matriculas] ([TurmaId]);
GO

CREATE INDEX [IX_Modulos_CursoId] ON [Modulos] ([CursoId]);
GO

CREATE INDEX [IX_Turmas_CursoId] ON [Turmas] ([CursoId]);
GO

CREATE INDEX [IX_Turmas_ProfessorId] ON [Turmas] ([ProfessorId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260325043255_CriacaoDoBanco', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260328220214_AjustesFinaisCursos', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260330012231_AdicionarTipoUsuario', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260330023536_VincularProfessorATurma', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Usuarios] ADD [Especialidade] nvarchar(max) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260331023123_AdicionarColunaEspecialidade', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var nvarchar(max);
SELECT @var = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Especialidade');
IF @var IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Especialidade] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260331024600_ImplementarHerancaUsuarios', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var1 nvarchar(max);
SELECT @var1 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cursos]') AND [c].[name] = N'CoordenadorId');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Cursos] DROP CONSTRAINT ' + @var1 + ';');
ALTER TABLE [Cursos] ALTER COLUMN [CoordenadorId] int NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260402015712_TornarCoordenadorOpcional', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260402032616_CriarTabelaMatriculas', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var2 nvarchar(max);
SELECT @var2 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Telefone');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var2 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Telefone] nvarchar(20) NOT NULL;
GO

DECLARE @var3 nvarchar(max);
SELECT @var3 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Rua');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var3 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Rua] nvarchar(200) NOT NULL;
GO

DECLARE @var4 nvarchar(max);
SELECT @var4 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Numero');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var4 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Numero] nvarchar(20) NOT NULL;
GO

DECLARE @var5 nvarchar(max);
SELECT @var5 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Nome');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var5 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Nome] nvarchar(150) NOT NULL;
GO

DECLARE @var6 nvarchar(max);
SELECT @var6 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Estado');
IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var6 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Estado] nvarchar(2) NOT NULL;
GO

DECLARE @var7 nvarchar(max);
SELECT @var7 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Especialidade');
IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var7 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Especialidade] nvarchar(120) NULL;
GO

DECLARE @var8 nvarchar(max);
SELECT @var8 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Cidade');
IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var8 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Cidade] nvarchar(120) NOT NULL;
GO

DECLARE @var9 nvarchar(max);
SELECT @var9 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Cep');
IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var9 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Cep] nvarchar(9) NOT NULL;
GO

DECLARE @var10 nvarchar(max);
SELECT @var10 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Bairro');
IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var10 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Bairro] nvarchar(120) NOT NULL;
GO

DECLARE @var11 nvarchar(max);
SELECT @var11 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Turmas]') AND [c].[name] = N'NomeTurma');
IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [Turmas] DROP CONSTRAINT ' + @var11 + ';');
ALTER TABLE [Turmas] ALTER COLUMN [NomeTurma] nvarchar(120) NOT NULL;
GO

DECLARE @var12 nvarchar(max);
SELECT @var12 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Modulos]') AND [c].[name] = N'Titulo');
IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [Modulos] DROP CONSTRAINT ' + @var12 + ';');
ALTER TABLE [Modulos] ALTER COLUMN [Titulo] nvarchar(150) NOT NULL;
GO

DECLARE @var13 nvarchar(max);
SELECT @var13 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Matriculas]') AND [c].[name] = N'TurmaId');
IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [Matriculas] DROP CONSTRAINT ' + @var13 + ';');
ALTER TABLE [Matriculas] ALTER COLUMN [TurmaId] int NULL;
GO

ALTER TABLE [Matriculas] ADD [CursoId] int NOT NULL DEFAULT 0;
GO

DECLARE @var14 nvarchar(max);
SELECT @var14 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cursos]') AND [c].[name] = N'Titulo');
IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [Cursos] DROP CONSTRAINT ' + @var14 + ';');
ALTER TABLE [Cursos] ALTER COLUMN [Titulo] nvarchar(150) NOT NULL;
GO

DECLARE @var15 nvarchar(max);
SELECT @var15 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cursos]') AND [c].[name] = N'Descricao');
IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [Cursos] DROP CONSTRAINT ' + @var15 + ';');
ALTER TABLE [Cursos] ALTER COLUMN [Descricao] nvarchar(1000) NOT NULL;
GO

CREATE INDEX [IX_Matriculas_CursoId] ON [Matriculas] ([CursoId]);
GO

ALTER TABLE [Matriculas] ADD CONSTRAINT [FK_Matriculas_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260403172257_AddCursoIdAndMakeTurmaNullableInMatricula', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Usuarios] ADD [SenhaHash] nvarchar(max) NOT NULL DEFAULT N'';
GO

CREATE UNIQUE INDEX [IX_Turmas_NomeTurma_CursoId] ON [Turmas] ([NomeTurma], [CursoId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260407001527_AdicionarSenhaHashEJwt', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var16 nvarchar(max);
SELECT @var16 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Matriculas]') AND [c].[name] = N'NotaFinal');
IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [Matriculas] DROP CONSTRAINT ' + @var16 + ';');
ALTER TABLE [Matriculas] ALTER COLUMN [NotaFinal] decimal(4,2) NOT NULL;
GO

DECLARE @var17 nvarchar(max);
SELECT @var17 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cursos]') AND [c].[name] = N'Preco');
IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [Cursos] DROP CONSTRAINT ' + @var17 + ';');
ALTER TABLE [Cursos] ALTER COLUMN [Preco] decimal(10,2) NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260412024317_ConfigureDecimalPrecision', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [Avaliacoes] (
    [Id] int NOT NULL IDENTITY,
    [Titulo] nvarchar(180) NOT NULL,
    [Descricao] nvarchar(500) NOT NULL,
    [ProfessorAutorId] int NOT NULL,
    [TurmaId] int NOT NULL,
    [ModuloId] int NOT NULL,
    [TipoAvaliacao] int NOT NULL,
    [StatusPublicacao] int NOT NULL,
    [DataAbertura] datetime2 NULL,
    [DataFechamento] datetime2 NULL,
    [TentativasPermitidas] int NOT NULL,
    [TempoLimiteMinutos] int NULL,
    [NotaMaxima] decimal(6,2) NOT NULL,
    [PesoNota] decimal(6,2) NOT NULL,
    [PesoProgresso] decimal(6,2) NOT NULL,
    [PublicadoEm] datetime2 NULL,
    [CriadoEm] datetime2 NOT NULL,
    [AtualizadoEm] datetime2 NULL,
    CONSTRAINT [PK_Avaliacoes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Avaliacoes_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Avaliacoes_Turmas_TurmaId] FOREIGN KEY ([TurmaId]) REFERENCES [Turmas] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Avaliacoes_Usuarios_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ConteudosDidaticos] (
    [Id] int NOT NULL IDENTITY,
    [Titulo] nvarchar(180) NOT NULL,
    [Descricao] nvarchar(500) NOT NULL,
    [TipoConteudo] int NOT NULL,
    [CorpoTexto] nvarchar(max) NOT NULL,
    [ArquivoUrl] nvarchar(500) NOT NULL,
    [LinkUrl] nvarchar(500) NOT NULL,
    [ProfessorAutorId] int NOT NULL,
    [TurmaId] int NOT NULL,
    [ModuloId] int NOT NULL,
    [StatusPublicacao] int NOT NULL,
    [OrdemExibicao] int NOT NULL,
    [PesoProgresso] decimal(6,2) NOT NULL,
    [PublicadoEm] datetime2 NULL,
    [CriadoEm] datetime2 NOT NULL,
    [AtualizadoEm] datetime2 NULL,
    CONSTRAINT [PK_ConteudosDidaticos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ConteudosDidaticos_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ConteudosDidaticos_Turmas_TurmaId] FOREIGN KEY ([TurmaId]) REFERENCES [Turmas] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ConteudosDidaticos_Usuarios_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [MarcosProgressosAlunos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [Escopo] int NOT NULL,
    [CursoId] int NOT NULL,
    [ModuloId] int NULL,
    [Origem] int NOT NULL,
    [PercentualMarco] decimal(5,2) NOT NULL,
    [ReferenciaId] int NULL,
    [GeradoEm] datetime2 NOT NULL,
    [ProcessadoEm] datetime2 NULL,
    [Observacao] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_MarcosProgressosAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MarcosProgressosAlunos_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MarcosProgressosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_MarcosProgressosAlunos_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ProgressosCursosAlunos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [CursoId] int NOT NULL,
    [StatusProgresso] int NOT NULL,
    [PercentualConclusao] decimal(5,2) NOT NULL,
    [PesoConcluido] decimal(8,2) NOT NULL,
    [PesoTotal] decimal(8,2) NOT NULL,
    [ModulosConcluidos] int NOT NULL,
    [TotalModulos] int NOT NULL,
    [MediaCurso] decimal(6,2) NOT NULL,
    [AtualizadoEm] datetime2 NOT NULL,
    CONSTRAINT [PK_ProgressosCursosAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProgressosCursosAlunos_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ProgressosCursosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [ProgressosModulosAlunos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [ModuloId] int NOT NULL,
    [StatusProgresso] int NOT NULL,
    [PercentualConclusao] decimal(5,2) NOT NULL,
    [PesoConcluido] decimal(8,2) NOT NULL,
    [PesoTotal] decimal(8,2) NOT NULL,
    [ConteudosConcluidos] int NOT NULL,
    [TotalConteudos] int NOT NULL,
    [AvaliacoesConcluidas] int NOT NULL,
    [TotalAvaliacoes] int NOT NULL,
    [MediaModulo] decimal(6,2) NOT NULL,
    [AtualizadoEm] datetime2 NOT NULL,
    CONSTRAINT [PK_ProgressosModulosAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProgressosModulosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProgressosModulosAlunos_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [QuestoesBanco] (
    [Id] int NOT NULL IDENTITY,
    [ProfessorAutorId] int NOT NULL,
    [TituloInterno] nvarchar(180) NOT NULL,
    [Contexto] nvarchar(max) NOT NULL,
    [Enunciado] nvarchar(max) NOT NULL,
    [TipoQuestao] int NOT NULL,
    [Tema] nvarchar(120) NOT NULL,
    [Subtema] nvarchar(120) NOT NULL,
    [Dificuldade] tinyint NOT NULL,
    [ExplicacaoPosResposta] nvarchar(max) NOT NULL,
    [Ativa] bit NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [AtualizadoEm] datetime2 NULL,
    CONSTRAINT [PK_QuestoesBanco] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuestoesBanco_Usuarios_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TentativasAvaliacao] (
    [Id] int NOT NULL IDENTITY,
    [AvaliacaoId] int NOT NULL,
    [MatriculaId] int NOT NULL,
    [NumeroTentativa] int NOT NULL,
    [StatusTentativa] int NOT NULL,
    [IniciadaEm] datetime2 NOT NULL,
    [EnviadaEm] datetime2 NULL,
    [CorrigidaEm] datetime2 NULL,
    [NotaBruta] decimal(6,2) NOT NULL,
    CONSTRAINT [PK_TentativasAvaliacao] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TentativasAvaliacao_Avaliacoes_AvaliacaoId] FOREIGN KEY ([AvaliacaoId]) REFERENCES [Avaliacoes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TentativasAvaliacao_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ProgressosConteudosAlunos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [ConteudoDidaticoId] int NOT NULL,
    [ModuloId] int NOT NULL,
    [StatusProgresso] int NOT NULL,
    [PercentualConclusao] decimal(5,2) NOT NULL,
    [PrimeiroAcessoEm] datetime2 NULL,
    [UltimoAcessoEm] datetime2 NULL,
    [ConcluidoEm] datetime2 NULL,
    CONSTRAINT [PK_ProgressosConteudosAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProgressosConteudosAlunos_ConteudosDidaticos_ConteudoDidaticoId] FOREIGN KEY ([ConteudoDidaticoId]) REFERENCES [ConteudosDidaticos] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProgressosConteudosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ProgressosConteudosAlunos_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [AlternativasQuestoesBanco] (
    [Id] int NOT NULL IDENTITY,
    [QuestaoBancoId] int NOT NULL,
    [Letra] nvarchar(1) NOT NULL,
    [Texto] nvarchar(max) NOT NULL,
    [EhCorreta] bit NOT NULL,
    [Justificativa] nvarchar(max) NOT NULL,
    [Ordem] int NOT NULL,
    CONSTRAINT [PK_AlternativasQuestoesBanco] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AlternativasQuestoesBanco_QuestoesBanco_QuestaoBancoId] FOREIGN KEY ([QuestaoBancoId]) REFERENCES [QuestoesBanco] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AnexosQuestoesBanco] (
    [Id] int NOT NULL IDENTITY,
    [QuestaoBancoId] int NOT NULL,
    [Titulo] nvarchar(160) NOT NULL,
    [TipoAnexo] nvarchar(40) NOT NULL,
    [ArquivoUrl] nvarchar(500) NOT NULL,
    [Ordem] int NOT NULL,
    CONSTRAINT [PK_AnexosQuestoesBanco] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AnexosQuestoesBanco_QuestoesBanco_QuestaoBancoId] FOREIGN KEY ([QuestaoBancoId]) REFERENCES [QuestoesBanco] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [QuestoesPublicadas] (
    [Id] int NOT NULL IDENTITY,
    [AvaliacaoId] int NOT NULL,
    [QuestaoBancoId] int NOT NULL,
    [Ordem] int NOT NULL,
    [ContextoSnapshot] nvarchar(max) NOT NULL,
    [EnunciadoSnapshot] nvarchar(max) NOT NULL,
    [TipoQuestao] int NOT NULL,
    [ExplicacaoSnapshot] nvarchar(max) NOT NULL,
    [Pontos] decimal(6,2) NOT NULL,
    CONSTRAINT [PK_QuestoesPublicadas] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuestoesPublicadas_Avaliacoes_AvaliacaoId] FOREIGN KEY ([AvaliacaoId]) REFERENCES [Avaliacoes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_QuestoesPublicadas_QuestoesBanco_QuestaoBancoId] FOREIGN KEY ([QuestaoBancoId]) REFERENCES [QuestoesBanco] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [LancamentosNotasAlunos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [AvaliacaoId] int NOT NULL,
    [ModuloId] int NOT NULL,
    [TentativaAvaliacaoId] int NULL,
    [ProfessorResponsavelId] int NULL,
    [NotaOficial] decimal(6,2) NOT NULL,
    [PesoNota] decimal(6,2) NOT NULL,
    [OrigemCorrecao] int NOT NULL,
    [LiberadaAoAlunoEm] datetime2 NULL,
    [FeedbackProfessor] nvarchar(max) NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [AtualizadoEm] datetime2 NULL,
    CONSTRAINT [PK_LancamentosNotasAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_LancamentosNotasAlunos_Avaliacoes_AvaliacaoId] FOREIGN KEY ([AvaliacaoId]) REFERENCES [Avaliacoes] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LancamentosNotasAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LancamentosNotasAlunos_Modulos_ModuloId] FOREIGN KEY ([ModuloId]) REFERENCES [Modulos] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LancamentosNotasAlunos_TentativasAvaliacao_TentativaAvaliacaoId] FOREIGN KEY ([TentativaAvaliacaoId]) REFERENCES [TentativasAvaliacao] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LancamentosNotasAlunos_Usuarios_ProfessorResponsavelId] FOREIGN KEY ([ProfessorResponsavelId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [AlternativasQuestoesPublicadas] (
    [Id] int NOT NULL IDENTITY,
    [QuestaoPublicadaId] int NOT NULL,
    [Letra] nvarchar(1) NOT NULL,
    [Texto] nvarchar(max) NOT NULL,
    [EhCorreta] bit NOT NULL,
    [JustificativaSnapshot] nvarchar(max) NOT NULL,
    [Ordem] int NOT NULL,
    CONSTRAINT [PK_AlternativasQuestoesPublicadas] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AlternativasQuestoesPublicadas_QuestoesPublicadas_QuestaoPublicadaId] FOREIGN KEY ([QuestaoPublicadaId]) REFERENCES [QuestoesPublicadas] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [RespostasAlunos] (
    [Id] int NOT NULL IDENTITY,
    [TentativaAvaliacaoId] int NOT NULL,
    [QuestaoPublicadaId] int NOT NULL,
    [AlternativaQuestaoPublicadaId] int NULL,
    [RespostaTexto] nvarchar(max) NOT NULL,
    [Correta] bit NULL,
    [PontosObtidos] decimal(6,2) NOT NULL,
    [RespondidaEm] datetime2 NOT NULL,
    CONSTRAINT [PK_RespostasAlunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RespostasAlunos_AlternativasQuestoesPublicadas_AlternativaQuestaoPublicadaId] FOREIGN KEY ([AlternativaQuestaoPublicadaId]) REFERENCES [AlternativasQuestoesPublicadas] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_RespostasAlunos_QuestoesPublicadas_QuestaoPublicadaId] FOREIGN KEY ([QuestaoPublicadaId]) REFERENCES [QuestoesPublicadas] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_RespostasAlunos_TentativasAvaliacao_TentativaAvaliacaoId] FOREIGN KEY ([TentativaAvaliacaoId]) REFERENCES [TentativasAvaliacao] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_AlternativasQuestoesBanco_QuestaoBancoId_Letra] ON [AlternativasQuestoesBanco] ([QuestaoBancoId], [Letra]);
GO

CREATE UNIQUE INDEX [IX_AlternativasQuestoesPublicadas_QuestaoPublicadaId_Letra] ON [AlternativasQuestoesPublicadas] ([QuestaoPublicadaId], [Letra]);
GO

CREATE INDEX [IX_AnexosQuestoesBanco_QuestaoBancoId] ON [AnexosQuestoesBanco] ([QuestaoBancoId]);
GO

CREATE INDEX [IX_Avaliacoes_ModuloId] ON [Avaliacoes] ([ModuloId]);
GO

CREATE INDEX [IX_Avaliacoes_ProfessorAutorId] ON [Avaliacoes] ([ProfessorAutorId]);
GO

CREATE INDEX [IX_Avaliacoes_TurmaId] ON [Avaliacoes] ([TurmaId]);
GO

CREATE INDEX [IX_ConteudosDidaticos_ModuloId] ON [ConteudosDidaticos] ([ModuloId]);
GO

CREATE INDEX [IX_ConteudosDidaticos_ProfessorAutorId] ON [ConteudosDidaticos] ([ProfessorAutorId]);
GO

CREATE INDEX [IX_ConteudosDidaticos_TurmaId] ON [ConteudosDidaticos] ([TurmaId]);
GO

CREATE INDEX [IX_LancamentosNotasAlunos_AvaliacaoId] ON [LancamentosNotasAlunos] ([AvaliacaoId]);
GO

CREATE UNIQUE INDEX [IX_LancamentosNotasAlunos_MatriculaId_AvaliacaoId] ON [LancamentosNotasAlunos] ([MatriculaId], [AvaliacaoId]);
GO

CREATE INDEX [IX_LancamentosNotasAlunos_ModuloId] ON [LancamentosNotasAlunos] ([ModuloId]);
GO

CREATE INDEX [IX_LancamentosNotasAlunos_ProfessorResponsavelId] ON [LancamentosNotasAlunos] ([ProfessorResponsavelId]);
GO

CREATE INDEX [IX_LancamentosNotasAlunos_TentativaAvaliacaoId] ON [LancamentosNotasAlunos] ([TentativaAvaliacaoId]);
GO

CREATE INDEX [IX_MarcosProgressosAlunos_CursoId] ON [MarcosProgressosAlunos] ([CursoId]);
GO

CREATE INDEX [IX_MarcosProgressosAlunos_MatriculaId_Escopo_CursoId_ModuloId_PercentualMarco] ON [MarcosProgressosAlunos] ([MatriculaId], [Escopo], [CursoId], [ModuloId], [PercentualMarco]);
GO

CREATE INDEX [IX_MarcosProgressosAlunos_ModuloId] ON [MarcosProgressosAlunos] ([ModuloId]);
GO

CREATE INDEX [IX_ProgressosConteudosAlunos_ConteudoDidaticoId] ON [ProgressosConteudosAlunos] ([ConteudoDidaticoId]);
GO

CREATE UNIQUE INDEX [IX_ProgressosConteudosAlunos_MatriculaId_ConteudoDidaticoId] ON [ProgressosConteudosAlunos] ([MatriculaId], [ConteudoDidaticoId]);
GO

CREATE INDEX [IX_ProgressosConteudosAlunos_ModuloId] ON [ProgressosConteudosAlunos] ([ModuloId]);
GO

CREATE INDEX [IX_ProgressosCursosAlunos_CursoId] ON [ProgressosCursosAlunos] ([CursoId]);
GO

CREATE UNIQUE INDEX [IX_ProgressosCursosAlunos_MatriculaId_CursoId] ON [ProgressosCursosAlunos] ([MatriculaId], [CursoId]);
GO

CREATE UNIQUE INDEX [IX_ProgressosModulosAlunos_MatriculaId_ModuloId] ON [ProgressosModulosAlunos] ([MatriculaId], [ModuloId]);
GO

CREATE INDEX [IX_ProgressosModulosAlunos_ModuloId] ON [ProgressosModulosAlunos] ([ModuloId]);
GO

CREATE INDEX [IX_QuestoesBanco_ProfessorAutorId] ON [QuestoesBanco] ([ProfessorAutorId]);
GO

CREATE UNIQUE INDEX [IX_QuestoesPublicadas_AvaliacaoId_Ordem] ON [QuestoesPublicadas] ([AvaliacaoId], [Ordem]);
GO

CREATE INDEX [IX_QuestoesPublicadas_QuestaoBancoId] ON [QuestoesPublicadas] ([QuestaoBancoId]);
GO

CREATE INDEX [IX_RespostasAlunos_AlternativaQuestaoPublicadaId] ON [RespostasAlunos] ([AlternativaQuestaoPublicadaId]);
GO

CREATE INDEX [IX_RespostasAlunos_QuestaoPublicadaId] ON [RespostasAlunos] ([QuestaoPublicadaId]);
GO

CREATE UNIQUE INDEX [IX_RespostasAlunos_TentativaAvaliacaoId_QuestaoPublicadaId] ON [RespostasAlunos] ([TentativaAvaliacaoId], [QuestaoPublicadaId]);
GO

CREATE INDEX [IX_TentativasAvaliacao_AvaliacaoId] ON [TentativasAvaliacao] ([AvaliacaoId]);
GO

CREATE UNIQUE INDEX [IX_TentativasAvaliacao_MatriculaId_AvaliacaoId_NumeroTentativa] ON [TentativasAvaliacao] ([MatriculaId], [AvaliacaoId], [NumeroTentativa]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260414025019_AddPedagogicalCore', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DROP INDEX [IX_Modulos_CursoId] ON [Modulos];
GO

CREATE UNIQUE INDEX [IX_Modulos_CursoId_Titulo] ON [Modulos] ([CursoId], [Titulo]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260414030228_AddModuloManagementIndex', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Modulos] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

ALTER TABLE [Cursos] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

UPDATE [Cursos]
SET [CodigoRegistro] = CONCAT('CUR-', RIGHT(CONCAT('000000', CAST((([Id] * 7919 + 104729) % 1000000) AS varchar(6))), 6))
WHERE [CodigoRegistro] IS NULL OR [CodigoRegistro] = ''
GO

UPDATE [Modulos]
SET [CodigoRegistro] = CONCAT('MOD-', RIGHT(CONCAT('000000', CAST((([Id] * 104729 + 7919) % 1000000) AS varchar(6))), 6))
WHERE [CodigoRegistro] IS NULL OR [CodigoRegistro] = ''
GO

DECLARE @var18 nvarchar(max);
SELECT @var18 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Modulos]') AND [c].[name] = N'CodigoRegistro');
IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [Modulos] DROP CONSTRAINT ' + @var18 + ';');
ALTER TABLE [Modulos] ALTER COLUMN [CodigoRegistro] nvarchar(16) NOT NULL;
GO

DECLARE @var19 nvarchar(max);
SELECT @var19 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Cursos]') AND [c].[name] = N'CodigoRegistro');
IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [Cursos] DROP CONSTRAINT ' + @var19 + ';');
ALTER TABLE [Cursos] ALTER COLUMN [CodigoRegistro] nvarchar(16) NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Modulos_CodigoRegistro] ON [Modulos] ([CodigoRegistro]);
GO

CREATE UNIQUE INDEX [IX_Cursos_CodigoRegistro] ON [Cursos] ([CodigoRegistro]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260426233623_AdicionarCodigoRegistroAcademico', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Matriculas] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

UPDATE [Matriculas]
SET [CodigoRegistro] = CONCAT('MAT-', RIGHT(CONCAT('000000', CAST((([Id] * 13007 + 65537) % 1000000) AS varchar(6))), 6))
WHERE [CodigoRegistro] IS NULL OR [CodigoRegistro] = ''
GO

DECLARE @var20 nvarchar(max);
SELECT @var20 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Matriculas]') AND [c].[name] = N'CodigoRegistro');
IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [Matriculas] DROP CONSTRAINT ' + @var20 + ';');
ALTER TABLE [Matriculas] ALTER COLUMN [CodigoRegistro] nvarchar(16) NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Matriculas_CodigoRegistro] ON [Matriculas] ([CodigoRegistro]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260426234754_AdicionarCodigoRegistroMatricula', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Usuarios] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

UPDATE [Usuarios]
SET [CodigoRegistro] = CONCAT('PROF-', RIGHT(CONCAT('000000', CAST((([Id] * 7919 + 524287) % 1000000) AS varchar(6))), 6))
WHERE [TipoUsuario] = N'Professor'
  AND ([CodigoRegistro] IS NULL OR [CodigoRegistro] = '')
GO

CREATE UNIQUE INDEX [IX_Usuarios_CodigoRegistro] ON [Usuarios] ([CodigoRegistro]) WHERE [TipoUsuario] = N'Professor' AND [CodigoRegistro] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260428024911_AdicionarCodigoRegistroProfessor', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Turmas] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

UPDATE [Turmas]
SET [CodigoRegistro] = CONCAT('TUR-', RIGHT(CONCAT('000000', CAST((([Id] * 15485863 + 32452843) % 1000000) AS varchar(6))), 6))
WHERE [CodigoRegistro] IS NULL OR [CodigoRegistro] = ''
GO

DECLARE @var21 nvarchar(max);
SELECT @var21 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Turmas]') AND [c].[name] = N'CodigoRegistro');
IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [Turmas] DROP CONSTRAINT ' + @var21 + ';');
ALTER TABLE [Turmas] ALTER COLUMN [CodigoRegistro] nvarchar(16) NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Turmas_CodigoRegistro] ON [Turmas] ([CodigoRegistro]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260429002254_AdicionarCodigoRegistroTurma', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [FeedbacksAcademicos] (
    [Id] int NOT NULL IDENTITY,
    [DestinatarioId] int NOT NULL,
    [AutorId] int NULL,
    [Origem] nvarchar(120) NOT NULL,
    [Mensagem] nvarchar(1000) NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [Lido] bit NOT NULL,
    CONSTRAINT [PK_FeedbacksAcademicos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_FeedbacksAcademicos_Usuarios_AutorId] FOREIGN KEY ([AutorId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_FeedbacksAcademicos_Usuarios_DestinatarioId] FOREIGN KEY ([DestinatarioId]) REFERENCES [Usuarios] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_FeedbacksAcademicos_AutorId] ON [FeedbacksAcademicos] ([AutorId]);
GO

CREATE INDEX [IX_FeedbacksAcademicos_DestinatarioId_CriadoEm] ON [FeedbacksAcademicos] ([DestinatarioId], [CriadoEm]);
GO


                INSERT INTO [FeedbacksAcademicos] ([DestinatarioId], [AutorId], [Origem], [Mensagem], [CriadoEm], [Lido])
                SELECT
                    u.[Id],
                    NULL,
                    N'Historico do aluno',
                    LEFT(CONVERT(nvarchar(max), feedback.[value]), 1000),
                    SYSUTCDATETIME(),
                    CAST(0 AS bit)
                FROM [Usuarios] AS u
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(u.[Aluno_Feedbacks]) = 1 THEN u.[Aluno_Feedbacks] ELSE N'[]' END) AS feedback
                WHERE feedback.[value] IS NOT NULL
                  AND CONVERT(nvarchar(max), feedback.[value]) <> N'';
GO
            


                INSERT INTO [FeedbacksAcademicos] ([DestinatarioId], [AutorId], [Origem], [Mensagem], [CriadoEm], [Lido])
                SELECT
                    u.[Id],
                    NULL,
                    N'Historico do professor',
                    LEFT(CONVERT(nvarchar(max), feedback.[value]), 1000),
                    SYSUTCDATETIME(),
                    CAST(0 AS bit)
                FROM [Usuarios] AS u
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(u.[Feedbacks]) = 1 THEN u.[Feedbacks] ELSE N'[]' END) AS feedback
                WHERE feedback.[value] IS NOT NULL
                  AND CONVERT(nvarchar(max), feedback.[value]) <> N'';
GO
            

DECLARE @var22 nvarchar(max);
SELECT @var22 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Aluno_Feedbacks');
IF @var22 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var22 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [Aluno_Feedbacks];
GO

DECLARE @var23 nvarchar(max);
SELECT @var23 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Feedbacks');
IF @var23 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var23 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [Feedbacks];
GO

DECLARE @var24 nvarchar(max);
SELECT @var24 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'TurmasAtribuidas');
IF @var24 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var24 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [TurmasAtribuidas];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260429005545_NormalizarFeedbackAcademico', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

                IF OBJECT_ID(N'[FK_Avaliacoes_Usuarios_ProfessorAutorId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [Avaliacoes] DROP CONSTRAINT [FK_Avaliacoes_Usuarios_ProfessorAutorId];
                END
GO
            


                IF OBJECT_ID(N'[FK_ConteudosDidaticos_Usuarios_ProfessorAutorId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [ConteudosDidaticos] DROP CONSTRAINT [FK_ConteudosDidaticos_Usuarios_ProfessorAutorId];
                END
GO
            


                IF OBJECT_ID(N'[FK_Cursos_Usuarios_CoordenadorId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [Cursos] DROP CONSTRAINT [FK_Cursos_Usuarios_CoordenadorId];
                END
GO
            


                IF OBJECT_ID(N'[FK_Cursos_Usuarios_CriadoPor]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [Cursos] DROP CONSTRAINT [FK_Cursos_Usuarios_CriadoPor];
                END
GO
            


                IF OBJECT_ID(N'[FK_LancamentosNotasAlunos_Usuarios_ProfessorResponsavelId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [LancamentosNotasAlunos] DROP CONSTRAINT [FK_LancamentosNotasAlunos_Usuarios_ProfessorResponsavelId];
                END
GO
            


                IF OBJECT_ID(N'[FK_Matriculas_Usuarios_AlunoId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [Matriculas] DROP CONSTRAINT [FK_Matriculas_Usuarios_AlunoId];
                END
GO
            


                IF OBJECT_ID(N'[FK_QuestoesBanco_Usuarios_ProfessorAutorId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [QuestoesBanco] DROP CONSTRAINT [FK_QuestoesBanco_Usuarios_ProfessorAutorId];
                END
GO
            


                IF OBJECT_ID(N'[FK_Turmas_Usuarios_ProfessorId]', N'F') IS NOT NULL
                BEGIN
                    ALTER TABLE [Turmas] DROP CONSTRAINT [FK_Turmas_Usuarios_ProfessorId];
                END
GO
            

DROP INDEX [IX_Usuarios_CodigoRegistro] ON [Usuarios];
GO

DECLARE @var25 nvarchar(max);
SELECT @var25 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'TipoUsuario');
IF @var25 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var25 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [TipoUsuario] nvarchar(40) NOT NULL;
GO

CREATE TABLE [Admins] (
    [Id] int NOT NULL,
    CONSTRAINT [PK_Admins] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Admins_Usuarios_Id] FOREIGN KEY ([Id]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Alunos] (
    [Id] int NOT NULL,
    [Matricula] nvarchar(max) NOT NULL,
    [TurmaAtual] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Alunos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Alunos_Usuarios_Id] FOREIGN KEY ([Id]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Coordenadores] (
    [Id] int NOT NULL,
    [CursoResponsavel] nvarchar(max) NULL,
    CONSTRAINT [PK_Coordenadores] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Coordenadores_Usuarios_Id] FOREIGN KEY ([Id]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Professores] (
    [Id] int NOT NULL,
    [CodigoRegistro] nvarchar(16) NOT NULL,
    [Especialidade] nvarchar(120) NOT NULL,
    CONSTRAINT [PK_Professores] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Professores_Usuarios_Id] FOREIGN KEY ([Id]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO


                INSERT INTO [Admins] ([Id])
                SELECT [Id]
                FROM [Usuarios]
                WHERE [TipoUsuario] = N'Admin';
GO
            


                INSERT INTO [Alunos] ([Id], [Matricula], [TurmaAtual])
                SELECT
                    [Id],
                    COALESCE([Matricula], N''),
                    COALESCE([TurmaAtual], N'Nao atribuida')
                FROM [Usuarios]
                WHERE [TipoUsuario] = N'Aluno';
GO
            


                INSERT INTO [Coordenadores] ([Id], [CursoResponsavel])
                SELECT [Id], [CursoResponsavel]
                FROM [Usuarios]
                WHERE [TipoUsuario] = N'Coordenador';
GO
            


                INSERT INTO [Professores] ([Id], [CodigoRegistro], [Especialidade])
                SELECT
                    [Id],
                    COALESCE(NULLIF([CodigoRegistro], N''), CONCAT(N'PROFMIG-', RIGHT(CONCAT(N'00000000', [Id]), 8))),
                    LEFT(COALESCE(NULLIF([Especialidade], N''), N'Nao informada'), 120)
                FROM [Usuarios]
                WHERE [TipoUsuario] = N'Professor';
GO
            

CREATE UNIQUE INDEX [IX_Professores_CodigoRegistro] ON [Professores] ([CodigoRegistro]) WHERE [CodigoRegistro] IS NOT NULL;
GO

DECLARE @var26 nvarchar(max);
SELECT @var26 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'CodigoRegistro');
IF @var26 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var26 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [CodigoRegistro];
GO

DECLARE @var27 nvarchar(max);
SELECT @var27 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'CursoResponsavel');
IF @var27 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var27 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [CursoResponsavel];
GO

DECLARE @var28 nvarchar(max);
SELECT @var28 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Especialidade');
IF @var28 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var28 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [Especialidade];
GO

DECLARE @var29 nvarchar(max);
SELECT @var29 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Matricula');
IF @var29 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var29 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [Matricula];
GO

DECLARE @var30 nvarchar(max);
SELECT @var30 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'TurmaAtual');
IF @var30 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var30 + ';');
ALTER TABLE [Usuarios] DROP COLUMN [TurmaAtual];
GO

ALTER TABLE [Avaliacoes] ADD CONSTRAINT [FK_Avaliacoes_Professores_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Professores] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [ConteudosDidaticos] ADD CONSTRAINT [FK_ConteudosDidaticos_Professores_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Professores] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Cursos] ADD CONSTRAINT [FK_Cursos_Admins_CriadoPor] FOREIGN KEY ([CriadoPor]) REFERENCES [Admins] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Cursos] ADD CONSTRAINT [FK_Cursos_Coordenadores_CoordenadorId] FOREIGN KEY ([CoordenadorId]) REFERENCES [Coordenadores] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [LancamentosNotasAlunos] ADD CONSTRAINT [FK_LancamentosNotasAlunos_Professores_ProfessorResponsavelId] FOREIGN KEY ([ProfessorResponsavelId]) REFERENCES [Professores] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Matriculas] ADD CONSTRAINT [FK_Matriculas_Alunos_AlunoId] FOREIGN KEY ([AlunoId]) REFERENCES [Alunos] ([Id]) ON DELETE CASCADE;
GO

ALTER TABLE [QuestoesBanco] ADD CONSTRAINT [FK_QuestoesBanco_Professores_ProfessorAutorId] FOREIGN KEY ([ProfessorAutorId]) REFERENCES [Professores] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Turmas] ADD CONSTRAINT [FK_Turmas_Professores_ProfessorId] FOREIGN KEY ([ProfessorId]) REFERENCES [Professores] ([Id]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260429012102_NormalizarPerfisUsuario', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Coordenadores] ADD [CodigoRegistro] nvarchar(16) NULL;
GO

UPDATE [Coordenadores]
SET [CodigoRegistro] = CONCAT('COORD-', RIGHT(CONCAT('000000', CAST([Id] AS varchar(6))), 6))
WHERE [CodigoRegistro] IS NULL OR LTRIM(RTRIM([CodigoRegistro])) = ''
GO

DECLARE @var31 nvarchar(max);
SELECT @var31 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Coordenadores]') AND [c].[name] = N'CodigoRegistro');
IF @var31 IS NOT NULL EXEC(N'ALTER TABLE [Coordenadores] DROP CONSTRAINT ' + @var31 + ';');
ALTER TABLE [Coordenadores] ALTER COLUMN [CodigoRegistro] nvarchar(16) NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Coordenadores_CodigoRegistro] ON [Coordenadores] ([CodigoRegistro]) WHERE [CodigoRegistro] IS NOT NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260504215933_AdicionarCodigoRegistroCoordenador', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var32 nvarchar(max);
SELECT @var32 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Email');
IF @var32 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var32 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Email] nvarchar(180) NOT NULL;
GO

DECLARE @var33 nvarchar(max);
SELECT @var33 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Usuarios]') AND [c].[name] = N'Cpf');
IF @var33 IS NOT NULL EXEC(N'ALTER TABLE [Usuarios] DROP CONSTRAINT ' + @var33 + ';');
ALTER TABLE [Usuarios] ALTER COLUMN [Cpf] nvarchar(11) NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Usuarios_Cpf] ON [Usuarios] ([Cpf]);
GO

CREATE UNIQUE INDEX [IX_Usuarios_Email] ON [Usuarios] ([Email]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828022503_AdicionarIndiceUnicoEmailCpfUsuarios', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Matriculas] DROP CONSTRAINT [FK_Matriculas_Cursos_CursoId];
GO

ALTER TABLE [Modulos] DROP CONSTRAINT [FK_Modulos_Cursos_CursoId];
GO

ALTER TABLE [Turmas] DROP CONSTRAINT [FK_Turmas_Cursos_CursoId];
GO

ALTER TABLE [Turmas] DROP CONSTRAINT [FK_Turmas_Professores_ProfessorId];
GO

ALTER TABLE [Matriculas] ADD CONSTRAINT [FK_Matriculas_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Modulos] ADD CONSTRAINT [FK_Modulos_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Turmas] ADD CONSTRAINT [FK_Turmas_Cursos_CursoId] FOREIGN KEY ([CursoId]) REFERENCES [Cursos] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [Turmas] ADD CONSTRAINT [FK_Turmas_Professores_ProfessorId] FOREIGN KEY ([ProfessorId]) REFERENCES [Professores] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828022909_CorrigirCascadeDeleteCursoTurmaModulo', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var34 nvarchar(max);
SELECT @var34 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Alunos]') AND [c].[name] = N'TurmaAtual');
IF @var34 IS NOT NULL EXEC(N'ALTER TABLE [Alunos] DROP CONSTRAINT ' + @var34 + ';');
ALTER TABLE [Alunos] DROP COLUMN [TurmaAtual];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828023735_RemoverTurmaAtualDoAluno', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var35 nvarchar(max);
SELECT @var35 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Coordenadores]') AND [c].[name] = N'CursoResponsavel');
IF @var35 IS NOT NULL EXEC(N'ALTER TABLE [Coordenadores] DROP CONSTRAINT ' + @var35 + ';');
ALTER TABLE [Coordenadores] DROP COLUMN [CursoResponsavel];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828024725_RemoverCursoResponsavelDoCoordenador', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Cursos] ADD [ImagemUrl] nvarchar(500) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828123048_AdicionarImagemUrlCurso', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Matriculas] ADD [CertificadoEmitidoEm] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828133026_AdicionarCertificadoEmitidoEmMatricula', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DROP INDEX [IX_Matriculas_AlunoId] ON [Matriculas];
GO

CREATE UNIQUE INDEX [IX_Matriculas_AlunoId_TurmaId_Aprovada] ON [Matriculas] ([AlunoId], [TurmaId]) WHERE [Status] = 1;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828151029_AdicionarIndiceUnicoMatriculaAprovadaPorTurma', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [RefreshTokens] (
    [Id] int NOT NULL IDENTITY,
    [Token] nvarchar(200) NOT NULL,
    [UsuarioId] int NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [ExpiraEm] datetime2 NOT NULL,
    [RevogadoEm] datetime2 NULL,
    CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RefreshTokens_Usuarios_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_RefreshTokens_Token] ON [RefreshTokens] ([Token]);
GO

CREATE INDEX [IX_RefreshTokens_UsuarioId] ON [RefreshTokens] ([UsuarioId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260828173637_AddRefreshTokens', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Usuarios] ADD [TokenRecuperacaoSenhaExpiraEm] datetime2 NULL;
GO

ALTER TABLE [Usuarios] ADD [TokenRecuperacaoSenhaHash] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260829154340_AdicionarTokenRecuperacaoSenha', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [Notificacoes] (
    [Id] int NOT NULL IDENTITY,
    [UsuarioId] int NOT NULL,
    [Titulo] nvarchar(150) NOT NULL,
    [Mensagem] nvarchar(500) NOT NULL,
    [Tipo] int NOT NULL,
    [Link] nvarchar(300) NULL,
    [Lida] bit NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [LidaEm] datetime2 NULL,
    CONSTRAINT [PK_Notificacoes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notificacoes_Usuarios_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_Notificacoes_UsuarioId_Lida_CriadoEm] ON [Notificacoes] ([UsuarioId], [Lida], [CriadoEm]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260829155149_AdicionarNotificacoes', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
EXEC sp_rename N'[RefreshTokens].[Token]', N'TokenHash', 'COLUMN';
GO

EXEC sp_rename N'[RefreshTokens].[IX_RefreshTokens_Token]', N'IX_RefreshTokens_TokenHash', 'INDEX';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260831172156_RenomeiaRefreshTokenParaHash', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [Pagamentos] (
    [Id] int NOT NULL IDENTITY,
    [MatriculaId] int NOT NULL,
    [Valor] decimal(10,2) NOT NULL,
    [Status] int NOT NULL,
    [CriadoEm] datetime2 NOT NULL,
    [PagoEm] datetime2 NULL,
    CONSTRAINT [PK_Pagamentos] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Pagamentos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Pagamentos_MatriculaId] ON [Pagamentos] ([MatriculaId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260901013512_AdicionarPagamento', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Avaliacoes] ADD [ConteudoDidaticoId] int NULL;
GO

CREATE INDEX [IX_Avaliacoes_ConteudoDidaticoId] ON [Avaliacoes] ([ConteudoDidaticoId]);
GO

ALTER TABLE [Avaliacoes] ADD CONSTRAINT [FK_Avaliacoes_ConteudosDidaticos_ConteudoDidaticoId] FOREIGN KEY ([ConteudoDidaticoId]) REFERENCES [ConteudosDidaticos] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260901022054_AdicionarConteudoDidaticoIdEmAvaliacao', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DECLARE @var36 nvarchar(max);
SELECT @var36 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[LancamentosNotasAlunos]') AND [c].[name] = N'ModuloId');
IF @var36 IS NOT NULL EXEC(N'ALTER TABLE [LancamentosNotasAlunos] DROP CONSTRAINT ' + @var36 + ';');
ALTER TABLE [LancamentosNotasAlunos] ALTER COLUMN [ModuloId] int NULL;
GO

DECLARE @var37 nvarchar(max);
SELECT @var37 = QUOTENAME([d].[name])
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Avaliacoes]') AND [c].[name] = N'ModuloId');
IF @var37 IS NOT NULL EXEC(N'ALTER TABLE [Avaliacoes] DROP CONSTRAINT ' + @var37 + ';');
ALTER TABLE [Avaliacoes] ALTER COLUMN [ModuloId] int NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260901171719_TornarModuloOpcionalEmAvaliacaoELancamentoNota', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
DROP TABLE [MarcosProgressosAlunos];
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260904194746_RemoverMarcoProgressoAluno', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [Avaliacoes] DROP CONSTRAINT [FK_Avaliacoes_Turmas_TurmaId];
GO

ALTER TABLE [ConteudosDidaticos] DROP CONSTRAINT [FK_ConteudosDidaticos_Turmas_TurmaId];
GO

CREATE INDEX [IX_Matriculas_AlunoId] ON [Matriculas] ([AlunoId]);
GO

CREATE INDEX [IX_Cursos_CoordenadorId] ON [Cursos] ([CoordenadorId]);
GO

CREATE INDEX [IX_Cursos_CriadoPor] ON [Cursos] ([CriadoPor]);
GO

ALTER TABLE [Avaliacoes] ADD CONSTRAINT [FK_Avaliacoes_Turmas_TurmaId] FOREIGN KEY ([TurmaId]) REFERENCES [Turmas] ([Id]);
GO

ALTER TABLE [ConteudosDidaticos] ADD CONSTRAINT [FK_ConteudosDidaticos_Turmas_TurmaId] FOREIGN KEY ([TurmaId]) REFERENCES [Turmas] ([Id]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260904195916_IndicesEEndurecimentoFksTurma', N'10.0.5');
GO

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [ProgressosCursosAlunos] DROP CONSTRAINT [FK_ProgressosCursosAlunos_Matriculas_MatriculaId];
GO

ALTER TABLE [ProgressosModulosAlunos] DROP CONSTRAINT [FK_ProgressosModulosAlunos_Matriculas_MatriculaId];
GO

ALTER TABLE [ProgressosCursosAlunos] ADD CONSTRAINT [FK_ProgressosCursosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [ProgressosModulosAlunos] ADD CONSTRAINT [FK_ProgressosModulosAlunos_Matriculas_MatriculaId] FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260909184927_PadronizaCascadeProgressoParaRestrict', N'10.0.5');
GO

COMMIT;
GO

