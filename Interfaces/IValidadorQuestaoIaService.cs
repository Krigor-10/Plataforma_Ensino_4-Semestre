using PlataformaEnsino.API.DTOs;

namespace PlataformaEnsino.API.Interfaces;

public interface IValidadorQuestaoIaService
{
    /// <summary>
    /// Reaproveita a mesma regra de negocio de AvaliacaoService.ValidarDadosQuestao e
    /// acrescenta os limites que ela nao cobre (texto livre ilimitado, letras/numeros
    /// duplicados, quantidade excessiva de alternativas/afirmativas) - folgas
    /// toleraveis para digitacao humana, mas que uma IA pode explorar sem querer.
    /// Lanca ArgumentException (400) na primeira violacao encontrada.
    /// </summary>
    void ValidarOuLancar(QuestaoGeradaIaDto dto);
}
