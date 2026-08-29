using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class NotificacaoConfiguration : IEntityTypeConfiguration<Notificacao>
{
    public void Configure(EntityTypeBuilder<Notificacao> builder)
    {
        builder
            .ToTable("Notificacoes");

        builder
            .Property(n => n.Titulo)
            .HasMaxLength(150)
            .IsRequired();

        builder
            .Property(n => n.Mensagem)
            .HasMaxLength(500)
            .IsRequired();

        builder
            .Property(n => n.Link)
            .HasMaxLength(300);

        builder
            .HasOne(n => n.Usuario)
            .WithMany()
            .HasForeignKey(n => n.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasIndex(n => new { n.UsuarioId, n.Lida, n.CriadoEm });
    }
}
