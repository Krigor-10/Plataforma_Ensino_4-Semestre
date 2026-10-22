namespace PlataformaEnsino.API.Models;

public enum TipoConteudoDidatico
{
    Texto = 1,
    Pdf = 2,
    Video = 3,
    Link = 4,
    Imagem = 5
}

public enum StatusPublicacao
{
    Rascunho = 1,
    Publicado = 2,
    Arquivado = 3
}

public enum TipoQuestao
{
    MultiplaEscolha = 1,
    VerdadeiroFalso = 2,
    Dissertativa = 3,
    AfirmativasCombinadas = 4
}

public enum TipoAvaliacao
{
    Quiz = 1,
    Prova = 2,
    Exercicio = 3
}

public enum StatusTentativaAvaliacao
{
    EmAndamento = 1,
    Enviada = 2,
    Corrigida = 3,
    Expirada = 4
}

public enum StatusProgressoAprendizagem
{
    NaoIniciado = 1,
    EmAndamento = 2,
    Concluido = 3
}

public enum OrigemCorrecaoNota
{
    Automatica = 1,
    Manual = 2,
    Mista = 3
}

public enum StatusPagamento
{
    Pendente = 1,
    Pago = 2,
    Cancelado = 3
}

/// <summary>
/// Gratuito/PagoPacote: todo o conteudo ja esta pronto, certificado liberado
/// automaticamente quando o aluno cumpre os requisitos. Acompanhado: professor
/// publica conteudo aos poucos; precisa ser concluido pelo professor e
/// encerrado pelo coordenador antes do certificado ficar disponivel (ver
/// Curso.ConcluirPeloProfessor/Encerrar/Reabrir).
/// </summary>
public enum ModeloCurso
{
    Gratuito = 1,
    PagoPacote = 2,
    Acompanhado = 3
}
