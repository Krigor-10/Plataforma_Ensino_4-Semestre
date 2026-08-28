using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PlataformaEnsino.API.Models
{
    public class Aluno : Usuario
    {
        public string Matricula { get; set; } = string.Empty;

        [JsonIgnore]
        [ValidateNever]
        public List<Matricula> Matriculas { get; set; } = new();

        public override string ExibirDados()
        {
            return base.ExibirDados() + $"\n- Perfil: ALUNO\n- Matrícula: {Matricula}\n";
        }
    }
}
