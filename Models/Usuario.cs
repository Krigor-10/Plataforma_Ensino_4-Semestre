using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models;

public abstract class Usuario
{
    public int Id { get; set; }

    [Required]
    [StringLength(150)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress(ErrorMessage = "O e-mail fornecido não é válido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CPF é obrigatório.")]
    [StringLength(11, MinimumLength = 11, ErrorMessage = "O CPF deve conter exatamente 11 caracteres.")]
    public string Cpf { get; set; } = string.Empty;

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
    [StringLength(2)]
    public string Estado { get; set; } = string.Empty;

    public string TipoUsuario { get; private set; } = string.Empty;
    public DateTime DataCadastro { get; private set; } = DateTime.UtcNow;

    [JsonIgnore]
    public string SenhaHash { get; private set; } = string.Empty;

    public bool Ativo { get; private set; } = true;

    [JsonIgnore]
    [ValidateNever]
    public List<FeedbackAcademico> FeedbacksRecebidos { get; set; } = new();

    [JsonIgnore]
    [ValidateNever]
    public List<FeedbackAcademico> FeedbacksEnviados { get; set; } = new();

    public void AlterarDados(string nome, string email, string telefone, string cep, string rua, string numero, string bairro, string cidade, string estado)
    {
        Nome = nome;
        Email = email;
        Telefone = telefone;
        Cep = cep;
        Rua = rua;
        Numero = numero;
        Bairro = bairro;
        Cidade = cidade;
        Estado = estado;
    }

    public void ConfigurarAcesso(string tipoUsuario, string senhaHash, bool ativo = true)
    {
        if (string.IsNullOrWhiteSpace(tipoUsuario))
        {
            throw new ArgumentException("O tipo de usuario e obrigatorio.");
        }

        if (string.IsNullOrWhiteSpace(senhaHash))
        {
            throw new ArgumentException("A senha hash e obrigatoria.");
        }

        TipoUsuario = tipoUsuario.Trim();
        SenhaHash = senhaHash;
        Ativo = ativo;
    }

    public void AtualizarSenhaHash(string senhaHash)
    {
        if (string.IsNullOrWhiteSpace(senhaHash))
        {
            throw new ArgumentException("A senha hash e obrigatoria.");
        }

        SenhaHash = senhaHash;
    }

    public void Ativar()
    {
        Ativo = true;
    }

    public void Desativar()
    {
        Ativo = false;
    }

    public virtual string ExibirDados()
    {
        return $"Dados do Usuário:\n" +
               $"- Nome: {Nome}\n" +
               $"- E-mail: {Email}\n" +
               $"- CPF: {Cpf}\n" +
               $"- Telefone: {Telefone}\n" +
               $"- Endereço: {Rua}, {Numero} - {Bairro}, {Cidade}/{Estado} (CEP: {Cep})\n" +
               $"- Cliente desde: {DataCadastro:dd/MM/yyyy}";
    }
}
