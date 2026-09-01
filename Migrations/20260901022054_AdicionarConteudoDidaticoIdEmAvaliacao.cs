using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarConteudoDidaticoIdEmAvaliacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConteudoDidaticoId",
                table: "Avaliacoes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Avaliacoes_ConteudoDidaticoId",
                table: "Avaliacoes",
                column: "ConteudoDidaticoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Avaliacoes_ConteudosDidaticos_ConteudoDidaticoId",
                table: "Avaliacoes",
                column: "ConteudoDidaticoId",
                principalTable: "ConteudosDidaticos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Avaliacoes_ConteudosDidaticos_ConteudoDidaticoId",
                table: "Avaliacoes");

            migrationBuilder.DropIndex(
                name: "IX_Avaliacoes_ConteudoDidaticoId",
                table: "Avaliacoes");

            migrationBuilder.DropColumn(
                name: "ConteudoDidaticoId",
                table: "Avaliacoes");
        }
    }
}
