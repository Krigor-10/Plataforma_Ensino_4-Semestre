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
    Dissertativa = 3
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

public enum EscopoMarcoProgresso
{
    Curso = 1,
    Modulo = 2
}

public enum OrigemMarcoProgresso
{
    ConteudoConcluido = 1,
    AvaliacaoConcluida = 2,
    ModuloAtualizado = 3,
    CursoAtualizado = 4,
    Recalculo = 5
}

public enum StatusPagamento
{
    Pendente = 1,
    Pago = 2,
    Cancelado = 3
}
