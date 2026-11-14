using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Common;

public static class ConteudoDidaticoMappingExtensions
{
    public static ConteudoDidaticoResponseDto ParaResponseDto(this ConteudoDidatico conteudo)
    {
        return new ConteudoDidaticoResponseDto
        {
            Id = conteudo.Id,
            Titulo = conteudo.Titulo,
            Descricao = conteudo.Descricao,
            TipoConteudo = conteudo.TipoConteudo,
            CorpoTexto = conteudo.CorpoTexto,
            ArquivoUrl = conteudo.ArquivoUrl,
            LinkUrl = conteudo.LinkUrl,
            ProfessorAutorId = conteudo.ProfessorAutorId,
            TurmaId = conteudo.TurmaId,
            TurmaNome = conteudo.Turma?.NomeTurma ?? string.Empty,
            CursoId = conteudo.CursoId,
            CursoTitulo = conteudo.Modulo?.Curso?.Titulo ?? string.Empty,
            ModuloId = conteudo.ModuloId,
            ModuloTitulo = conteudo.Modulo?.Titulo ?? string.Empty,
            StatusPublicacao = conteudo.StatusPublicacao,
            OrdemExibicao = conteudo.OrdemExibicao,
            PesoProgresso = conteudo.PesoProgresso,
            PublicadoEm = conteudo.PublicadoEm,
            CriadoEm = conteudo.CriadoEm,
            AtualizadoEm = conteudo.AtualizadoEm
        };
    }
}
