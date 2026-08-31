using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

public class AtualizarPerfilDto
{
    [Required]
    [StringLength(150)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Telefone { get; set; } = string.Empty;

    [Required]
    [StringLength(9)]
    public string Cep { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Rua { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Numero { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string Bairro { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string Cidade { get; set; } = string.Empty;

    [Required]
    [StringLength(2, MinimumLength = 2)]
    public string Estado { get; set; } = string.Empty;
}
