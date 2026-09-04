using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.Tests;

public static class TestContextFactory
{
    public static PlataformaContext Criar() => Criar(Guid.NewGuid().ToString());

    /// <summary>
    /// Abre um novo PlataformaContext apontando pro mesmo banco em memoria (mesmo nome).
    /// Use isso quando precisar simular contextos separados por requisicao (ex.: um pra
    /// preparar o cenario, outro pro servico sob teste) — evita conflito de tracking em
    /// servicos que usam Attach()/Entry() esperando uma entidade ainda nao rastreada.
    /// </summary>
    public static PlataformaContext Criar(string nomeBanco)
    {
        // O provider InMemory nao suporta transacao real — ignora o aviso pra
        // Database.BeginTransactionAsync() virar um no-op em vez de lancar
        // (MatriculaService.MatricularComAprovacaoAutomaticaAsync usa
        // transacao de verdade no SQL Server em producao).
        var options = new DbContextOptionsBuilder<PlataformaContext>()
            .UseInMemoryDatabase(nomeBanco)
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new PlataformaContext(options);
    }
}
