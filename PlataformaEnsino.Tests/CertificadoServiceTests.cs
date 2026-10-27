using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

// CertificadoService usa Attach()/Entry() esperando a entidade ainda nao rastreada
// (padrao normal quando cada requisicao HTTP tem seu proprio DbContext). Por isso,
// cada teste aqui usa um nome de banco em memoria compartilhado, mas abre um
// PlataformaContext NOVO pro servico sob teste — igual ao que aconteceria de verdade
// entre a matricula ser criada numa requisicao anterior e o certificado ser emitido
// numa requisicao posterior.
public class CertificadoServiceTests
{
    private static Aluno CriarAluno(PlataformaContext context)
    {
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = "11122233344",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = "MAT-0001"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context)
    {
        var curso = new Curso { Titulo = "Curso Teste", CodigoRegistro = "CUR-0001" };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Turma CriarTurma(PlataformaContext context, int cursoId)
    {
        var turma = new Turma { NomeTurma = "Turma Teste", CodigoRegistro = "TUR-0001", CursoId = cursoId };
        context.Turmas.Add(turma);
        context.SaveChanges();
        return turma;
    }

    private static Matricula CriarMatriculaAprovada(
        PlataformaContext context, Aluno aluno, Curso curso, Turma turma, decimal percentualConclusao = 100)
    {
        var matricula = new Matricula
        {
            AlunoId = aluno.Id,
            CursoId = curso.Id,
            CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..16]
        };
        matricula.VincularTurma(turma.Id);
        matricula.AprovarComTurma(turma.Id, curso.Id);
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        context.ProgressosCursosAlunos.Add(new ProgressoCursoAluno
        {
            MatriculaId = matricula.Id,
            CursoId = curso.Id,
            PercentualConclusao = percentualConclusao
        });
        context.SaveChanges();

        return matricula;
    }

