using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <summary>Pacote 8 da auditoria de 26/11 (decisao D4): guarda a modalidade de origem do curso convertido.</summary>
    public partial class AdicionarModeloCursoOriginalEmCurso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModeloCursoOriginal",
                table: "Cursos",
                type: "int",
                nullable: true);

            // Pacote 8 da auditoria de 26/11 (D4): antes deste pacote, o unico
            // caminho para um Pago ficar ENCERRADO era a conversao de um
            // Gratuito encerrado (Pago criado direto nao encerra). Esses ficam
            // marcados com a origem Gratuito (1). ModeloCurso 2 = Pago.
            migrationBuilder.Sql(@"
UPDATE Cursos
SET ModeloCursoOriginal = 1
WHERE ModeloCurso = 2
  AND EncerradoEm IS NOT NULL
  AND ModeloCursoOriginal IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModeloCursoOriginal",
                table: "Cursos");
        }
    }
}
