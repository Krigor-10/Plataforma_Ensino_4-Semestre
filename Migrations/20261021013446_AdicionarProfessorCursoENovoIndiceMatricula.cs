using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarProfessorCursoENovoIndiceMatricula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProfessoresCursos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProfessorId = table.Column<int>(type: "int", nullable: false),
                    CursoId = table.Column<int>(type: "int", nullable: false),
                    VinculadoEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfessoresCursos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfessoresCursos_Cursos_CursoId",
                        column: x => x.CursoId,
                        principalTable: "Cursos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProfessoresCursos_Professores_ProfessorId",
                        column: x => x.ProfessorId,
                        principalTable: "Professores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Backfill: Professor-Curso passa a ser um vinculo direto (N:N),
            // substituindo Turma.ProfessorId como fonte de verdade de "quais
            // professores dao aula em qual curso". Popula a partir de todos os
            // pares distintos ja existentes em Turmas - nenhum dado novo e
            // inventado, so promovido pra uma tabela propria.
            migrationBuilder.Sql(@"
                INSERT INTO ProfessoresCursos (ProfessorId, CursoId, VinculadoEm)
                SELECT DISTINCT ProfessorId, CursoId, SYSUTCDATETIME()
                FROM Turmas;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Matriculas_AlunoId_CursoId_Aprovada",
                table: "Matriculas",
                columns: new[] { "AlunoId", "CursoId" },
                unique: true,
                filter: "[Status] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessoresCursos_CursoId",
                table: "ProfessoresCursos",
                column: "CursoId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessoresCursos_ProfessorId_CursoId",
                table: "ProfessoresCursos",
                columns: new[] { "ProfessorId", "CursoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProfessoresCursos");

            migrationBuilder.DropIndex(
                name: "IX_Matriculas_AlunoId_CursoId_Aprovada",
                table: "Matriculas");
        }
    }
}
