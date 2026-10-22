using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarCursoIdEmAvaliacoesEConteudos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CursoId",
                table: "ConteudosDidaticos",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CursoId",
                table: "Avaliacoes",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE a
                SET a.CursoId = COALESCE(m.CursoId, t.CursoId)
                FROM Avaliacoes a
                LEFT JOIN Modulos m ON m.Id = a.ModuloId
                LEFT JOIN Turmas t ON t.Id = a.TurmaId;
            ");

            migrationBuilder.Sql(@"
                UPDATE c
                SET c.CursoId = COALESCE(m.CursoId, t.CursoId)
                FROM ConteudosDidaticos c
                LEFT JOIN Modulos m ON m.Id = c.ModuloId
                LEFT JOIN Turmas t ON t.Id = c.TurmaId;
            ");

            migrationBuilder.AlterColumn<int>(
                name: "CursoId",
                table: "Avaliacoes",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CursoId",
                table: "ConteudosDidaticos",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConteudosDidaticos_CursoId",
                table: "ConteudosDidaticos",
                column: "CursoId");

            migrationBuilder.CreateIndex(
                name: "IX_Avaliacoes_CursoId",
                table: "Avaliacoes",
                column: "CursoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Avaliacoes_Cursos_CursoId",
                table: "Avaliacoes",
                column: "CursoId",
                principalTable: "Cursos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ConteudosDidaticos_Cursos_CursoId",
                table: "ConteudosDidaticos",
                column: "CursoId",
                principalTable: "Cursos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Avaliacoes_Cursos_CursoId",
                table: "Avaliacoes");

            migrationBuilder.DropForeignKey(
                name: "FK_ConteudosDidaticos_Cursos_CursoId",
                table: "ConteudosDidaticos");

            migrationBuilder.DropIndex(
                name: "IX_ConteudosDidaticos_CursoId",
                table: "ConteudosDidaticos");

            migrationBuilder.DropIndex(
                name: "IX_Avaliacoes_CursoId",
                table: "Avaliacoes");

            migrationBuilder.DropColumn(
                name: "CursoId",
                table: "ConteudosDidaticos");

            migrationBuilder.DropColumn(
                name: "CursoId",
                table: "Avaliacoes");
        }
    }
}
