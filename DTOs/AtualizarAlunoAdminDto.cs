using System.ComponentModel.DataAnnotations;

namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// PUT /Alunos/{id}, só Admin (docs/alunos-admin/PROMPT-agente-editar-e-
/// inativar-aluno.md, item A2) - de propósito só tem os dados básicos/de
/// contato. CPF, endereço, senha e Ativo não fazem parte deste DTO: se
/// vierem no corpo da requisição, o model binding os ignora.
/// </summary>
public class AtualizarAlunoAdminDto
{
    [Required]
    [StringLength(150)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress(ErrorMessage = "O e-mail fornecido não é válido.")]
    public string Email { get; set; } = string.Empty;

    [StringLength(20)]
    public string Telefone { get; set; } = string.Empty;

    /// <summary>RA do aluno (<see cref="Models.Aluno.Matricula"/>).</summary>
    [Required]
    [StringLength(30)]
    public string Matricula { get; set; } = string.Empty;
}
