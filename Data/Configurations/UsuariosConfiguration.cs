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
