-- =============================================================
-- Etapa 7 do PIM IV — Procedures e Triggers
-- Rodar DEPOIS de script-banco-dados-completo.sql (schema base
-- gerado pelas migrations do EF Core). Idempotente: usa
-- CREATE OR ALTER, pode rodar quantas vezes precisar.
-- =============================================================

-- -------------------------------------------------------------
-- Tabela de auditoria — não mapeada no EF Core de propósito,
-- é escrita só pelo trigger abaixo, nunca pela aplicação em C#.
-- -------------------------------------------------------------
IF OBJECT_ID(N'[HistoricoStatusMatricula]') IS NULL
BEGIN
    CREATE TABLE [HistoricoStatusMatricula] (
        [Id] int NOT NULL IDENTITY,
        [MatriculaId] int NOT NULL,
        [StatusAnterior] int NOT NULL,
        [StatusNovo] int NOT NULL,
        [AlteradoEm] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_HistoricoStatusMatricula] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HistoricoStatusMatricula_Matriculas]
            FOREIGN KEY ([MatriculaId]) REFERENCES [Matriculas]([Id])
    );
END;
GO

-- -------------------------------------------------------------
-- TRIGGER 1 — audita toda mudança de status de matrícula.
--
-- Por que no banco e não só no C#: a auditoria de "quem mudou o
-- quê e quando" precisa valer mesmo pra escritas que não passam
-- pelo Services/MatriculaService.cs (correção manual de suporte,
-- migração de dados, um futuro serviço em outra linguagem que
-- escreva na mesma base). Um trigger é a única garantia que não
-- depende de nenhuma aplicação lembrar de logar.
-- -------------------------------------------------------------
CREATE OR ALTER TRIGGER [TR_Matricula_HistoricoStatus]
ON [Matriculas]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE([Status])
        RETURN;

    INSERT INTO [HistoricoStatusMatricula] ([MatriculaId], [StatusAnterior], [StatusNovo])
    SELECT i.[Id], d.[Status], i.[Status]
    FROM inserted i
    INNER JOIN deleted d ON d.[Id] = i.[Id]
    WHERE d.[Status] <> i.[Status];
END;
GO

-- -------------------------------------------------------------
-- TRIGGER 2 — impede excluir um Curso que ainda tem matrícula
-- aprovada (StatusMatricula.Aprovada = 1).
--
-- Por que no banco: é a última linha de defesa contra perda de
-- histórico acadêmico, mesmo que a camada de serviço em C# tenha
-- um bug ou seja contornada por acesso direto ao banco.
-- -------------------------------------------------------------
CREATE OR ALTER TRIGGER [TR_Curso_ImpedeExclusaoComMatriculasAtivas]
ON [Cursos]
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM [Matriculas] m
        INNER JOIN deleted d ON d.[Id] = m.[CursoId]
        WHERE m.[Status] = 1
    )
    BEGIN
        RAISERROR('Nao e possivel excluir um curso com matriculas aprovadas.', 16, 1);
        RETURN;
    END;

    DELETE FROM [Cursos] WHERE [Id] IN (SELECT [Id] FROM deleted);
END;
GO

-- -------------------------------------------------------------
-- PROCEDURE 1 — relatório de desempenho por turma.
--
-- Usada pelos dashboards de Coordenador/Professor. Agregação que
-- seria caro repetir puxando linha a linha via EF Core; aqui é
-- uma única ida ao banco.
-- -------------------------------------------------------------
CREATE OR ALTER PROCEDURE [sp_DesempenhoPorTurma]
    @TurmaId int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.[Id] AS TurmaId,
        t.[NomeTurma],
        COUNT(m.[Id]) AS TotalMatriculas,
        SUM(CASE WHEN m.[Status] = 1 THEN 1 ELSE 0 END) AS TotalAprovadas,
        AVG(CASE WHEN m.[Status] = 1 THEN m.[NotaFinal] END) AS MediaNotaFinal,
        CAST(
            100.0 * SUM(CASE WHEN m.[Status] = 1 AND m.[NotaFinal] >= 6 THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN m.[Status] = 1 THEN 1 ELSE 0 END), 0)
        AS decimal(5,2)) AS PercentualAprovacao
    FROM [Turmas] t
    LEFT JOIN [Matriculas] m ON m.[TurmaId] = t.[Id]
    WHERE t.[Id] = @TurmaId
    GROUP BY t.[Id], t.[NomeTurma];
END;
GO

-- -------------------------------------------------------------
-- PROCEDURE 2 — inicia uma tentativa de avaliação de forma
-- atômica.
--
-- Por que no banco e não só "checar e depois inserir" em C#:
-- dois cliques quase simultâneos do mesmo aluno (aba web + app
-- mobile abertos ao mesmo tempo, ou duplo clique) podem passar
-- os dois pela checagem de "tentativas restantes" antes que
-- qualquer um grave — criando mais tentativas do que o
-- permitido. A transação com UPDLOCK/HOLDLOCK fecha essa corrida
-- de um jeito que o C# sozinho, sem lock explícito no banco, não
-- fecha.
-- -------------------------------------------------------------
CREATE OR ALTER PROCEDURE [sp_RegistrarTentativaAvaliacao]
    @AvaliacaoId int,
    @MatriculaId int,
    @NovaTentativaId int OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @TentativasPermitidas int;
    DECLARE @TentativasExistentes int;

    SELECT @TentativasPermitidas = [TentativasPermitidas]
    FROM [Avaliacoes] WITH (UPDLOCK, HOLDLOCK)
    WHERE [Id] = @AvaliacaoId;

    SELECT @TentativasExistentes = COUNT(*)
    FROM [TentativasAvaliacao] WITH (UPDLOCK, HOLDLOCK)
    WHERE [AvaliacaoId] = @AvaliacaoId AND [MatriculaId] = @MatriculaId;

    IF @TentativasExistentes >= @TentativasPermitidas
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Numero maximo de tentativas ja atingido.', 16, 1);
        RETURN;
    END;

    INSERT INTO [TentativasAvaliacao]
        ([AvaliacaoId], [MatriculaId], [NumeroTentativa], [StatusTentativa], [IniciadaEm], [NotaBruta])
    VALUES
        (@AvaliacaoId, @MatriculaId, @TentativasExistentes + 1, 1, SYSUTCDATETIME(), 0);

    SET @NovaTentativaId = SCOPE_IDENTITY();

    COMMIT TRANSACTION;
END;
GO
