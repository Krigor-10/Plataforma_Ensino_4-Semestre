using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class CursoConfiguration : IEntityTypeConfiguration<Curso>
{
    public void Configure(EntityTypeBuilder<Curso> builder)
    {
        builder
            .HasOne(c => c.Coordenador)
            .WithMany()
            .HasForeignKey(c => c.CoordenadorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(c => c.Criador)
            .WithMany()
            .HasForeignKey(c => c.CriadoPor)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(c => c.Preco)
            .HasPrecision(10, 2);

        builder
            .Property(c => c.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(c => c.CodigoRegistro)
            .IsUnique();
    }
}

public sealed class ModuloConfiguration : IEntityTypeConfiguration<Modulo>
{
    public void Configure(EntityTypeBuilder<Modulo> builder)
    {
        builder
            .HasOne(m => m.Curso)
            .WithMany(c => c.Modulos)
            .HasForeignKey(m => m.CursoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(m => new { m.CursoId, m.Titulo })
            .IsUnique();

        builder
            .Property(m => m.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(m => m.CodigoRegistro)
            .IsUnique();
    }
}

public sealed class TurmaConfiguration : IEntityTypeConfiguration<Turma>
{
    public void Configure(EntityTypeBuilder<Turma> builder)
    {
        builder
            .HasOne(t => t.Curso)
            .WithMany(c => c.Turmas)
            .HasForeignKey(t => t.CursoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(t => t.ProfessorResponsavel)
            .WithMany()
            .HasForeignKey(t => t.ProfessorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(t => t.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(t => t.CodigoRegistro)
            .IsUnique();

        builder
            .HasIndex(t => new { t.NomeTurma, t.CursoId })
            .IsUnique();
    }
}

public sealed class MatriculaConfiguration : IEntityTypeConfiguration<Matricula>
{
    public void Configure(EntityTypeBuilder<Matricula> builder)
    {
        builder
            .HasOne(m => m.Turma)
            .WithMany(t => t.Matriculas)
            .HasForeignKey(m => m.TurmaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(m => m.Aluno)
            .WithMany(a => a.Matriculas)
            .HasForeignKey(m => m.AlunoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(m => m.Curso)
            .WithMany()
            .HasForeignKey(m => m.CursoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(m => m.NotaFinal)
            .HasPrecision(4, 2);

        builder
            .Property(m => m.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(m => m.CodigoRegistro)
            .IsUnique();

        // Impede, no nivel do banco, que o mesmo aluno fique com duas
        // matriculas Aprovada (Status = 1) na mesma turma ao mesmo tempo —
        // a checagem em memoria em MatriculaService (ObterMatriculaAprovadaNaTurmaAsync)
        // sozinha nao protege contra duas aprovacoes simultaneas da mesma
        // pendencia (ex: duplo clique, dois admins aprovando ao mesmo tempo).
        builder
            .HasIndex(m => new { m.AlunoId, m.TurmaId })
            .IsUnique()
            .HasFilter("[Status] = 1")
            .HasDatabaseName("IX_Matriculas_AlunoId_TurmaId_Aprovada");
    }
}
