using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Common;

public static class AvaliacaoMappingExtensions
{
    public static AvaliacaoResponseDto ParaResponseDto(this Avaliacao avaliacao)
    {
        return new AvaliacaoResponseDto
        {
            Id = avaliacao.Id,
            Titulo = avaliacao.Titulo,
            Descricao = avaliacao.Descricao,
            ProfessorAutorId = avaliacao.ProfessorAutorId,
            TurmaId = avaliacao.TurmaId,
            TurmaNome = avaliacao.Turma?.NomeTurma ?? string.Empty,
            CursoId = avaliacao.CursoId,
            CursoTitulo = avaliacao.Modulo?.Curso?.Titulo ?? string.Empty,
            ModuloId = avaliacao.ModuloId,
            ModuloTitulo = avaliacao.Modulo?.Titulo ?? string.Empty,
            ConteudoDidaticoId = avaliacao.ConteudoDidaticoId,
            ConteudoDidaticoTitulo = avaliacao.ConteudoDidatico?.Titulo ?? string.Empty,
            TipoAvaliacao = avaliacao.TipoAvaliacao,
            StatusPublicacao = avaliacao.StatusPublicacao,
            DataAbertura = avaliacao.DataAbertura,
            DataFechamento = avaliacao.DataFechamento,
            TentativasPermitidas = avaliacao.TentativasPermitidas,
            TempoLimiteMinutos = avaliacao.TempoLimiteMinutos,
            NotaMaxima = avaliacao.NotaMaxima,
            PesoNota = avaliacao.PesoNota,
            PesoProgresso = avaliacao.PesoProgresso,
            TotalQuestoes = avaliacao.Questoes?.Count ?? 0,
            PublicadoEm = avaliacao.PublicadoEm,
            CriadoEm = avaliacao.CriadoEm,
            AtualizadoEm = avaliacao.AtualizadoEm
        };
    }

    public static QuestaoAvaliacaoResponseDto ParaResponseDto(this QuestaoPublicada questao)
    {
        return new QuestaoAvaliacaoResponseDto
        {
            Id = questao.Id,
            AvaliacaoId = questao.AvaliacaoId,
            QuestaoBancoId = questao.QuestaoBancoId,
            Ordem = questao.Ordem,
            TituloInterno = questao.QuestaoBanco?.TituloInterno ?? string.Empty,
            Tema = questao.QuestaoBanco?.Tema ?? string.Empty,
            Subtema = questao.QuestaoBanco?.Subtema ?? string.Empty,
            Dificuldade = questao.QuestaoBanco?.Dificuldade ?? 1,
            Contexto = questao.ContextoSnapshot,
            Enunciado = questao.EnunciadoSnapshot,
            TipoQuestao = questao.TipoQuestao,
            Explicacao = questao.ExplicacaoSnapshot,
            ReferenciasBibliograficas = questao.ReferenciasBibliograficasSnapshot,
            Pontos = questao.Pontos,
            Anexos = (questao.QuestaoBanco?.Anexos ?? new List<AnexoQuestaoBanco>())
                .OrderBy(anexo => anexo.Ordem)
                .Select(anexo => new AnexoQuestaoBancoResponseDto
                {
                    Id = anexo.Id,
                    Titulo = anexo.Titulo,
                    TipoAnexo = anexo.TipoAnexo,
                    ArquivoUrl = anexo.ArquivoUrl,
                    Ordem = anexo.Ordem
                })
                .ToList(),
            Alternativas = questao.Alternativas
                .OrderBy(alternativa => alternativa.Ordem)
                .Select(alternativa => new AlternativaAvaliacaoResponseDto
                {
                    Id = alternativa.Id,
                    Letra = alternativa.Letra,
                    Texto = alternativa.Texto,
                    EhCorreta = alternativa.EhCorreta,
                    Justificativa = alternativa.JustificativaSnapshot,
                    Ordem = alternativa.Ordem
                })
                .ToList(),
            Afirmativas = questao.Afirmativas
                .OrderBy(afirmativa => afirmativa.Ordem)
                .Select(afirmativa => new AfirmativaQuestaoResponseDto
                {
                    Id = afirmativa.Id,
                    Numero = afirmativa.Numero,
                    Texto = afirmativa.Texto,
                    EhCorreta = afirmativa.EhCorreta,
                    Justificativa = afirmativa.JustificativaSnapshot,
                    Ordem = afirmativa.Ordem
                })
                .ToList()
        };
    }
}
