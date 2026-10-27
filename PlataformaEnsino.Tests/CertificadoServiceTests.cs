using Microsoft.EntityFrameworkCore;
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
    public async Task VerificarRequisitosAsync_NotaAbaixoDoMinimo_RetornaPendenciaSemLancarExcecaoNemEmitir()
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

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(6.99m, 1, OrigemCorrecaoNota.Automatica);
        context.LancamentosNotasAlunos.Add(lancamento);
        matricula.LancarNotaFinal(6.99m);
        context.SaveChanges();

        var matriculaRecarregada = context.Matriculas
            .Include(m => m.Curso)
            .Include(m => m.ProgressosCurso)
            .First(m => m.Id == matricula.Id);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var pendencias = await service.VerificarRequisitosAsync(matriculaRecarregada);

        Assert.Contains("A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado.", pendencias);
        Assert.Null(matriculaRecarregada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task VerificarRequisitosAsync_TodosRequisitosCumpridos_RetornaListaVazia()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var matriculaRecarregada = context.Matriculas
            .Include(m => m.Curso)
            .Include(m => m.ProgressosCurso)
            .First(m => m.Id == matricula.Id);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var pendencias = await service.VerificarRequisitosAsync(matriculaRecarregada);

        Assert.Empty(pendencias);
    }

    [Fact]
    public async Task ListarStatusCertificadosDoAlunoAsync_RefleteCertificadoDisponivelPorMatricula()
    {
        var nomeBanco = Guid.NewGuid().ToString();
        using var contextoDeArranjo = TestContextFactory.Criar(nomeBanco);
        var aluno = CriarAluno(contextoDeArranjo);
        var cursoOk = CriarCurso(contextoDeArranjo);
        var turmaOk = CriarTurma(contextoDeArranjo, cursoOk.Id);
        var matriculaOk = CriarMatriculaAprovada(contextoDeArranjo, aluno, cursoOk, turmaOk, percentualConclusao: 100);

        var cursoIncompleto = CriarCurso(contextoDeArranjo);
        var turmaIncompleto = CriarTurma(contextoDeArranjo, cursoIncompleto.Id);
        var matriculaIncompleta = CriarMatriculaAprovada(contextoDeArranjo, aluno, cursoIncompleto, turmaIncompleto, percentualConclusao: 40);

        using var contextoDoServico = TestContextFactory.Criar(nomeBanco);
        var service = new CertificadoService(contextoDoServico, new AcessoAcademicoService(contextoDoServico));
        var status = await service.ListarStatusCertificadosDoAlunoAsync(aluno.Id);

        var statusOk = status.Single(item => item.Matricula.Id == matriculaOk.Id);
        var statusIncompleto = status.Single(item => item.Matricula.Id == matriculaIncompleta.Id);

        Assert.True(statusOk.CertificadoDisponivel);
        Assert.Empty(statusOk.Pendencias);
        Assert.False(statusIncompleto.CertificadoDisponivel);
        Assert.Contains("O curso ainda nao foi concluido.", statusIncompleto.Pendencias);

        // So verifica, nao emite - nenhuma das duas matriculas deve ter sido alterada.
        Assert.Null(statusOk.Matricula.CertificadoEmitidoEm);
        Assert.Null(statusIncompleto.Matricula.CertificadoEmitidoEm);
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

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_AlunoComCemPorCentoENotaSete_EmiteCertificado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(7, 1, OrigemCorrecaoNota.Automatica);
        context.LancamentosNotasAlunos.Add(lancamento);
        matricula.LancarNotaFinal(7m);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(1, resultado.Emitidos);
        Assert.Equal(0, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.NotNull(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Theory]
    [InlineData(6.99)]
    public async Task EmitirCertificadosDoCursoAsync_NotaAbaixoDoMinimo_NaoEmiteFicaBloqueado(decimal notaFinal)
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Prova Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Prova };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();

        var lancamento = new LancamentoNotaAluno { MatriculaId = matricula.Id, AvaliacaoId = avaliacao.Id };
        lancamento.RegistrarCorrecao(notaFinal, 1, OrigemCorrecaoNota.Automatica);
        context.LancamentosNotasAlunos.Add(lancamento);
        matricula.LancarNotaFinal(notaFinal);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(0, resultado.Emitidos);
        Assert.Equal(1, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_ProgressoAbaixoDeCemPorCento_NaoEmiteFicaBloqueado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 80);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(0, resultado.Emitidos);
        Assert.Equal(1, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_AvaliacaoPublicadaSemCorrecao_NaoEmiteFicaBloqueado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var avaliacao = new Avaliacao { Titulo = "Exercicio Final", TurmaId = turma.Id, TipoAvaliacao = TipoAvaliacao.Exercicio };
        avaliacao.DefinirCurso(curso.Id);
        avaliacao.Publicar();
        context.Avaliacoes.Add(avaliacao);
        context.SaveChanges();

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(0, resultado.Emitidos);
        Assert.Equal(1, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_PagamentoPendente_NaoEmiteFicaBloqueado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Preco = 500;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(0, resultado.Emitidos);
        Assert.Equal(1, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.Null(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_CursoSoComQuizSemAvaliacaoFormal_EmiteComCemPorCentoSemExigirNota()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var resultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);

        Assert.Equal(1, resultado.Emitidos);
        Assert.Equal(0, resultado.Bloqueados);

        var matriculaAtualizada = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id);
        Assert.NotNull(matriculaAtualizada.CertificadoEmitidoEm);
    }

    [Fact]
    public async Task EmitirCertificadosDoCursoAsync_ChamadoDuasVezes_MantemADataDeQuemJaTinhaCertificado()
    {
        var context = TestContextFactory.Criar();
        var aluno = CriarAluno(context);
        var curso = CriarCurso(context);
        curso.ModeloCurso = ModeloCurso.Acompanhado;
        curso.Encerrar(coordenadorId: 1);
        context.SaveChanges();
        var turma = CriarTurma(context, curso.Id);
        var matricula = CriarMatriculaAprovada(context, aluno, curso, turma, percentualConclusao: 100);

        var service = new CertificadoService(context, new AcessoAcademicoService(context));
        var primeiroResultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);
        var primeiraData = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id).CertificadoEmitidoEm;

        var segundoResultado = await service.EmitirCertificadosDoCursoAsync(curso.Id);
        var segundaData = context.Matriculas.AsNoTracking().Single(m => m.Id == matricula.Id).CertificadoEmitidoEm;

        Assert.Equal(1, primeiroResultado.Emitidos);
        Assert.Equal(0, segundoResultado.Emitidos);
        Assert.Equal(primeiraData, segundaData);
    }
}
