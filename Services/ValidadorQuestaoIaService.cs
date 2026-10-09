using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Interfaces;

namespace PlataformaEnsino.API.Services;

public class ValidadorQuestaoIaService : IValidadorQuestaoIaService
{
    private const int TamanhoMaximoTextoLivre = 4000;
    private const int QuantidadeMaximaItens = 8;

    public void ValidarOuLancar(QuestaoGeradaIaDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);

        // Reaproveita a regra de negocio ja usada na criacao manual - qualquer coisa
        // que vale para o professor digitando vale para a IA gerando.
        AvaliacaoService.ValidarDadosQuestao(dto);

        VerificarTamanho(nameof(dto.Enunciado), dto.Enunciado);
        VerificarTamanho(nameof(dto.Contexto), dto.Contexto);
        VerificarTamanho(nameof(dto.ExplicacaoPosResposta), dto.ExplicacaoPosResposta);
        VerificarTamanho(nameof(dto.ReferenciasBibliograficas), dto.ReferenciasBibliograficas);

        if (dto.Alternativas.Count > QuantidadeMaximaItens)
        {
            throw new ArgumentException($"A IA gerou mais alternativas do que o permitido (maximo {QuantidadeMaximaItens}).");
        }

        if (dto.Afirmativas.Count > QuantidadeMaximaItens)
        {
            throw new ArgumentException($"A IA gerou mais afirmativas do que o permitido (maximo {QuantidadeMaximaItens}).");
        }

        foreach (var alternativa in dto.Alternativas)
        {
            VerificarTamanho("Alternativas.Texto", alternativa.Texto);
            VerificarTamanho("Alternativas.Justificativa", alternativa.Justificativa);
        }

        foreach (var afirmativa in dto.Afirmativas)
        {
            VerificarTamanho("Afirmativas.Texto", afirmativa.Texto);
            VerificarTamanho("Afirmativas.Justificativa", afirmativa.Justificativa);
        }

        var letrasDuplicadas = dto.Alternativas
            .Select(alternativa => alternativa.Letra.Trim().ToUpperInvariant())
            .GroupBy(letra => letra)
            .Any(grupo => grupo.Count() > 1);
        if (letrasDuplicadas)
        {
            throw new ArgumentException("A IA gerou alternativas com letras repetidas.");
        }

        var numerosDuplicados = dto.Afirmativas
            .Select(afirmativa => afirmativa.Numero.Trim().ToUpperInvariant())
            .GroupBy(numero => numero)
            .Any(grupo => grupo.Count() > 1);
        if (numerosDuplicados)
        {
            throw new ArgumentException("A IA gerou afirmativas com numeros repetidos.");
        }
    }

    private static void VerificarTamanho(string nomeCampo, string? valor)
    {
        if (!string.IsNullOrEmpty(valor) && valor.Length > TamanhoMaximoTextoLivre)
        {
            throw new ArgumentException($"O campo '{nomeCampo}' gerado pela IA excede o tamanho maximo permitido ({TamanhoMaximoTextoLivre} caracteres).");
        }
    }
}
