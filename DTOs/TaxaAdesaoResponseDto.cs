namespace PlataformaEnsino.API.DTOs;

public class TaxaAdesaoResponseDto
{
    public DateTime DataInicio { get; set; }
    public DateTime DataFim { get; set; }
    public string Agrupamento { get; set; } = string.Empty;
    public List<CursoTaxaAdesaoResponseDto> Ranking { get; set; } = new();
    public List<EvolucaoCursoTaxaAdesaoResponseDto> Evolucao { get; set; } = new();
    public CursoTaxaAdesaoResponseDto? Destaque { get; set; }
}

public class CursoTaxaAdesaoResponseDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public int MatriculasConfirmadas { get; set; }
}

public class EvolucaoCursoTaxaAdesaoResponseDto
{
    public int CursoId { get; set; }
    public string CursoTitulo { get; set; } = string.Empty;
    public List<PontoEvolucaoTaxaAdesaoResponseDto> Pontos { get; set; } = new();
}

public class PontoEvolucaoTaxaAdesaoResponseDto
{
    public DateTime PeriodoInicio { get; set; }
    public string PeriodoLabel { get; set; } = string.Empty;
    public int MatriculasConfirmadas { get; set; }
}
