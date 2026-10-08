using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarAfirmativasQuestaoEBibliografia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferenciasBibliograficasSnapshot",
                table: "QuestoesPublicadas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReferenciasBibliograficas",
                table: "QuestoesBanco",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "AfirmativasQuestoesBanco",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestaoBancoId = table.Column<int>(type: "int", nullable: false),
                    Numero = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Texto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EhCorreta = table.Column<bool>(type: "bit", nullable: false),
                    Justificativa = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Ordem = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AfirmativasQuestoesBanco", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AfirmativasQuestoesBanco_QuestoesBanco_QuestaoBancoId",
                        column: x => x.QuestaoBancoId,
                        principalTable: "QuestoesBanco",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AfirmativasQuestoesPublicadas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestaoPublicadaId = table.Column<int>(type: "int", nullable: false),
                    Numero = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Texto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EhCorreta = table.Column<bool>(type: "bit", nullable: false),
                    JustificativaSnapshot = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Ordem = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AfirmativasQuestoesPublicadas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AfirmativasQuestoesPublicadas_QuestoesPublicadas_QuestaoPublicadaId",
                        column: x => x.QuestaoPublicadaId,
                        principalTable: "QuestoesPublicadas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AfirmativasQuestoesBanco_QuestaoBancoId_Numero",
                table: "AfirmativasQuestoesBanco",
                columns: new[] { "QuestaoBancoId", "Numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AfirmativasQuestoesPublicadas_QuestaoPublicadaId_Numero",
                table: "AfirmativasQuestoesPublicadas",
                columns: new[] { "QuestaoPublicadaId", "Numero" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AfirmativasQuestoesBanco");

            migrationBuilder.DropTable(
                name: "AfirmativasQuestoesPublicadas");

            migrationBuilder.DropColumn(
                name: "ReferenciasBibliograficasSnapshot",
                table: "QuestoesPublicadas");

            migrationBuilder.DropColumn(
                name: "ReferenciasBibliograficas",
                table: "QuestoesBanco");
        }
    }
}
