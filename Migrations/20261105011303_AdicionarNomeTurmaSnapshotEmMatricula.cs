using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarNomeTurmaSnapshotEmMatricula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NomeTurmaSnapshot",
                table: "Matriculas",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            // Backfill: congela o nome da turma pras matriculas que ja tinham
            // TurmaId antes da Fase B parar de usar Turma no fluxo ativo (ver
            // pendencia_fase_b_remocao_turma na memoria) - sem isso, certificados
            // antigos (pagina publica de verificacao) e o "Turma atual" do Aluno
            // perderiam esse dado quando a tabela Turmas for removida de vez.
            migrationBuilder.Sql(@"
                UPDATE m
                SET m.NomeTurmaSnapshot = t.NomeTurma
                FROM Matriculas m
                INNER JOIN Turmas t ON t.Id = m.TurmaId
                WHERE m.TurmaId IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NomeTurmaSnapshot",
                table: "Matriculas");
        }
    }
}
