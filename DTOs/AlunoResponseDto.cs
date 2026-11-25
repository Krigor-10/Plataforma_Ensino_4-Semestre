namespace PlataformaEnsino.API.DTOs;

public class AlunoResponseDto : IUsuarioResponseDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string Rua { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string TipoUsuario { get; set; } = string.Empty;
    public DateTime DataCadastro { get; set; }
    public bool Ativo { get; set; }
    public string Matricula { get; set; } = string.Empty;
    public string TurmaAtual { get; set; } = string.Empty;

    // Preenchidos só para quem pede como Admin (AlunoService) - para o
    // Coordenador ficam com o valor padrão (vazio/null), ver A5 do prompt.
    public DateTime? InativadoEm { get; set; }
    public string InativadoPorNome { get; set; } = string.Empty;
    public string MotivoInativacao { get; set; } = string.Empty;

    // So usado pela resposta do PUT /Alunos/{id} quando o e-mail muda - ver
    // AlunoService.AtualizarDadosAdminAsync. Default true: todo outro
    // endpoint que devolve este DTO sem tocar em e-mail simplesmente ignora
    // o campo (nenhum aviso a mostrar).
    public bool AvisoEmailEnviado { get; set; } = true;
}
