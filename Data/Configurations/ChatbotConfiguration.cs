using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class ConversaChatbotConfiguration : IEntityTypeConfiguration<ConversaChatbot>
{
    public void Configure(EntityTypeBuilder<ConversaChatbot> builder)
    {
        builder
            .ToTable("ConversasChatbot");

        builder
            .HasOne(c => c.Aluno)
            .WithMany()
            .HasForeignKey(c => c.AlunoId)
            .OnDelete(DeleteBehavior.Cascade);

        // GET /Chatbot/conversas/atual busca a mais recente do aluno - cobre
        // "WHERE AlunoId = @id ORDER BY AtualizadaEm DESC" sem table scan.
        builder
            .HasIndex(c => new { c.AlunoId, c.AtualizadaEm });
    }
}

public sealed class MensagemChatbotConfiguration : IEntityTypeConfiguration<MensagemChatbot>
{
    public void Configure(EntityTypeBuilder<MensagemChatbot> builder)
    {
        builder
            .ToTable("MensagensChatbot");

        builder
            .Property(m => m.Texto)
            .HasMaxLength(4000)
            .IsRequired();

        builder
            .Property(m => m.AcoesJson)
            .HasMaxLength(1000);

        builder
            .Property(m => m.FerramentasUsadasJson)
            .HasMaxLength(500);

        builder
            .Property(m => m.CustoUsd)
            .HasPrecision(10, 6);

        builder
            .HasOne(m => m.Conversa)
            .WithMany(c => c.Mensagens)
            .HasForeignKey(m => m.ConversaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasIndex(m => new { m.ConversaId, m.CriadoEm });

        // Soma do custo do mes (ChatbotService.ObterGastoDoMesAsync) filtra so
        // por data - indice simples basta, nao precisa incluir ConversaId.
        builder
            .HasIndex(m => m.CriadoEm);
    }
}

public sealed class ChamadoSuporteConfiguration : IEntityTypeConfiguration<ChamadoSuporte>
{
    public void Configure(EntityTypeBuilder<ChamadoSuporte> builder)
    {
        builder
            .ToTable("ChamadosSuporte");

        builder
            .Property(c => c.Resumo)
            .HasMaxLength(1000)
            .IsRequired();

        builder
            .HasOne(c => c.Aluno)
            .WithMany()
            .HasForeignKey(c => c.AlunoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(c => c.Curso)
            .WithMany()
            .HasForeignKey(c => c.CursoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(c => c.CoordenadorDestino)
            .WithMany()
            .HasForeignKey(c => c.CoordenadorDestinoId)
            .OnDelete(DeleteBehavior.Restrict);

        // So FK pra rastreio (de qual conversa o chamado se originou) - sem
        // navegacao reversa em ConversaChatbot, de proposito (chamado
        // sobrevive mesmo se a conversa for expurgada antes dele).
        builder
            .HasOne<ConversaChatbot>()
            .WithMany()
            .HasForeignKey(c => c.ConversaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(c => c.AlunoId);

        // GET /Chamados?status= do Coordenador: WHERE CoordenadorDestinoId = @id.
        builder
            .HasIndex(c => new { c.CoordenadorDestinoId, c.Status });

        // Expurgo diario: resolvidos ha mais de 90 dias.
        builder
            .HasIndex(c => c.ResolvidoEm);
    }
}

public sealed class MensagemChamadoConfiguration : IEntityTypeConfiguration<MensagemChamado>
{
    public void Configure(EntityTypeBuilder<MensagemChamado> builder)
    {
        builder
            .ToTable("MensagensChamado");

        builder
            .Property(m => m.Texto)
            .HasMaxLength(2000)
            .IsRequired();

        builder
            .HasOne(m => m.Chamado)
            .WithMany(c => c.Mensagens)
            .HasForeignKey(m => m.ChamadoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(m => m.Autor)
            .WithMany()
            .HasForeignKey(m => m.AutorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(m => new { m.ChamadoId, m.CriadoEm });
    }
}

public sealed class ConfiguracaoChatbotConfiguration : IEntityTypeConfiguration<ConfiguracaoChatbot>
{
    public void Configure(EntityTypeBuilder<ConfiguracaoChatbot> builder)
    {
        builder
            .ToTable("ConfiguracaoChatbot");

        builder
            .Property(c => c.TetoMensalUsd)
            .HasPrecision(10, 2);
    }
}
