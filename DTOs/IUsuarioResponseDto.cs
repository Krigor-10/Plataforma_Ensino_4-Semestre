namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// Campos de resposta comuns a qualquer perfil de <see cref="Models.Usuario"/>
/// (Aluno, Coordenador, Professor), preenchidos via
/// <see cref="Common.UsuarioMappingExtensions.PreencherCamposBase{TDto}"/>.
/// </summary>
public interface IUsuarioResponseDto
{
    int Id { get; set; }
    string Nome { get; set; }
    string Email { get; set; }
    string Cpf { get; set; }
    string Telefone { get; set; }
    string Cep { get; set; }
    string Rua { get; set; }
    string Numero { get; set; }
    string Bairro { get; set; }
    string Cidade { get; set; }
    string Estado { get; set; }
    string TipoUsuario { get; set; }
    DateTime DataCadastro { get; set; }
    bool Ativo { get; set; }
}
