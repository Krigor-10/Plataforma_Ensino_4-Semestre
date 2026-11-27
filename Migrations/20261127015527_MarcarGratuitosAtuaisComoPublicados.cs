using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <summary>
    /// Migracao SO de dados (pacote 7 da auditoria de 26/11 + regra de 25/11,
    /// "Gratuito e Pago so chegam completos"): o Gratuito passa a aparecer no
    /// catalogo e a aceitar matricula nova so se estiver PUBLICADO. Para nada
    /// sumir de repente, todo Gratuito que hoje aparece (nao encerrado e ainda
    /// nao publicado) fica marcado como publicado agora. Com a trava nova, eles
    /// ficam travados para edicao; se um professor ainda precisar completar
    /// algum, o Admin tira do catalogo e o curso volta a aceitar edicao.
    /// </summary>
    public partial class MarcarGratuitosAtuaisComoPublicados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ModeloCurso 1 = Gratuito.
            migrationBuilder.Sql(@"
UPDATE Cursos
SET PublicadoParaVendaEm = SYSUTCDATETIME()
WHERE ModeloCurso = 1
  AND EncerradoEm IS NULL
  AND PublicadoParaVendaEm IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sem volta automatica: nao ha como saber quais Gratuitos foram
            // marcados por esta migracao e quais o Admin publicou depois.
        }
    }
}