    [Fact]
    public async Task EmitirCertificadoAsync_CursoConcluido_EmiteCertificado()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 100);

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var resultado = await new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico)).EmitirCertificadoAsync(aluno.Id, matricula.Id);

        Assert.NotNull(resultado.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadoAsync_ChamadoDuasVezes_MantemADataDaPrimeiraEmissao()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma);

        using var primeiroContexto = TestContextFactory.Criar(nomeBanco);
        var primeiraEmissao = await new CertificadoService(primeiroContexto, new AcessoAcademicoService(primeiroContexto)).EmitirCertificadoAsync(aluno.Id, matricula.Id);

        using var segundoContexto = TestContextFactory.Criar(nomeBanco);
        var segundaEmissao = await new CertificadoService(segundoContexto, new AcessoAcademicoService(segundoContexto)).EmitirCertificadoAsync(aluno.Id, matricula.Id);

        Assert.Equal(primeiraEmissao.CertificadoEmitidoEm, segundaEmissao.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadoAsync_MatriculaNaoAprovada_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = "MAT-PEND" };
        context.Matriculas.Add(matricula);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_CursoIncompleto_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 50);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_AvaliacaoPublicadaSemCorrecao_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_MatriculaSemTurmaComAvaliacaoPendente_LancaArgumentException()
    {
        // Fix do bug critico: matricula aprovada pelo fluxo atual (sem Turma)
        // precisa continuar bloqueando certificado quando ha avaliacao pendente.
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);

        var matricula = new Matricula { AlunoId = aluno.Id, CursoId = curso.Id, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..16] };
        matricula.Aprovar();
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        context.ProgressosCursosAlunos.Add(new ProgressoCursoAluno
        {
            MatriculaId = matricula.Id,
            CursoId = curso.Id,
            PercentualConclusao = 100
        });
        context.SaveChanges();

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_AvaliacaoPublicadaJaCorrigida_EmiteCertificado()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        contextoDeArranjo.Avaliacoes.Add(avaliacao);
        contextoDeArranjo.SaveChanges();

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(8, 1, OrigemCorrecaoNota.Automatica);
        contextoDeArranjo.LancamentosNotasAlunos.Add(lancamento);
        // Fora do fluxo real, o lancamento nao passa por ProgressoAlunoService.
        // RecalcularMediaCursoAsync, entao a NotaFinal da matricula precisa ser
        // simulada aqui pra bater com o que o pipeline real calcularia (8/10 * 10 = 8).
        matricula.LancarNotaFinal(8m);
        contextoDeArranjo.SaveChanges();

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var service = new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico));
        var resultado = await service.EmitirCertificadoAsync(aluno.Id, matricula.Id);

        Assert.NotNull(resultado.CertificadoEmitidoEm);
    }

    [Theory]
    [InlineData(6.99, false)]
    [InlineData(7.00, true)]
    [InlineData(8.50, true)]
    [InlineData(10.00, true)]
    public async Task EmitirCertificadoAsync_NotaFinalVersusMediaMinima_SeguirCriterioDeAprovacao(decimal notaFinal, bool deveEmitir)
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        contextoDeArranjo.Avaliacoes.Add(avaliacao);
        contextoDeArranjo.SaveChanges();

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(notaFinal, 1, OrigemCorrecaoNota.Automatica);
        contextoDeArranjo.LancamentosNotasAlunos.Add(lancamento);
        matricula.LancarNotaFinal(notaFinal);
        contextoDeArranjo.SaveChanges();

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var service = new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico));

        if (deveEmitir)
        {
            var resultado = await service.EmitirCertificadoAsync(aluno.Id, matricula.Id);
            Assert.NotNull(resultado.CertificadoEmitidoEm);
        }
        else
        {
            await Assert.ThrowsAsync<ArgumentException>(() => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
        }
    }

    [Fact]
    public async Task EmitirCertificadoAsync_CursoSoComQuizSemAvaliacaoFormal_NaoExigeNotaMinima()
    {
        // Cursos sem Prova/Exercicio publicada nunca calculam NotaFinal (fica 0,
        // default da matricula) - a regra de nota minima nao pode bloquear esse caso.
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 100);

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var service = new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico));
        var resultado = await service.EmitirCertificadoAsync(aluno.Id, matricula.Id);

        Assert.NotNull(resultado.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadoAsync_MatriculaDeOutroAluno_LancaKeyNotFoundException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var outroAluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.EmitirCertificadoAsync(outroAluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_CursoAcompanhadoNaoEncerrado_LancaArgumentException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.EmitirCertificadoAsync(aluno.Id, matricula.Id));
    }

    [Fact]
    public async Task EmitirCertificadoAsync_CursoAcompanhadoEncerrado_EmiteCertificado()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        contextoDeArranjo.SaveChanges();
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 100);

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var service = new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico));
        var resultado = await service.EmitirCertificadoAsync(aluno.Id, matricula.Id);

        Assert.NotNull(resultado.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task ListarCertificadosDoAlunoAsync_RetornaSoOsCertificadosEmitidos()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matriculaComCertificado = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma);
        var matriculaSemCertificado = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma, percentualConclusao: 40);

        using var contextoDeEmissao = TestContextFactory.Criar(nomeBanco);
        await new CertificadoService(contextoDeEmissao, new AcessoAcademicoService(contextoDeEmissao)).EmitirCertificadoAsync(aluno.Id, matriculaComCertificado.Id);

        using var contextoDeConsulta = TestContextFactory.Criar(nomeBanco);
        var certificados = (await new CertificadoService(contextoDeConsulta, new AcessoAcademicoService(contextoDeConsulta)).ListarCertificadosDoAlunoAsync(aluno.Id)).ToList();

        Assert.Single(certificados);
        Assert.Equal(matriculaComCertificado.Id, certificados[0].Id);
        Assert.DoesNotContain(certificados, c => c.Id == matriculaSemCertificado.Id);
    }

    [Fact]
    public async Task ObterCertificadoPorCodigoAsync_CodigoValido_RetornaMatricula()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var curso = CriarCurso(contextoDeArranjo);
        var turma = CriarTurma(contextoDeArranjo, curso.Id);
        var matricula = CriarMatriculaAprovada(contextoDeArranjo, aluno, curso, turma);

        using var contextoDeEmissao = TestContextFactory.Criar(nomeBanco);
        await new CertificadoService(contextoDeEmissao, new AcessoAcademicoService(contextoDeEmissao)).EmitirCertificadoAsync(aluno.Id, matricula.Id);

        using var contextoDeConsulta = TestContextFactory.Criar(nomeBanco);
        var resultado = await new CertificadoService(contextoDeConsulta, new AcessoAcademicoService(contextoDeConsulta)).ObterCertificadoPorCodigoAsync(matricula.CodigoRegistro);

        Assert.Equal(matricula.Id, resultado.Id);
    }

    [Fact]
    public async Task ObterCertificadoPorCodigoAsync_CertificadoNuncaEmitido_LancaKeyNotFoundException()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ObterCertificadoPorCodigoAsync(matricula.CodigoRegistro));
    }

    [Fact]
    public async Task ObterCertificadoPorCodigoAsync_CodigoInexistente_LancaKeyNotFoundException()
    {
        var context = TestContextFactory.Criar();
        var service = new CertificadoService(context, new AcessoAcademicoService(context));

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.ObterCertificadoPorCodigoAsync("CODIGO-QUE-NAO-EXISTE"));
    }
}
