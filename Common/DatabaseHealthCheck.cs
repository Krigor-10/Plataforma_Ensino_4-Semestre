using Microsoft.Extensions.Diagnostics.HealthChecks;
using PlataformaEnsino.API.Data;

namespace PlataformaEnsino.API.Common;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly PlataformaContext _context;

    public DatabaseHealthCheck(PlataformaContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        return await _context.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Nao foi possivel conectar ao banco de dados.");
    }
}
