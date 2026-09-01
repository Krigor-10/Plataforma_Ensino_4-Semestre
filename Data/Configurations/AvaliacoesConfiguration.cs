using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data.Configurations;

public sealed class QuestaoBancoConfiguration : IEntityTypeConfiguration<QuestaoBanco>
{
    public void Configure(EntityTypeBuilder<QuestaoBanco> builder)
    {
        builder
            .HasOne(q => q.ProfessorAutor)
            .WithMany(p => p.QuestoesBanco)
            .HasForeignKey(q => q.ProfessorAutorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(q => q.Contexto)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(q => q.Enunciado)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(q => q.ExplicacaoPosResposta)
            .HasColumnType("nvarchar(max)");
    }
}

public sealed class AlternativaQuestaoBancoConfiguration : IEntityTypeConfiguration<AlternativaQuestaoBanco>
{
    public void Configure(EntityTypeBuilder<AlternativaQuestaoBanco> builder)
    {
        builder
            .HasOne(a => a.QuestaoBanco)
            .WithMany(q => q.Alternativas)
            .HasForeignKey(a => a.QuestaoBancoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasIndex(a => new { a.QuestaoBancoId, a.Letra })
            .IsUnique();

        builder
            .Property(a => a.Texto)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(a => a.Justificativa)
            .HasColumnType("nvarchar(max)");
    }
}

public sealed class AnexoQuestaoBancoConfiguration : IEntityTypeConfiguration<AnexoQuestaoBanco>
{
    public void Configure(EntityTypeBuilder<AnexoQuestaoBanco> builder)
    {
        builder
            .HasOne(a => a.QuestaoBanco)
            .WithMany(q => q.Anexos)
            .HasForeignKey(a => a.QuestaoBancoId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AvaliacaoConfiguration : IEntityTypeConfiguration<Avaliacao>
{
    public void Configure(EntityTypeBuilder<Avaliacao> builder)
    {
        builder
            .HasOne(a => a.ProfessorAutor)
            .WithMany(p => p.AvaliacoesPublicadas)
            .HasForeignKey(a => a.ProfessorAutorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(a => a.Turma)
            .WithMany(t => t.Avaliacoes)
            .HasForeignKey(a => a.TurmaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(a => a.Modulo)
            .WithMany(m => m.Avaliacoes)
            .HasForeignKey(a => a.ModuloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(a => a.ConteudoDidatico)
            .WithMany()
            .HasForeignKey(a => a.ConteudoDidaticoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(a => a.NotaMaxima)
            .HasPrecision(6, 2);

        builder
            .Property(a => a.PesoNota)
            .HasPrecision(6, 2);

        builder
            .Property(a => a.PesoProgresso)
            .HasPrecision(6, 2);
    }
}

public sealed class QuestaoPublicadaConfiguration : IEntityTypeConfiguration<QuestaoPublicada>
{
    public void Configure(EntityTypeBuilder<QuestaoPublicada> builder)
    {
        builder
            .HasOne(q => q.Avaliacao)
            .WithMany(a => a.Questoes)
            .HasForeignKey(q => q.AvaliacaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(q => q.QuestaoBanco)
            .WithMany(qb => qb.QuestoesPublicadas)
            .HasForeignKey(q => q.QuestaoBancoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(q => new { q.AvaliacaoId, q.Ordem })
            .IsUnique();

        builder
            .Property(q => q.ContextoSnapshot)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(q => q.EnunciadoSnapshot)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(q => q.ExplicacaoSnapshot)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(q => q.Pontos)
            .HasPrecision(6, 2);
    }
}

public sealed class AlternativaQuestaoPublicadaConfiguration : IEntityTypeConfiguration<AlternativaQuestaoPublicada>
{
    public void Configure(EntityTypeBuilder<AlternativaQuestaoPublicada> builder)
    {
        builder
            .HasOne(a => a.QuestaoPublicada)
            .WithMany(q => q.Alternativas)
            .HasForeignKey(a => a.QuestaoPublicadaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasIndex(a => new { a.QuestaoPublicadaId, a.Letra })
            .IsUnique();

        builder
            .Property(a => a.Texto)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(a => a.JustificativaSnapshot)
            .HasColumnType("nvarchar(max)");
    }
}

public sealed class TentativaAvaliacaoConfiguration : IEntityTypeConfiguration<TentativaAvaliacao>
{
    public void Configure(EntityTypeBuilder<TentativaAvaliacao> builder)
    {
        builder
            .HasOne(t => t.Avaliacao)
            .WithMany(a => a.Tentativas)
            .HasForeignKey(t => t.AvaliacaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(t => t.Matricula)
            .WithMany(m => m.TentativasAvaliacao)
            .HasForeignKey(t => t.MatriculaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(t => new { t.MatriculaId, t.AvaliacaoId, t.NumeroTentativa })
            .IsUnique();

        builder
            .Property(t => t.NotaBruta)
            .HasPrecision(6, 2);
    }
}

public sealed class RespostaAlunoConfiguration : IEntityTypeConfiguration<RespostaAluno>
{
    public void Configure(EntityTypeBuilder<RespostaAluno> builder)
    {
        builder
            .HasOne(r => r.TentativaAvaliacao)
            .WithMany(t => t.Respostas)
            .HasForeignKey(r => r.TentativaAvaliacaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(r => r.QuestaoPublicada)
            .WithMany(q => q.Respostas)
            .HasForeignKey(r => r.QuestaoPublicadaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(r => r.AlternativaQuestaoPublicada)
            .WithMany()
            .HasForeignKey(r => r.AlternativaQuestaoPublicadaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(r => new { r.TentativaAvaliacaoId, r.QuestaoPublicadaId })
            .IsUnique();

        builder
            .Property(r => r.RespostaTexto)
            .HasColumnType("nvarchar(max)");

        builder
            .Property(r => r.PontosObtidos)
            .HasPrecision(6, 2);
    }
}

public sealed class LancamentoNotaAlunoConfiguration : IEntityTypeConfiguration<LancamentoNotaAluno>
{
    public void Configure(EntityTypeBuilder<LancamentoNotaAluno> builder)
    {
        builder
            .HasOne(l => l.Matricula)
            .WithMany(m => m.LancamentosNota)
            .HasForeignKey(l => l.MatriculaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Avaliacao)
            .WithMany(a => a.LancamentosNota)
            .HasForeignKey(l => l.AvaliacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(l => l.Modulo)
            .WithMany(m => m.LancamentosNota)
            .HasForeignKey(l => l.ModuloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(l => l.TentativaAvaliacao)
            .WithMany()
            .HasForeignKey(l => l.TentativaAvaliacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(l => l.ProfessorResponsavel)
            .WithMany(p => p.LancamentosNota)
            .HasForeignKey(l => l.ProfessorResponsavelId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasIndex(l => new { l.MatriculaId, l.AvaliacaoId })
            .IsUnique();

        builder
            .Property(l => l.NotaOficial)
            .HasPrecision(6, 2);

        builder
            .Property(l => l.PesoNota)
            .HasPrecision(6, 2);

        builder
            .Property(l => l.FeedbackProfessor)
            .HasColumnType("nvarchar(max)");
    }
}
