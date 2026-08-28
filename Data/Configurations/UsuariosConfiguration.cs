using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder
            .ToTable("Usuarios");

        builder
            .Property(u => u.TipoUsuario)
            .HasMaxLength(40)
            .IsRequired();

        builder
            .Property(u => u.Email)
            .HasMaxLength(180)
            .IsRequired();

        builder
            .HasIndex(u => u.Email)
            .IsUnique();

        builder
            .HasIndex(u => u.Cpf)
            .IsUnique();
    }
}

public sealed class AlunoConfiguration : IEntityTypeConfiguration<Aluno>
{
    public void Configure(EntityTypeBuilder<Aluno> builder)
    {
        builder.ToTable("Alunos");
    }
}

public sealed class ProfessorConfiguration : IEntityTypeConfiguration<Professor>
{
    public void Configure(EntityTypeBuilder<Professor> builder)
    {
        builder.ToTable("Professores");

        builder
            .Property(p => p.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(p => p.CodigoRegistro)
            .IsUnique();
    }
}

public sealed class CoordenadorConfiguration : IEntityTypeConfiguration<Coordenador>
{
    public void Configure(EntityTypeBuilder<Coordenador> builder)
    {
        builder.ToTable("Coordenadores");

        builder
            .Property(c => c.CodigoRegistro)
            .HasMaxLength(16)
            .IsRequired();

        builder
            .HasIndex(c => c.CodigoRegistro)
            .IsUnique();
    }
}

public sealed class AdminConfiguration : IEntityTypeConfiguration<Admin>
{
    public void Configure(EntityTypeBuilder<Admin> builder)
    {
        builder.ToTable("Admins");
    }
}

public sealed class FeedbackAcademicoConfiguration : IEntityTypeConfiguration<FeedbackAcademico>
{
    public void Configure(EntityTypeBuilder<FeedbackAcademico> builder)
    {
        builder
            .Property(f => f.Origem)
            .HasMaxLength(120)
            .IsRequired();

        builder
            .Property(f => f.Mensagem)
            .HasMaxLength(1000)
            .IsRequired();

        builder
            .HasOne(f => f.Destinatario)
            .WithMany(u => u.FeedbacksRecebidos)
            .HasForeignKey(f => f.DestinatarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(f => f.Autor)
            .WithMany(u => u.FeedbacksEnviados)
            .HasForeignKey(f => f.AutorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(f => new { f.DestinatarioId, f.CriadoEm });
    }
}
