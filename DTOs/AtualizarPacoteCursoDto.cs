using System.ComponentModel.DataAnnotations;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarPacoteCursoDto
{
    [Range(0, double.MaxValue)]
    public decimal Preco { get; set; }

    [StringLength(1000)]
    public string? Descricao { get; set; }

    /// <summary>
    /// Pacote 8 da auditoria de 26/11: modalidade de destino da conversao
    /// (Pago ou Gratuito). Vazio = Pago, como antes.
    /// </summary>
    public ModeloCurso? ModeloDestino { get; set; }
}
