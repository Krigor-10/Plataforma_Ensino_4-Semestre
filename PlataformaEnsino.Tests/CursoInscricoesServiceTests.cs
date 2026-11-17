using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using PlataformaEnsino.API.Services;
using Xunit;

namespace PlataformaEnsino.Tests;

public class CursoInscricoesServiceTests
{
    private static CursoInscricoesService CriarService(PlataformaContext context) => new(context);

    private static int _contadorAluno;

    private static Aluno CriarAluno(PlataformaContext context)
    {
        var sufixo = System.Threading.Interlocked.Increment(ref _contadorAluno);
        var aluno = new Aluno
        {
            Nome = "Aluno Teste",
            Email = $"{Guid.NewGuid():N}@teste.local",
            Cpf = $"{sufixo:D11}",
            Telefone = "11999990000",
            Cep = "01001-000",
            Rua = "Rua Teste",
            Numero = "1",
            Bairro = "Centro",
            Cidade = "Sao Paulo",
            Estado = "SP",
            Matricula = $"ALU-{sufixo:D4}"
        };
        aluno.ConfigurarAcesso("Aluno", "hash-fake");

        context.Alunos.Add(aluno);
        context.SaveChanges();
        return aluno;
    }

    private static Curso CriarCurso(PlataformaContext context, ModeloCurso modeloCurso, decimal preco = 0)
    {
        var curso = new Curso
        {
            Titulo = $"Curso {Guid.NewGuid():N}",
            CodigoRegistro = $"CUR-{Guid.NewGuid():N}"[..9],
            ModeloCurso = modeloCurso,
            Preco = preco
        };
        context.Cursos.Add(curso);
        context.SaveChanges();
        return curso;
    }

    private static Matricula CriarMatricula(PlataformaContext context, int alunoId, int cursoId, decimal valorNaMatricula = 0, DateTime? dataSolicitacao = null)
    {
        var matricula = new Matricula { AlunoId = alunoId, CursoId = cursoId, CodigoRegistro = $"MAT-{Guid.NewGuid():N}"[..9] };
        matricula.DefinirValorNaMatricula(valorNaMatricula);
        matricula.Aprovar();
        if (dataSolicitacao.HasValue)
        {
            matricula.RegistrarSolicitacao(dataSolicitacao);
        }
        context.Matriculas.Add(matricula);
        context.SaveChanges();
        return matricula;
    }

    private static Pagamento CriarPagamentoPago(PlataformaContext context, int matriculaId, decimal valor, DateTime? pagoEm = null)
    {
        var pagamento = Pagamento.CriarPendente(matriculaId, valor);
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();
        pagamento.ConfirmarPagamento(pagoEm);
        context.SaveChanges();
        return pagamento;
    }

    private static Pagamento CriarPagamentoPendente(PlataformaContext context, int matriculaId, decimal valor)
    {
        var pagamento = Pagamento.CriarPendente(matriculaId, valor);
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();
        return pagamento;
    }

    private static Pagamento CriarPagamentoCancelado(PlataformaContext context, int matriculaId, decimal valor)
    {
        var pagamento = Pagamento.CriarPendente(matriculaId, valor);
        context.Pagamentos.Add(pagamento);
        context.SaveChanges();
        pagamento.Cancelar();
        context.SaveChanges();
        return pagamento;
    }

    private static void DefinirProgresso(PlataformaContext context, int matriculaId, int cursoId, decimal percentual)
    {
        context.ProgressosCursosAlunos.Add(new ProgressoCursoAluno
        {
            MatriculaId = matriculaId,
            CursoId = cursoId,
            PercentualConclusao = percentual
        });
        context.SaveChanges();
    }

