using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class ConteudoDidaticoConfiguration : IEntityTypeConfiguration<ConteudoDidatico>
{
    public void Configure(EntityTypeBuilder<ConteudoDidatico> builder)
    {
        builder
            .HasOne(c => c.ProfessorAutor)
            .WithMany(p => p.ConteudosDidaticos)
            .HasForeignKey(c => c.ProfessorAutorId)
            .OnDelete(DeleteBehavior.Restrict);

        // NO_ACTION (nao Cascade): TurmaService.ExcluirTurmaAsync ja bloqueia a
        // exclusao da turma quando ha conteudo vinculado, entao essa cascata nunca
        // deveria disparar de verdade — trocado por endurecimento defensivo (achado
        // da auditoria de banco 2026-09-04), pra nao apagar conteudos em silencio
        // caso algum caminho futuro pule essa checagem do Service.
        builder
            .HasOne(c => c.Turma)
            .WithMany(t => t.ConteudosDidaticos)
            .HasForeignKey(c => c.TurmaId)
            .OnDelete(DeleteBehavior.NoAction);

        builder
            .HasOne(c => c.Modulo)
            .WithMany(m => m.ConteudosDidaticos)
            .HasForeignKey(c => c.ModuloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(c => c.CorpoTexto)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(c => c.PesoProgresso)
            .HasPrecision(6, 2);
    }
}
