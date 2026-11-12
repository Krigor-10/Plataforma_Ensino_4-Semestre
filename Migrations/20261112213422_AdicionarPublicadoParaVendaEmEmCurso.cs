using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPublicadoParaVendaEmEmCurso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PublicadoParaVendaEm",
                table: "Cursos",
                type: "datetime2",
                nullable: true);

            // Backfill: todo pacote pago que ja existia antes deste recurso
            // sempre esteve "a venda" (nao havia conceito de tirar da venda) -
            // sem isso, o Admin precisaria republicar manualmente todo pacote
            // ja ativo antes do deploy desta feature.
            migrationBuilder.Sql(@"
                UPDATE Cursos SET PublicadoParaVendaEm = GETUTCDATE() WHERE ModeloCurso = 2;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicadoParaVendaEm",
                table: "Cursos");
        }
    }
}
