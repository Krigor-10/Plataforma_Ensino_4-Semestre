using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public class Pagamento
{
    public int Id { get; set; }

    public int MatriculaId { get; set; }

    public decimal Valor { get; private set; }

    public StatusPagamento Status { get; private set; } = StatusPagamento.Pendente;

    public DateTime CriadoEm { get; private set; } = DateTime.UtcNow;

    public DateTime? PagoEm { get; private set; }

    [JsonIgnore]
    [ValidateNever]
    public Matricula? Matricula { get; set; }

    public static Pagamento CriarPendente(int matriculaId, decimal valor)
    {
        if (matriculaId <= 0)
        {
            throw new ArgumentException("A matricula informada e invalida.");
        }

        if (valor <= 0)
        {
            throw new ArgumentException("O valor do pagamento deve ser maior que zero.");
        }

        return new Pagamento
        {
            MatriculaId = matriculaId,
            Valor = valor
        };
    }

    public void ConfirmarPagamento(DateTime? pagoEm = null)
    {
        if (Status != StatusPagamento.Pendente)
        {
            throw new InvalidOperationException("Somente pagamentos pendentes podem ser confirmados.");
        }

        Status = StatusPagamento.Pago;
        PagoEm = pagoEm ?? DateTime.UtcNow;
    }

    public void Cancelar()
    {
        if (Status != StatusPagamento.Pendente)
        {
            throw new InvalidOperationException("Somente pagamentos pendentes podem ser cancelados.");
        }

        Status = StatusPagamento.Cancelado;
    }
}
