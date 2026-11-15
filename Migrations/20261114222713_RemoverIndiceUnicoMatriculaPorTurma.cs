using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class RemoverIndiceUnicoMatriculaPorTurma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Matriculas_AlunoId_TurmaId_Aprovada",
                table: "Matriculas");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Matriculas_AlunoId_TurmaId_Aprovada",
                table: "Matriculas",
                columns: new[] { "AlunoId", "TurmaId" },
                unique: true,
                filter: "[Status] = 1");
        }
    }
}
