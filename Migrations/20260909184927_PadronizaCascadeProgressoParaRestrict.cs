using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class PadronizaCascadeProgressoParaRestrict : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProgressosCursosAlunos_Matriculas_MatriculaId",
                table: "ProgressosCursosAlunos");

            migrationBuilder.DropForeignKey(
                name: "FK_ProgressosModulosAlunos_Matriculas_MatriculaId",
                table: "ProgressosModulosAlunos");

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressosCursosAlunos_Matriculas_MatriculaId",
                table: "ProgressosCursosAlunos",
                column: "MatriculaId",
                principalTable: "Matriculas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressosModulosAlunos_Matriculas_MatriculaId",
                table: "ProgressosModulosAlunos",
                column: "MatriculaId",
                principalTable: "Matriculas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProgressosCursosAlunos_Matriculas_MatriculaId",
                table: "ProgressosCursosAlunos");

            migrationBuilder.DropForeignKey(
                name: "FK_ProgressosModulosAlunos_Matriculas_MatriculaId",
                table: "ProgressosModulosAlunos");

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressosCursosAlunos_Matriculas_MatriculaId",
                table: "ProgressosCursosAlunos",
                column: "MatriculaId",
                principalTable: "Matriculas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressosModulosAlunos_Matriculas_MatriculaId",
                table: "ProgressosModulosAlunos",
                column: "MatriculaId",
                principalTable: "Matriculas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
