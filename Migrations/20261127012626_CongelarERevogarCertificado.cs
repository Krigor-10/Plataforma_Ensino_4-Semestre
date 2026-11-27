using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class CongelarERevogarCertificado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CertificadoRevogadoEm",
                table: "Matriculas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CertificadoRevogadoPorId",
                table: "Matriculas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotivoRevogacaoCertificado",
                table: "Matriculas",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomeAlunoCertificado",
                table: "Matriculas",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NotaFinalCertificado",
                table: "Matriculas",
                type: "decimal(4,2)",
                precision: 4,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TituloCursoCertificado",
                table: "Matriculas",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            // Certificados JA EMITIDOS: congela os dados de hoje (decisao F2 da
            // auditoria de 26/11). Nota (decisao registrada no relatorio, pacote
            // 4): se o curso nao tem Prova/Exercicio publicado ou a nota final
            // ja esta completa, usa a nota final; se ainda falta nota em alguma
            // prova (nota final antiga, da regra anterior a escala 0-10), usa a
            // media simples das provas que tem nota hoje.
            migrationBuilder.Sql(@"
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
WHERE m.CertificadoEmitidoEm IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CertificadoRevogadoEm",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "CertificadoRevogadoPorId",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "MotivoRevogacaoCertificado",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "NomeAlunoCertificado",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "NotaFinalCertificado",
                table: "Matriculas");

            migrationBuilder.DropColumn(
                name: "TituloCursoCertificado",
                table: "Matriculas");
        }
    }
}
