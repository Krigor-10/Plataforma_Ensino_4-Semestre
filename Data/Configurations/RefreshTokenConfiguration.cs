using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder
            .ToTable("RefreshTokens");

        builder
            .Property(r => r.Token)
            .HasMaxLength(200)
            .IsRequired();

        builder
            .HasIndex(r => r.Token)
            .IsUnique();

        builder
            .HasOne(r => r.Usuario)
            .WithMany()
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
