namespace PlataformaEnsino.API.Models;

/// <summary>
/// Situacao UNICA do curso (pacote 6 da auditoria de 26/11, docs/auditorias/
/// AUDITORIA-PENDENCIAS-REGRAS-2026-11-26.md, decisoes D5, D6, D6b, D10 e
/// D11): a mesma resposta para as abas do Admin, os selos (Admin, coordenador,
/// professor, painel do curso, cartao do modulo) e a tela Inscricoes. Antes
/// cada tela tinha sua propria prioridade e o mesmo curso aparecia "A venda"
/// numa e "Encerrado" em outra. Calculada so a partir dos campos do Curso,
/// sem estado duplicado. O frontend espelha esta mesma ordem em
/// frontend/src/lib/situacaoCurso.js (so para objetos que chegam sem o campo).
/// </summary>
public static class SituacaoCurso
{
    public const string EmAndamento = "EmAndamento";
    public const string AguardandoCoordenador = "AguardandoCoordenador";
    public const string Encerrado = "Encerrado";
    public const string ProntoParaPublicar = "ProntoParaPublicar";
    public const string AVenda = "AVenda";
    public const string NoCatalogo = "NoCatalogo";
    public const string ForaDeVenda = "ForaDeVenda";

    /// <summary>
    /// Ordem (a primeira que bater vale):
    /// 1. publicado: Pago "A venda", Gratuito "No catalogo";
    /// 2. ja foi publicado e foi retirado: "Fora de venda";
    /// 3. encerrado pelo coordenador: "Encerrado" (aguarda o Admin preparar a venda);
    /// 4. concluido pelo professor: Pago criado direto vai direto ao Admin
    ///    ("Pronto para publicar"); Acompanhado e Gratuito esperam o
    ///    coordenador encerrar ("Aguardando coordenador", D11);
    /// 5. senao: "Em andamento" (inclusive Gratuito/Pago ainda em montagem, D6).
    /// </summary>
    public static string Calcular(Curso curso)
    {
        ArgumentNullException.ThrowIfNull(curso);

        if (curso.PublicadoParaVendaEm.HasValue)
        {
            return curso.ModeloCurso == ModeloCurso.Gratuito ? NoCatalogo : AVenda;
        }

        if (curso.RetiradoDaVendaEm.HasValue)
        {
            return ForaDeVenda;
        }

        if (curso.EncerradoEm.HasValue)
        {
            return Encerrado;
        }

        if (curso.ConcluidoPeloProfessorEm.HasValue)
        {
            return curso.ModeloCurso == ModeloCurso.PagoPacote ? ProntoParaPublicar : AguardandoCoordenador;
        }

        return EmAndamento;
    }
}
