namespace PlataformaEnsino.API.Models;

// Linha unica (singleton) de configuracao do Assistente CodeRyse - o Admin
// liga/desliga e define o teto mensal de gasto (freio de custo). Ver
// ChatbotService.VerificarDisponibilidadeAsync e o expurgo em
// ChatbotExpurgoService.
public class ConfiguracaoChatbot
{
    public int Id { get; set; }

    public bool Ativo { get; private set; } = true;

    public decimal TetoMensalUsd { get; private set; } = 20m;

    public DateTime? UltimoAvisoTetoEm { get; private set; }

    public static ConfiguracaoChatbot CriarPadrao()
    {
        return new ConfiguracaoChatbot
        {
            Ativo = true,
            TetoMensalUsd = 20m
        };
    }

    public void Atualizar(bool ativo, decimal tetoMensalUsd)
    {
        if (tetoMensalUsd <= 0)
        {
            throw new ArgumentException("O teto mensal de gasto deve ser maior que zero.");
        }

        Ativo = ativo;
        TetoMensalUsd = tetoMensalUsd;
    }

    public void RegistrarAvisoTeto(DateTime? momento = null)
    {
        UltimoAvisoTetoEm = momento ?? DateTime.UtcNow;
    }
}
