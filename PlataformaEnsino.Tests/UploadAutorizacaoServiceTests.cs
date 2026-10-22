using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class UploadAutorizacaoServiceTests
{
    private static UploadAutorizacaoService CriarService(PlataformaContext context) =>
        new(context, new AcessoAcademicoService(context));

    private static Professor CriarProfessor(PlataformaContext context)
    {
        var professor = new Professor
        {
            Nome = "Professor Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Especialidade = "Testes",
            CodigoRegistro = $"PROF-{Guid.NewGuid():N}"[..10]
        };
        professor.ConfigurarAcesso("Professor", "hash-fake");

        context.Professores.Add(professor);
        context.SaveChanges();
        return professor;
    }

    private static Aluno CriarAluno(PlataformaContext context)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "22233344455",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = "ALU-0001"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context, decimal preco = 0) =>
        Salvar(context, new Curso { Titulo = "Curso Teste", CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9], Preco = preco });

    private static Turma CriarTurma(PlataformaContext context, int cursoId, int professorId) =>
        Salvar(context, new Turma { NomeTurma = "Turma Teste", CodigoRegistro = $"TUR-{Guid.NewGuid():N}"[..9], CursoId = cursoId, ProfessorId = professorId });

    private static Modulo CriarModulo(PlataformaContext context, int cursoId) =>
        Salvar(context, new Modulo { Titulo = "Modulo Teste", CodigoRegistro = $"MOD-{Guid.NewGuid():N}"[..9], CursoId = cursoId });

    private static Matricula CriarMatriculaAprovada(PlataformaContext context, int alunoId, int cursoId, int turmaId)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.VincularTurma(turmaId);
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static ConteudoDidatico CriarConteudo(PlataformaContext context, int professorId, int turmaId, int moduloId, int cursoId, string arquivoUrl)
    {
        var conteudo = new ConteudoDidatico
        {
            Titulo = "Conteudo Teste",
            TipoConteudo = TipoConteudoDidatico.Pdf,
            ArquivoUrl = arquivoUrl,
            TurmaId = turmaId,
            ModuloId = moduloId
        };
        conteudo.DefinirProfessorAutor(professorId);
        conteudo.DefinirCurso(cursoId);
        context.ConteudosDidaticos.Add(conteudo);
        context.SaveChanges();
        return conteudo;
    }

    private static (QuestaoBanco Banco, AnexoQuestaoBanco Anexo) CriarQuestaoComAnexo(PlataformaContext context, int professorId, string arquivoUrl)
    {
        var banco = new QuestaoBanco
        {
            ProfessorAutorId = professorId,
            TituloInterno = "Questao Teste",
            Enunciado = "Enunciado",
            TipoQuestao = TipoQuestao.Dissertativa,
            Ativa = true
        };
        context.QuestoesBanco.Add(banco);
        context.SaveChanges();

        var anexo = new AnexoQuestaoBanco
        {
            QuestaoBancoId = banco.Id,
            Titulo = "Anexo Teste",
            TipoAnexo = "Pdf",
            ArquivoUrl = arquivoUrl
        };
        context.AnexosQuestoesBanco.Add(anexo);
        context.SaveChanges();

        return (banco, anexo);
    }

    private static QuestaoPublicada PublicarQuestao(PlataformaContext context, int questaoBancoId, int avaliacaoId)
    {
        var questao = new QuestaoPublicada
        {
            AvaliacaoId = avaliacaoId,
            QuestaoBancoId = questaoBancoId,
            Ordem = 1,
            EnunciadoSnapshot = "Enunciado"
        };
        context.QuestoesPublicadas.Add(questao);
        context.SaveChanges();
        return questao;
    }

    private static Avaliacao CriarAvaliacao(PlataformaContext context, int professorId, int turmaId, int cursoId)
    {
        var avaliacao = new Avaliacao { Titulo = "Avaliacao Teste", TurmaId = turmaId };
        avaliacao.DefinirAutor(professorId);
        avaliacao.DefinirCurso(cursoId);
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();
        return avaliacao;
    }

    private static T Salvar<T>(PlataformaContext context, T entidade) where T : class
    {
        context.Set<T>().Add(entidade);
        context.SaveChanges();
        return entidade;
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_ConteudoComAcessoLiberado_RetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var modulo = CriarModulo(context, curso.Id);
        var aluno = CriarAluno(context);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        var conteudo = CriarConteudo(context, professor.Id, turma.Id, modulo.Id, curso.Id, "/uploads/conteudos/arquivo-1.pdf");

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("conteudos", "arquivo-1.pdf", aluno.Id);

        Assert.True(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_MatriculaSemTurma_RetornaTrue()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar liberando download do conteudo do curso.
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var modulo = CriarModulo(context, curso.Id);
        var aluno = CriarAluno(context);
        var matriculaSemTurma = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matriculaSemTurma.Aprovar();
        context.Matriculas.Add(matriculaSemTurma);
        context.SaveChanges();
        CriarConteudo(context, professor.Id, turma.Id, modulo.Id, curso.Id, "/uploads/conteudos/arquivo-sem-turma.pdf");

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("conteudos", "arquivo-sem-turma.pdf", aluno.Id);

        Assert.True(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_SemMatriculaNaTurma_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var modulo = CriarModulo(context, curso.Id);
        var aluno = CriarAluno(context);
        CriarConteudo(context, professor.Id, turma.Id, modulo.Id, curso.Id, "/uploads/conteudos/arquivo-2.pdf");

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("conteudos", "arquivo-2.pdf", aluno.Id);

        Assert.False(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_CursoPagoSemPagamentoConfirmado_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context, preco: 199.90m);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var modulo = CriarModulo(context, curso.Id);
        var aluno = CriarAluno(context);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        CriarConteudo(context, professor.Id, turma.Id, modulo.Id, curso.Id, "/uploads/conteudos/arquivo-3.pdf");

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("conteudos", "arquivo-3.pdf", aluno.Id);

        Assert.False(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_AnexoDeQuestaoEmAvaliacaoComAcesso_RetornaTrue()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var aluno = CriarAluno(context);
        CriarMatriculaAprovada(context, aluno.Id, curso.Id, turma.Id);
        var avaliacao = CriarAvaliacao(context, professor.Id, turma.Id, curso.Id);
        var (banco, _) = CriarQuestaoComAnexo(context, professor.Id, "/uploads/questoes/anexo-1.jpg");
        PublicarQuestao(context, banco.Id, avaliacao.Id);

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("questoes", "anexo-1.jpg", aluno.Id);

        Assert.True(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_AnexoDeQuestaoSemNenhumaTurmaComAcesso_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var professor = CriarProfessor(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id, professor.Id);
        var aluno = CriarAluno(context);
        // Sem matricula nenhuma para o aluno.
        var avaliacao = CriarAvaliacao(context, professor.Id, turma.Id, curso.Id);
        var (banco, _) = CriarQuestaoComAnexo(context, professor.Id, "/uploads/questoes/anexo-2.jpg");
        PublicarQuestao(context, banco.Id, avaliacao.Id);

        var service = CriarService(context);
        var resultado = await service.AlunoPodeAcessarArquivoAsync("questoes", "anexo-2.jpg", aluno.Id);

        Assert.False(resultado);
    }

    [Fact]
    public async Task AlunoPodeAcessarArquivoAsync_ArquivoNaoEncontradoEmNenhumaTabela_RetornaFalse()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);

        var service = CriarService(context);

        Assert.False(await service.AlunoPodeAcessarArquivoAsync("conteudos", "inexistente.pdf", aluno.Id));
        Assert.False(await service.AlunoPodeAcessarArquivoAsync("questoes", "inexistente.jpg", aluno.Id));
        Assert.False(await service.AlunoPodeAcessarArquivoAsync("cursos", "capa.jpg", aluno.Id));
    }
}
