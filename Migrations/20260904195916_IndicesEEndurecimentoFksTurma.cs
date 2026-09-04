using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class IndicesEEndurecimentoFksTurma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Avaliacoes_Turmas_TurmaId",
                table: "Avaliacoes");

            migrationBuilder.DropForeignKey(
                name: "FK_ConteudosDidaticos_Turmas_TurmaId",
                table: "ConteudosDidaticos");

            migrationBuilder.CreateIndex(
                name: "IX_Matriculas_AlunoId",
                table: "Matriculas",
                column: "AlunoId");

            // Cursos.CoordenadorId/CriadoPor: o EF Core ja declarava esses indices
            // implicitamente no modelo (indice automatico de FK) desde a criacao da
            // entidade Curso, mas a migration original nunca os aplicou de fato no
            // banco fisico — por isso "dotnet ef migrations add" nao gera CreateIndex
            // pra eles (o modelo nao mudou), mesmo eles nao existindo no banco. Achado
            // da auditoria de banco 2026-09-04 (verificado direto via sqlcmd contra o
            // LocalDB), adicionado manualmente aqui.
            migrationBuilder.CreateIndex(
                name: "IX_Cursos_CoordenadorId",
                table: "Cursos",
                column: "CoordenadorId");

            migrationBuilder.CreateIndex(
                name: "IX_Cursos_CriadoPor",
                table: "Cursos",
                column: "CriadoPor");

            migrationBuilder.AddForeignKey(
                name: "FK_Avaliacoes_Turmas_TurmaId",
                table: "Avaliacoes",
                column: "TurmaId",
                principalTable: "Turmas",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ConteudosDidaticos_Turmas_TurmaId",
                table: "ConteudosDidaticos",
                column: "TurmaId",
                principalTable: "Turmas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Avaliacoes_Turmas_TurmaId",
                table: "Avaliacoes");

            migrationBuilder.DropForeignKey(
                name: "FK_ConteudosDidaticos_Turmas_TurmaId",
                table: "ConteudosDidaticos");

            migrationBuilder.DropIndex(
                name: "IX_Matriculas_AlunoId",
                table: "Matriculas");

            migrationBuilder.DropIndex(
                name: "IX_Cursos_CoordenadorId",
                table: "Cursos");

            migrationBuilder.DropIndex(
                name: "IX_Cursos_CriadoPor",
                table: "Cursos");

            migrationBuilder.AddForeignKey(
                name: "FK_Avaliacoes_Turmas_TurmaId",
                table: "Avaliacoes",
                column: "TurmaId",
                principalTable: "Turmas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ConteudosDidaticos_Turmas_TurmaId",
                table: "ConteudosDidaticos",
                column: "TurmaId",
                principalTable: "Turmas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
