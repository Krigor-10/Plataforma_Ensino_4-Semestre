using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data;

public class PlataformaContext : DbContext
{
    public PlataformaContext(DbContextOptions<PlataformaContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Aluno> Alunos { get; set; }
    public DbSet<Professor> Professores { get; set; }
    public DbSet<Coordenador> Coordenadores { get; set; }
    public DbSet<Admin> Admins { get; set; }
    public DbSet<Curso> Cursos { get; set; }
    public DbSet<Modulo> Modulos { get; set; }
    public DbSet<Turma> Turmas { get; set; }
    public DbSet<Matricula> Matriculas { get; set; }
    public DbSet<Pagamento> Pagamentos { get; set; }
    public DbSet<ConteudoDidatico> ConteudosDidaticos { get; set; }
    public DbSet<QuestaoBanco> QuestoesBanco { get; set; }
    public DbSet<AlternativaQuestaoBanco> AlternativasQuestoesBanco { get; set; }
    public DbSet<AnexoQuestaoBanco> AnexosQuestoesBanco { get; set; }
    public DbSet<Avaliacao> Avaliacoes { get; set; }
    public DbSet<QuestaoPublicada> QuestoesPublicadas { get; set; }
    public DbSet<AlternativaQuestaoPublicada> AlternativasQuestoesPublicadas { get; set; }
    public DbSet<TentativaAvaliacao> TentativasAvaliacao { get; set; }
    public DbSet<RespostaAluno> RespostasAlunos { get; set; }
    public DbSet<LancamentoNotaAluno> LancamentosNotasAlunos { get; set; }
    public DbSet<ProgressoConteudoAluno> ProgressosConteudosAlunos { get; set; }
    public DbSet<ProgressoModuloAluno> ProgressosModulosAlunos { get; set; }
    public DbSet<ProgressoCursoAluno> ProgressosCursosAlunos { get; set; }
    public DbSet<MarcoProgressoAluno> MarcosProgressosAlunos { get; set; }
    public DbSet<FeedbackAcademico> FeedbacksAcademicos { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<Notificacao> Notificacoes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PlataformaContext).Assembly);
    }
}