    [Fact]
    public async Task ObterInscricoesAsync_CursoGratuito_TodaMatriculaAprovadaContaComoInscrita()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var aluno = CriarAluno(context);
        CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 0);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Inscritos);
        Assert.Equal(0, item.Pendentes);
        Assert.Equal(0m, item.Receita);
    }

    [Fact]
    public async Task ObterInscricoesAsync_CursoPagoComPagamentoPago_ContaComoInscritaENaReceita()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 100m);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoPago(context, matricula.Id, 100m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Inscritos);
        Assert.Equal(0, item.Pendentes);
        Assert.Equal(100m, item.Receita);
    }

    [Fact]
    public async Task ObterInscricoesAsync_CursoPagoComPagamentoPendente_NaoContaComoInscritaMasContaComoPendente()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 50m);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 50m);
        CriarPagamentoPendente(context, matricula.Id, 50m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(0, item.Inscritos);
        Assert.Equal(1, item.Pendentes);
        Assert.Equal(0m, item.Receita);
    }

    [Fact]
    public async Task ObterInscricoesAsync_Comecaram_SoContaInscritaComProgressoMaiorQueZero()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var alunoComecou = CriarAluno(context);
        var matriculaComecou = CriarMatricula(context, alunoComecou.Id, curso.Id);
        DefinirProgresso(context, matriculaComecou.Id, curso.Id, 30m);
        var alunoNaoComecou = CriarAluno(context);
        CriarMatricula(context, alunoNaoComecou.Id, curso.Id);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(2, item.Inscritos);
        Assert.Equal(1, item.Comecaram);
    }

    [Fact]
    public async Task ObterInscricoesAsync_Concluiram_ExigeProgressoCemOuMais()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var alunoConcluiu = CriarAluno(context);
        var matriculaConcluiu = CriarMatricula(context, alunoConcluiu.Id, curso.Id);
        DefinirProgresso(context, matriculaConcluiu.Id, curso.Id, 100m);
        var alunoQuaseLa = CriarAluno(context);
        var matriculaQuaseLa = CriarMatricula(context, alunoQuaseLa.Id, curso.Id);
        DefinirProgresso(context, matriculaQuaseLa.Id, curso.Id, 99m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Concluiram);
    }

    [Fact]
    public async Task ObterInscricoesAsync_ComCertificado_ContaSoInscritaComCertificadoEmitido()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var alunoComCertificado = CriarAluno(context);
        var matriculaComCertificado = CriarMatricula(context, alunoComCertificado.Id, curso.Id);
        matriculaComCertificado.EmitirCertificado();
        context.SaveChanges();
        var alunoSemCertificado = CriarAluno(context);
        CriarMatricula(context, alunoSemCertificado.Id, curso.Id);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.ComCertificado);
    }

    [Theory]
    [InlineData(true, false, false, SituacaoCursoInscricoes.Encerrado)]
    [InlineData(false, true, false, SituacaoCursoInscricoes.AVenda)]
    [InlineData(false, false, true, SituacaoCursoInscricoes.AguardandoEncerramento)]
    [InlineData(false, false, false, SituacaoCursoInscricoes.EmAndamento)]
    public async Task ObterInscricoesAsync_Situacao_SeguePrecedenciaEncerradoAVendaAguardandoEmAndamento(
        bool encerrado, bool aVenda, bool aguardandoEncerramento, SituacaoCursoInscricoes esperado)
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 10m);

        if (aguardandoEncerramento || encerrado)
        {
            curso.ConcluirPeloProfessor(professorId: 1);
        }
        if (encerrado)
        {
            curso.Encerrar(coordenadorId: 1);
        }
        if (aVenda)
        {
            curso.PublicarParaVenda();
        }
        context.SaveChanges();

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(esperado, item.Situacao);
    }

    [Fact]
    public async Task ObterInscricoesAsync_FiltroDePeriodoPelaDataDaInscricao_IgnoraMatriculaForaDoPeriodo()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var alunoDentro = CriarAluno(context);
        CriarMatricula(context, alunoDentro.Id, curso.Id, dataSolicitacao: new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc));
        var alunoFora = CriarAluno(context);
        CriarMatricula(context, alunoFora.Id, curso.Id, dataSolicitacao: new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var resultado = (await service.ObterInscricoesAsync(
            de: new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            ate: new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc))).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Inscritos);
    }

    [Fact]
    public async Task ObterInscricoesAsync_AteEhInclusivoDoDiaInteiro()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var aluno = CriarAluno(context);
        CriarMatricula(context, aluno.Id, curso.Id, dataSolicitacao: new DateTime(2026, 6, 30, 23, 30, 0, DateTimeKind.Utc));

        var resultado = (await service.ObterInscricoesAsync(
            de: new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            ate: new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc))).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Inscritos);
    }

    [Fact]
    public async Task ObterInscricoesAsync_FiltroDePeriodoNaReceita_UsaPagoEmNaoDataSolicitacao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 200m);
        var aluno = CriarAluno(context);
        // Inscricao antiga (fora do periodo filtrado), mas o pagamento foi
        // confirmado DENTRO do periodo - a receita usa PagoEm, nao a data da
        // inscricao (regra explicita do prompt).
        var matricula = CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 200m, dataSolicitacao: new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        CriarPagamentoPago(context, matricula.Id, 200m, pagoEm: new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc));

        var resultado = (await service.ObterInscricoesAsync(
            de: new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            ate: new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc))).ToList();

        // A matricula fica de fora da lista (inscricao fora do periodo), mas
        // a receita do curso ainda aparece, porque o filtro dela e separado.
        var item = Assert.Single(resultado);
        Assert.Equal(0, item.Inscritos);
        Assert.Equal(200m, item.Receita);
    }

    [Fact]
    public async Task ObterInscricoesAsync_OrdenaPorInscritosDecrescente()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var cursoComMenosInscritos = CriarCurso(context, ModeloCurso.Gratuito);
        CriarMatricula(context, CriarAluno(context).Id, cursoComMenosInscritos.Id);

        var cursoComMaisInscritos = CriarCurso(context, ModeloCurso.Gratuito);
        CriarMatricula(context, CriarAluno(context).Id, cursoComMaisInscritos.Id);
        CriarMatricula(context, CriarAluno(context).Id, cursoComMaisInscritos.Id);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        Assert.Equal(cursoComMaisInscritos.Id, resultado[0].CursoId);
        Assert.Equal(cursoComMenosInscritos.Id, resultado[1].CursoId);
    }

    [Fact]
    public async Task ObterInscricoesAsync_RetornaImagemUrlDoCurso()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var cursoComImagem = CriarCurso(context, ModeloCurso.Gratuito);
        cursoComImagem.ImagemUrl = "/uploads/cursos/capa.jpg";
        context.SaveChanges();
        var cursoSemImagem = CriarCurso(context, ModeloCurso.Gratuito);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        Assert.Equal("/uploads/cursos/capa.jpg", resultado.Single(item => item.CursoId == cursoComImagem.Id).ImagemUrl);
        Assert.Null(resultado.Single(item => item.CursoId == cursoSemImagem.Id).ImagemUrl);
    }

    [Fact]
    public async Task ObterInscricoesAsync_AReceber_SomaOValorDosPagamentosPendentes()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 100m);
        var aluno1 = CriarAluno(context);
        var matricula1 = CriarMatricula(context, aluno1.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoPendente(context, matricula1.Id, 100m);
        var aluno2 = CriarAluno(context);
        var matricula2 = CriarMatricula(context, aluno2.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoPendente(context, matricula2.Id, 100m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(200m, item.AReceber);
    }

    [Fact]
    public async Task ObterInscricoesAsync_Cancelados_ContaQuantidadeESomaOValorCancelado()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 100m);
        var aluno = CriarAluno(context);
        var matricula = CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoCancelado(context, matricula.Id, 100m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(1, item.Cancelados);
        Assert.Equal(100m, item.ValorCancelado);
    }

    [Fact]
    public async Task ObterInscricoesAsync_TentativasCompraECompraram_ContamMatriculasComQualquerPagamentoEComPago()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 100m);

        var alunoPagou = CriarAluno(context);
        var matriculaPagou = CriarMatricula(context, alunoPagou.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoPago(context, matriculaPagou.Id, 100m);

        var alunoCancelou = CriarAluno(context);
        var matriculaCancelou = CriarMatricula(context, alunoCancelou.Id, curso.Id, valorNaMatricula: 100m);
        CriarPagamentoCancelado(context, matriculaCancelou.Id, 100m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(2, item.TentativasCompra);
        Assert.Equal(1, item.Compraram);
    }

    [Fact]
    public async Task ObterInscricoesAsync_CursoGratuito_TentativasCompraECompraramFicamZero()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.Gratuito);
        var aluno = CriarAluno(context);
        CriarMatricula(context, aluno.Id, curso.Id, valorNaMatricula: 0);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(0, item.TentativasCompra);
        Assert.Equal(0, item.Compraram);
    }

    [Fact]
    public async Task ObterInscricoesAsync_AReceber_RespeitaOPeriodoPelaDataDaInscricao()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        var curso = CriarCurso(context, ModeloCurso.PagoPacote, preco: 100m);
        var alunoDentro = CriarAluno(context);
        var matriculaDentro = CriarMatricula(context, alunoDentro.Id, curso.Id, valorNaMatricula: 100m, dataSolicitacao: new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc));
        CriarPagamentoPendente(context, matriculaDentro.Id, 100m);
        var alunoFora = CriarAluno(context);
        var matriculaFora = CriarMatricula(context, alunoFora.Id, curso.Id, valorNaMatricula: 100m, dataSolicitacao: new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        CriarPagamentoPendente(context, matriculaFora.Id, 100m);

        var resultado = (await service.ObterInscricoesAsync(
            de: new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            ate: new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc))).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(100m, item.AReceber);
    }

    [Fact]
    public async Task ObterInscricoesAsync_CursoSemNenhumaMatricula_RetornaZerados()
    {
        var context = TestContextFactory.Criar();
        var service = CriarService(context);
        CriarCurso(context, ModeloCurso.PagoPacote, preco: 10m);

        var resultado = (await service.ObterInscricoesAsync(null, null)).ToList();

        var item = Assert.Single(resultado);
        Assert.Equal(0, item.Inscritos);
        Assert.Equal(0, item.Pendentes);
        Assert.Equal(0m, item.Receita);
    }
}
