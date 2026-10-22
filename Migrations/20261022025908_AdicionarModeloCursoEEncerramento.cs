using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarModeloCursoEEncerramento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ConcluidoPeloProfessorEm",
                table: "Cursos",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ConcluidoPeloProfessorId",
                table: "Cursos",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EncerradoEm",
                table: "Cursos",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EncerradoPorId",
                table: "Cursos",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModeloCurso",
                table: "Cursos",
                type: "int",
                nullable: true);

            // Backfill: cursos existentes nunca foram classificados por modelo —
            // infere a partir do Preco (mesma regra usada em
            // CursoService.InferirModeloPorPreco). Nenhum curso existente vira
            // "Acompanhado" (3) automaticamente; isso so passa a existir daqui
            // pra frente, por escolha explicita do Admin/Coordenador.
            migrationBuilder.Sql(@"
                UPDATE Cursos
                SET ModeloCurso = CASE WHEN Preco <= 0 THEN 1 ELSE 2 END;
            ");

            migrationBuilder.AlterColumn<int>(
                name: "ModeloCurso",
                table: "Cursos",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cursos_ConcluidoPeloProfessorId",
                table: "Cursos",
                column: "ConcluidoPeloProfessorId");

            migrationBuilder.CreateIndex(
                name: "IX_Cursos_EncerradoPorId",
                table: "Cursos",
                column: "EncerradoPorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cursos_Coordenadores_EncerradoPorId",
                table: "Cursos",
                column: "EncerradoPorId",
                principalTable: "Coordenadores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Cursos_Professores_ConcluidoPeloProfessorId",
                table: "Cursos",
                column: "ConcluidoPeloProfessorId",
                principalTable: "Professores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cursos_Coordenadores_EncerradoPorId",
                table: "Cursos");

            migrationBuilder.DropForeignKey(
                name: "FK_Cursos_Professores_ConcluidoPeloProfessorId",
                table: "Cursos");

            migrationBuilder.DropIndex(
                name: "IX_Cursos_ConcluidoPeloProfessorId",
                table: "Cursos");

            migrationBuilder.DropIndex(
                name: "IX_Cursos_EncerradoPorId",
                table: "Cursos");

            migrationBuilder.DropColumn(
                name: "ConcluidoPeloProfessorEm",
                table: "Cursos");

            migrationBuilder.DropColumn(
                name: "ConcluidoPeloProfessorId",
                table: "Cursos");

            migrationBuilder.DropColumn(
                name: "EncerradoEm",
                table: "Cursos");

            migrationBuilder.DropColumn(
                name: "EncerradoPorId",
                table: "Cursos");

            migrationBuilder.DropColumn(
                name: "ModeloCurso",
                table: "Cursos");
        }
    }
}
