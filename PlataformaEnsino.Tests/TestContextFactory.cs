using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.Tests;

public static class TestContextFactory
{
    public static PlataformaContext Criar()
    {
        var options = new DbContextOptionsBuilder<PlataformaContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new PlataformaContext(options);
    }
}
