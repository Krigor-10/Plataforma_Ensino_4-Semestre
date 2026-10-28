using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class MarcaConteudoDidaticoComoExcluido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ExcluidoEm",
                table: "ConteudosDidaticos",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExcluidoEm",
                table: "ConteudosDidaticos");
        }
    }
}
