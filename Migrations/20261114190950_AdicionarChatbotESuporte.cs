using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sistema_Academico_Integrado.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarChatbotESuporte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConfiguracaoChatbot",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ativo = table.Column<bool>(type: "bit", nullable: false),
                    TetoMensalUsd = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    UltimoAvisoTetoEm = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracaoChatbot", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ConversasChatbot",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AlunoId = table.Column<int>(type: "int", nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AtualizadaEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversasChatbot", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConversasChatbot_Alunos_AlunoId",
                        column: x => x.AlunoId,
                        principalTable: "Alunos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ChamadosSuporte",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AlunoId = table.Column<int>(type: "int", nullable: false),
                    CursoId = table.Column<int>(type: "int", nullable: true),
                    CoordenadorDestinoId = table.Column<int>(type: "int", nullable: true),
                    ConversaId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Resumo = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvidoEm = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChamadosSuporte", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChamadosSuporte_Alunos_AlunoId",
                        column: x => x.AlunoId,
                        principalTable: "Alunos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChamadosSuporte_ConversasChatbot_ConversaId",
                        column: x => x.ConversaId,
                        principalTable: "ConversasChatbot",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChamadosSuporte_Coordenadores_CoordenadorDestinoId",
                        column: x => x.CoordenadorDestinoId,
                        principalTable: "Coordenadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChamadosSuporte_Cursos_CursoId",
                        column: x => x.CursoId,
                        principalTable: "Cursos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MensagensChatbot",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConversaId = table.Column<int>(type: "int", nullable: false),
                    Papel = table.Column<int>(type: "int", nullable: false),
                    Texto = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    AcoesJson = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FerramentasUsadasJson = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SemResposta = table.Column<bool>(type: "bit", nullable: false),
                    TokensEntrada = table.Column<int>(type: "int", nullable: false),
                    TokensSaida = table.Column<int>(type: "int", nullable: false),
                    TokensCacheLeitura = table.Column<int>(type: "int", nullable: false),
                    TokensCacheEscrita = table.Column<int>(type: "int", nullable: false),
                    CustoUsd = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false),
                    Util = table.Column<bool>(type: "bit", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MensagensChatbot", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MensagensChatbot_ConversasChatbot_ConversaId",
                        column: x => x.ConversaId,
                        principalTable: "ConversasChatbot",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MensagensChamado",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChamadoId = table.Column<int>(type: "int", nullable: false),
                    AutorId = table.Column<int>(type: "int", nullable: false),
                    Texto = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MensagensChamado", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MensagensChamado_ChamadosSuporte_ChamadoId",
                        column: x => x.ChamadoId,
                        principalTable: "ChamadosSuporte",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MensagensChamado_Usuarios_AutorId",
                        column: x => x.AutorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChamadosSuporte_AlunoId",
                table: "ChamadosSuporte",
                column: "AlunoId");

            migrationBuilder.CreateIndex(
                name: "IX_ChamadosSuporte_ConversaId",
                table: "ChamadosSuporte",
                column: "ConversaId");

            migrationBuilder.CreateIndex(
                name: "IX_ChamadosSuporte_CoordenadorDestinoId_Status",
                table: "ChamadosSuporte",
                columns: new[] { "CoordenadorDestinoId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ChamadosSuporte_CursoId",
                table: "ChamadosSuporte",
                column: "CursoId");

            migrationBuilder.CreateIndex(
                name: "IX_ChamadosSuporte_ResolvidoEm",
                table: "ChamadosSuporte",
                column: "ResolvidoEm");

            migrationBuilder.CreateIndex(
                name: "IX_ConversasChatbot_AlunoId_AtualizadaEm",
                table: "ConversasChatbot",
                columns: new[] { "AlunoId", "AtualizadaEm" });

            migrationBuilder.CreateIndex(
                name: "IX_MensagensChamado_AutorId",
                table: "MensagensChamado",
                column: "AutorId");

            migrationBuilder.CreateIndex(
                name: "IX_MensagensChamado_ChamadoId_CriadoEm",
                table: "MensagensChamado",
                columns: new[] { "ChamadoId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_MensagensChatbot_ConversaId_CriadoEm",
                table: "MensagensChatbot",
                columns: new[] { "ConversaId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_MensagensChatbot_CriadoEm",
                table: "MensagensChatbot",
                column: "CriadoEm");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracaoChatbot");

            migrationBuilder.DropTable(
                name: "MensagensChamado");

            migrationBuilder.DropTable(
                name: "MensagensChatbot");

            migrationBuilder.DropTable(
                name: "ChamadosSuporte");

            migrationBuilder.DropTable(
                name: "ConversasChatbot");
        }
    }
}
