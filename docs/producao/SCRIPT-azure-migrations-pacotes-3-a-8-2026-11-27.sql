-- CodeRyse - migrations pendentes no Azure SQL (pacotes 3, 4, 6, 7 e 8 da auditoria de 26/11)
-- Gerado em 27/11/2026 com: dotnet ef migrations script 20261125151613_AdicionarInativacaoUsuario --idempotent
-- Producao esta em 20261125151613_AdicionarInativacaoUsuario (versao 6b8af17).
-- Idempotente: cada migration so roda se ainda nao estiver em __EFMigrationsHistory; pode rodar de novo sem efeito.
-- Ordem: 1) aplicar este script no banco do Azure; 2) logo em seguida disparar o deploy do codigo.
-- Migrations: RecalcularNotasEscalaDezMediaSimples, CongelarERevogarCertificado,
--             AdicionarRetiradoDaVendaEmEmCurso, MarcarGratuitosAtuaisComoPublicados,
--             AdicionarModeloCursoOriginalEmCurso

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    UPDATE Avaliacoes
    SET NotaMaxima = 10, PesoNota = 1
    WHERE NotaMaxima <> 10 OR PesoNota <> 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    UPDATE t
    SET t.NotaBruta = CASE
            WHEN totais.PontosTotais <= 0 THEN 0
            WHEN totais.PontosObtidos >= totais.PontosTotais THEN 10
            ELSE ROUND(totais.PontosObtidos / totais.PontosTotais * 10, 2)
        END
    FROM TentativasAvaliacao t
    INNER JOIN (
        SELECT r.TentativaAvaliacaoId,
               CAST(SUM(r.PontosObtidos) AS decimal(18, 6)) AS PontosObtidos,
               CAST(SUM(q.Pontos) AS decimal(18, 6)) AS PontosTotais
        FROM RespostasAlunos r
        INNER JOIN QuestoesPublicadas q ON q.Id = r.QuestaoPublicadaId
        GROUP BY r.TentativaAvaliacaoId
    ) totais ON totais.TentativaAvaliacaoId = t.Id
    WHERE t.StatusTentativa = 3;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    WITH MelhorTentativa AS (
        SELECT t.Id, t.AvaliacaoId, t.MatriculaId, t.NotaBruta,
               ROW_NUMBER() OVER (
                   PARTITION BY t.AvaliacaoId, t.MatriculaId
                   ORDER BY t.NotaBruta DESC, t.NumeroTentativa DESC) AS Posicao
        FROM TentativasAvaliacao t
        WHERE t.StatusTentativa = 3
    )
    UPDATE l
    SET l.NotaOficial = m.NotaBruta,
        l.TentativaAvaliacaoId = m.Id,
        l.AtualizadoEm = SYSUTCDATETIME()
    FROM LancamentosNotasAlunos l
    INNER JOIN MelhorTentativa m
        ON m.AvaliacaoId = l.AvaliacaoId AND m.MatriculaId = l.MatriculaId AND m.Posicao = 1;

    UPDATE LancamentosNotasAlunos SET PesoNota = 1 WHERE PesoNota <> 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    UPDATE p
    SET p.MediaModulo = ISNULL(medias.Media, 0)
    FROM ProgressosModulosAlunos p
    OUTER APPLY (
        SELECT ROUND(AVG(CAST(l.NotaOficial AS decimal(18, 6))), 2) AS Media
        FROM LancamentosNotasAlunos l
        INNER JOIN Avaliacoes a ON a.Id = l.AvaliacaoId
        WHERE l.MatriculaId = p.MatriculaId
          AND a.ModuloId = p.ModuloId
          AND a.StatusPublicacao = 2
          AND a.TipoAvaliacao <> 1
    ) medias;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    UPDATE p
    SET p.MediaCurso = ISNULL(medias.Media, 0)
    FROM ProgressosCursosAlunos p
    OUTER APPLY (
        SELECT ROUND(AVG(CAST(l.NotaOficial AS decimal(18, 6))), 2) AS Media
        FROM LancamentosNotasAlunos l
        INNER JOIN Avaliacoes a ON a.Id = l.AvaliacaoId
        WHERE l.MatriculaId = p.MatriculaId
          AND a.CursoId = p.CursoId
          AND a.StatusPublicacao = 2
          AND a.TipoAvaliacao <> 1
    ) medias;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN

    UPDATE m
    SET m.NotaFinal = lancadas.Media
    FROM Matriculas m
    CROSS APPLY (
        SELECT COUNT(*) AS Total
        FROM Avaliacoes a
        WHERE a.CursoId = m.CursoId AND a.StatusPublicacao = 2 AND a.TipoAvaliacao <> 1
    ) publicadas
    CROSS APPLY (
        SELECT COUNT(*) AS Quantidade, ROUND(AVG(CAST(l.NotaOficial AS decimal(18, 6))), 2) AS Media
        FROM LancamentosNotasAlunos l
        INNER JOIN Avaliacoes a ON a.Id = l.AvaliacaoId
        WHERE l.MatriculaId = m.Id
          AND a.CursoId = m.CursoId
          AND a.StatusPublicacao = 2
          AND a.TipoAvaliacao <> 1
    ) lancadas
    WHERE m.Status = 1
      AND publicadas.Total > 0
      AND lancadas.Quantidade = publicadas.Total;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127011516_RecalcularNotasEscalaDezMediaSimples'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261127011516_RecalcularNotasEscalaDezMediaSimples', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [CertificadoRevogadoEm] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [CertificadoRevogadoPorId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [MotivoRevogacaoCertificado] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [NomeAlunoCertificado] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [NotaFinalCertificado] decimal(4,2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    ALTER TABLE [Matriculas] ADD [TituloCursoCertificado] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN

    EXEC(N'
    UPDATE m
    SET m.NomeAlunoCertificado = LEFT(u.Nome, 150),
        m.TituloCursoCertificado = LEFT(c.Titulo, 150),
        m.NotaFinalCertificado = CASE
            WHEN publicadas.Total = 0 THEN m.NotaFinal
            WHEN lancadas.Quantidade = publicadas.Total THEN m.NotaFinal
            WHEN lancadas.Quantidade > 0 THEN lancadas.Media
            ELSE m.NotaFinal
        END
    FROM Matriculas m
    INNER JOIN Usuarios u ON u.Id = m.AlunoId
    INNER JOIN Cursos c ON c.Id = m.CursoId
    CROSS APPLY (
        SELECT COUNT(*) AS Total
        FROM Avaliacoes a
        WHERE a.CursoId = m.CursoId AND a.StatusPublicacao = 2 AND a.TipoAvaliacao <> 1
    ) publicadas
    CROSS APPLY (
        SELECT COUNT(*) AS Quantidade, ROUND(AVG(CAST(l.NotaOficial AS decimal(18, 6))), 2) AS Media
        FROM LancamentosNotasAlunos l
        INNER JOIN Avaliacoes a ON a.Id = l.AvaliacaoId
        WHERE l.MatriculaId = m.Id AND a.CursoId = m.CursoId AND a.StatusPublicacao = 2 AND a.TipoAvaliacao <> 1
    ) lancadas
    WHERE m.CertificadoEmitidoEm IS NOT NULL;
    ');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127012626_CongelarERevogarCertificado'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261127012626_CongelarERevogarCertificado', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127014616_AdicionarRetiradoDaVendaEmEmCurso'
)
BEGIN
    ALTER TABLE [Cursos] ADD [RetiradoDaVendaEm] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127014616_AdicionarRetiradoDaVendaEmEmCurso'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261127014616_AdicionarRetiradoDaVendaEmEmCurso', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127015527_MarcarGratuitosAtuaisComoPublicados'
)
BEGIN

    UPDATE Cursos
    SET PublicadoParaVendaEm = SYSUTCDATETIME()
    WHERE ModeloCurso = 1
      AND EncerradoEm IS NULL
      AND PublicadoParaVendaEm IS NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127015527_MarcarGratuitosAtuaisComoPublicados'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261127015527_MarcarGratuitosAtuaisComoPublicados', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127112256_AdicionarModeloCursoOriginalEmCurso'
)
BEGIN
    ALTER TABLE [Cursos] ADD [ModeloCursoOriginal] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127112256_AdicionarModeloCursoOriginalEmCurso'
)
BEGIN

    EXEC(N'
    UPDATE Cursos
    SET ModeloCursoOriginal = 1
    WHERE ModeloCurso = 2
      AND EncerradoEm IS NOT NULL
      AND ModeloCursoOriginal IS NULL;
    ');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261127112256_AdicionarModeloCursoOriginalEmCurso'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261127112256_AdicionarModeloCursoOriginalEmCurso', N'10.0.5');
END;

COMMIT;
GO

