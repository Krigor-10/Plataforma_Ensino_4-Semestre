using Microsoft.EntityFrameworkCore;
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
        var options = new DbContextOptionsBuilder<PlataformaContext>()
            .UseInMemoryDatabase(nomeBanco)
            .Options;

        return new PlataformaContext(options);
    }
}
