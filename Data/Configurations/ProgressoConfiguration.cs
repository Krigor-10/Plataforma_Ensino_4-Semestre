using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class ProgressoConteudoAlunoConfiguration : IEntityTypeConfiguration<ProgressoConteudoAluno>
{
    public void Configure(EntityTypeBuilder<ProgressoConteudoAluno> builder)
    {
        builder
            .HasOne(p => p.Matricula)
            .WithMany(m => m.ProgressosConteudo)
            .HasForeignKey(p => p.MatriculaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(p => p.ConteudoDidatico)
            .WithMany(c => c.ProgressosAlunos)
            .HasForeignKey(p => p.ConteudoDidaticoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(p => p.Modulo)
            .WithMany(m => m.ProgressosConteudo)
            .HasForeignKey(p => p.ModuloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(p => new { p.MatriculaId, p.ConteudoDidaticoId })
            .IsUnique();

        builder
            .Property(p => p.PercentualConclusao)
            .HasPrecision(5, 2);
    }
}

public sealed class ProgressoModuloAlunoConfiguration : IEntityTypeConfiguration<ProgressoModuloAluno>
{
    public void Configure(EntityTypeBuilder<ProgressoModuloAluno> builder)
    {
        builder
            .HasOne(p => p.Matricula)
            .WithMany(m => m.ProgressosModulo)
            .HasForeignKey(p => p.MatriculaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(p => p.Modulo)
            .WithMany(m => m.ProgressosAlunos)
            .HasForeignKey(p => p.ModuloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(p => new { p.MatriculaId, p.ModuloId })
            .IsUnique();

        builder
            .Property(p => p.PercentualConclusao)
            .HasPrecision(5, 2);

        builder
            .Property(p => p.PesoConcluido)
            .HasPrecision(8, 2);

        builder
            .Property(p => p.PesoTotal)
            .HasPrecision(8, 2);

        builder
            .Property(p => p.MediaModulo)
            .HasPrecision(6, 2);
    }
}

public sealed class ProgressoCursoAlunoConfiguration : IEntityTypeConfiguration<ProgressoCursoAluno>
{
    public void Configure(EntityTypeBuilder<ProgressoCursoAluno> builder)
    {
        builder
            .HasOne(p => p.Matricula)
            .WithMany(m => m.ProgressosCurso)
            .HasForeignKey(p => p.MatriculaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(p => p.Curso)
            .WithMany(c => c.ProgressosAlunos)
            .HasForeignKey(p => p.CursoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(p => new { p.MatriculaId, p.CursoId })
            .IsUnique();

        builder
            .Property(p => p.PercentualConclusao)
            .HasPrecision(5, 2);

        builder
            .Property(p => p.PesoConcluido)
            .HasPrecision(8, 2);

        builder
            .Property(p => p.PesoTotal)
            .HasPrecision(8, 2);

        builder
            .Property(p => p.MediaCurso)
            .HasPrecision(6, 2);
    }
}
