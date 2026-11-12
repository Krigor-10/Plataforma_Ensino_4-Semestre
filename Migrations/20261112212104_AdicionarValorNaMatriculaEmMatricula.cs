using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarValorNaMatriculaEmMatricula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ValorNaMatricula",
                table: "Matriculas",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Backfill: congela no preco ATUAL do curso pra toda matricula ja
            // existente — a partir de agora, novas matriculas gravam esse valor
            // na criacao (ver MatriculaService.CriarMatriculaPendenteAsync) e o
            // acesso do aluno passa a ler esta coluna, nunca Curso.Preco ao vivo
            // (risco critico do plano fluxo-venda-cursos: sem isso, qualquer
            // curso gratuito que virasse pago tiraria o acesso de quem ja
            // estava matriculado de graca).
            migrationBuilder.Sql(@"
                UPDATE m
                SET m.ValorNaMatricula = c.Preco
                FROM Matriculas m
                INNER JOIN Cursos c ON c.Id = m.CursoId;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValorNaMatricula",
                table: "Matriculas");
        }
    }
}
