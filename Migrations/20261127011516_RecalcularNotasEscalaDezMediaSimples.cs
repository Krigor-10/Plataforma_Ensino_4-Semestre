using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <summary>
    /// Migracao SO de dados (sem mudanca de estrutura) das decisoes F0 e F1
    /// da auditoria de 26/11 (docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-
    /// 2026-11-26.md, bloco 3): recalcula as notas que ja existem com a regra
    /// nova, a mesma que o servidor passou a usar.
    ///
    /// 1. Toda avaliacao vale de 0 a 10 com peso 1 (NotaMaxima = 10, PesoNota = 1).
    /// 2. Tentativa corrigida: nota = pontos obtidos / pontos das questoes
    ///    respondidas x 10 (antes era a soma dos pontos, sem relacao com a
    ///    NotaMaxima - 4 questoes de 1 ponto davam 4 de 10 acertando tudo).
    /// 3. Lancamento de nota aponta para a MELHOR tentativa corrigida
    ///    (empate fica com a mais recente), com peso 1.
    /// 4. Media do modulo e do curso = media SIMPLES das notas lancadas das
    ///    Provas/Exercicios publicados (quiz fora, como antes).
    /// 5. Nota final da matricula aprovada so quando todas as Provas/
    ///    Exercicios publicados do curso tem nota (mesma regra de antes).
    ///
    /// Certificados ja emitidos nao sao tocados. Sem volta: a nota antiga em
    /// pontos nao e guardada (o Down nao faz nada).
    /// </summary>
    public partial class RecalcularNotasEscalaDezMediaSimples : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Escala 0-10 e peso unico em todas as avaliacoes.
            migrationBuilder.Sql(@"
UPDATE Avaliacoes
SET NotaMaxima = 10, PesoNota = 1
WHERE NotaMaxima <> 10 OR PesoNota <> 1;");

            // 2. Tentativas corrigidas (StatusTentativa 3) na escala 0-10 pela
            // proporcao dos pontos das questoes respondidas naquela tentativa.
            migrationBuilder.Sql(@"
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
WHERE t.StatusTentativa = 3;");

            // 3. Lancamento de nota = melhor tentativa corrigida, peso 1.
            migrationBuilder.Sql(@"
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

UPDATE LancamentosNotasAlunos SET PesoNota = 1 WHERE PesoNota <> 1;");

            // 4a. Media do modulo (Provas/Exercicios publicados do modulo).
            migrationBuilder.Sql(@"
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
) medias;");

            // 4b. Media do curso (Provas/Exercicios publicados do curso).
            migrationBuilder.Sql(@"
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
) medias;");

            // 5. Nota final: matricula aprovada (Status 1) com todas as
            // Provas/Exercicios publicados do curso com nota lancada.
            migrationBuilder.Sql(@"
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
  AND lancadas.Quantidade = publicadas.Total;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sem volta: a nota antiga (soma de pontos) nao foi guardada.
        }
    }
}
