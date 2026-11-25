namespace PlataformaEnsino.API.DTOs;

/// <summary>
/// POST /Alunos/{id}/inativar - o motivo é validado no domínio
/// (<see cref="Models.Usuario.Desativar(int, string)"/>, 5 a 300 caracteres
/// após o trim), não por data annotation, para devolver a mesma mensagem de
/// erro em qualquer caminho que chame o método.
/// </summary>
public class InativarAlunoDto
{
    public string Motivo { get; set; } = string.Empty;
}
