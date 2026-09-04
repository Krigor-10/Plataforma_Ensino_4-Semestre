using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class RemoverMarcoProgressoAluno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MarcosProgressosAlunos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MarcosProgressosAlunos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CursoId = table.Column<int>(type: "int", nullable: false),
                    MatriculaId = table.Column<int>(type: "int", nullable: false),
                    ModuloId = table.Column<int>(type: "int", nullable: true),
                    Escopo = table.Column<int>(type: "int", nullable: false),
                    GeradoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Observacao = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Origem = table.Column<int>(type: "int", nullable: false),
                    PercentualMarco = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    ProcessadoEm = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReferenciaId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarcosProgressosAlunos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MarcosProgressosAlunos_Cursos_CursoId",
                        column: x => x.CursoId,
                        principalTable: "Cursos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MarcosProgressosAlunos_Matriculas_MatriculaId",
                        column: x => x.MatriculaId,
                        principalTable: "Matriculas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MarcosProgressosAlunos_Modulos_ModuloId",
                        column: x => x.ModuloId,
                        principalTable: "Modulos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MarcosProgressosAlunos_CursoId",
                table: "MarcosProgressosAlunos",
                column: "CursoId");

            migrationBuilder.CreateIndex(
                name: "IX_MarcosProgressosAlunos_MatriculaId_Escopo_CursoId_ModuloId_PercentualMarco",
                table: "MarcosProgressosAlunos",
                columns: new[] { "MatriculaId", "Escopo", "CursoId", "ModuloId", "PercentualMarco" });

            migrationBuilder.CreateIndex(
                name: "IX_MarcosProgressosAlunos_ModuloId",
                table: "MarcosProgressosAlunos",
                column: "ModuloId");
        }
    }
}
