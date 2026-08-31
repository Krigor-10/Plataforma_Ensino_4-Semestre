using System.Diagnostics;

namespace PlataformaEnsino.API.Common;

public class RequestLoggingMiddleware
{
    public const string ChaveCorrelationId = "X-Correlation-Id";

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(ChaveCorrelationId, out var valorExistente) && !string.IsNullOrWhiteSpace(valorExistente)
            ? valorExistente.ToString()
            : Guid.NewGuid().ToString("N");

        context.Items[ChaveCorrelationId] = correlationId;
        context.Response.Headers[ChaveCorrelationId] = correlationId;

        var cronometro = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            cronometro.Stop();

            _logger.LogInformation(
                "{CorrelationId} {Metodo} {Caminho} -> {StatusCode} em {ElapsedMs}ms",
                correlationId,
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                cronometro.ElapsedMilliseconds);
        }
    }
}
