using System.Security.Claims;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Interfaces;

/// <summary>
/// Chamados de suporte (fluxo-chatbot Fase 1) - roteamento Admin/Coordenador,
/// permissao de leitura/resposta por perfil e o ciclo
/// Aberto -> Respondido -> Resolvido (-> Aberto, se reaberto em at 7 dias).
/// </summary>
public interface IChamadoSuporteService
{
    Task<ChamadoSuporteResponseDto> AbrirAsync(int alunoId, AbrirChamadoDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ChamadoSuporteResponseDto>> ListarMeusAsync(int alunoId);
    Task<ChamadoSuporteResponseDto> ObterPorIdAsync(int chamadoId, ClaimsPrincipal usuario);

    /// <summary>Admin ve todos; Coordenador ve so os chamados dos cursos que coordena.</summary>
    Task<IReadOnlyList<ChamadoSuporteResponseDto>> ListarParaStaffAsync(ClaimsPrincipal usuario, StatusChamadoSuporte? status);

    /// <summary>Resposta do Aluno dono volta o status pra Aberto; resposta de Admin/Coordenador muda pra Respondido.</summary>
    Task<ChamadoSuporteResponseDto> ResponderAsync(int chamadoId, ClaimsPrincipal usuario, ResponderChamadoDto dto);

    Task ResolverAsync(int chamadoId, ClaimsPrincipal usuario);

    /// <summary>So o Aluno dono, e so em ate 7 dias depois de ResolvidoEm.</summary>
    Task ReabrirAsync(int chamadoId, int alunoId);
}
