using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Common;

public static class UsuarioMappingExtensions
{
    /// <summary>
    /// Preenche os campos comuns a qualquer perfil de usuário (Aluno, Coordenador, Professor)
    /// a partir da entidade. Retorna o próprio DTO para permitir encadear a atribuição
    /// dos campos específicos de cada perfil.
    /// </summary>
    public static TDto PreencherCamposBase<TDto>(this TDto dto, Usuario usuario) where TDto : IUsuarioResponseDto
    {
        dto.Id = usuario.Id;
        dto.Nome = usuario.Nome;
        dto.Email = usuario.Email;
        dto.Cpf = usuario.Cpf;
        dto.Telefone = usuario.Telefone;
        dto.Cep = usuario.Cep;
        dto.Rua = usuario.Rua;
        dto.Numero = usuario.Numero;
        dto.Bairro = usuario.Bairro;
        dto.Cidade = usuario.Cidade;
        dto.Estado = usuario.Estado;
        dto.TipoUsuario = usuario.TipoUsuario;
        dto.DataCadastro = usuario.DataCadastro;
        dto.Ativo = usuario.Ativo;

        return dto;
    }
}
