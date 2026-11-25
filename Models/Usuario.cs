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

    // Inativacao administrativa (docs/alunos-admin/PROMPT-agente-editar-e-
    // inativar-aluno.md, item A1) - hoje so usado por Aluno (InativarAsync/
    // ReativarAsync em AlunoService), mas vive na base Usuario porque
    // Desativar()/Ativar() ja sao da base. Professor/Coordenador continuam
    // usando o Desativar() sem argumentos, que nao preenche estes campos.
    public DateTime? InativadoEm { get; private set; }
    public int? InativadoPorId { get; private set; }

    [StringLength(300)]
    public string? MotivoInativacao { get; private set; }

    [JsonIgnore]
    public string? TokenRecuperacaoSenhaHash { get; private set; }

    [JsonIgnore]
    public DateTime? TokenRecuperacaoSenhaExpiraEm { get; private set; }

    public void AlterarDados(string nome, string email, string telefone, string cep, string rua, string numero, string bairro, string cidade, string estado)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new ArgumentException("O nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(rua) || string.IsNullOrWhiteSpace(numero) || string.IsNullOrWhiteSpace(bairro) || string.IsNullOrWhiteSpace(cidade) || string.IsNullOrWhiteSpace(estado))
        {
            throw new ArgumentException("O endereço é obrigatório.");
        }

        Nome = nome.Trim();
        Email = email;
        Telefone = telefone;
        Cep = cep;
        Rua = rua.Trim();
        Numero = numero.Trim();
        Bairro = bairro.Trim();
        Cidade = cidade.Trim();
        Estado = estado.Trim();
    }

    /// <summary>
    /// Igual a <see cref="AlterarDados"/>, mas so pros dados basicos/de
    /// contato (nome, e-mail, telefone) - usado pelo PUT /Alunos/{id} do
    /// Admin, que nao pode tocar em CPF nem endereco (dados pessoais
    /// sigilosos, decisao do usuario em PROMPT-agente-editar-e-inativar-
    /// aluno.md).
    /// </summary>
    public void AlterarDadosBasicos(string nome, string email, string telefone)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new ArgumentException("O nome é obrigatório.");
        }

        Nome = nome.Trim();
        Email = email;
        Telefone = telefone ?? string.Empty;
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

    public void DefinirTokenRecuperacaoSenha(string tokenHash, DateTime expiraEm)
    {
        TokenRecuperacaoSenhaHash = tokenHash;
        TokenRecuperacaoSenhaExpiraEm = expiraEm;
    }

    public void LimparTokenRecuperacaoSenha()
    {
        TokenRecuperacaoSenhaHash = null;
        TokenRecuperacaoSenhaExpiraEm = null;
    }

    /// <summary>Reativa o acesso e limpa o registro de inativacao (se houver).</summary>
    public void Ativar()
    {
        Ativo = true;
        InativadoEm = null;
        InativadoPorId = null;
        MotivoInativacao = null;
    }

    /// <summary>Usado por Professor/Coordenador (toggle "Conta ativa" do formulario) - nao registra quem/por que.</summary>
    public void Desativar()
    {
        Ativo = false;
    }

    /// <summary>
    /// Inativacao administrativa de Aluno (docs/alunos-admin/PROMPT-agente-
    /// editar-e-inativar-aluno.md, item A1): registra quem inativou, quando e
    /// o motivo (obrigatorio, 5 a 300 caracteres apos o trim).
    /// </summary>
    public void Desativar(int porUsuarioId, string motivo)
    {
        var motivoTratado = (motivo ?? string.Empty).Trim();
        if (motivoTratado.Length < 5 || motivoTratado.Length > 300)
        {
            throw new ArgumentException("O motivo da inativação deve ter entre 5 e 300 caracteres.");
        }

        Ativo = false;
        InativadoEm = DateTime.UtcNow;
        InativadoPorId = porUsuarioId;
        MotivoInativacao = motivoTratado;
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
