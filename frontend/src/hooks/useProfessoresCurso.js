import { useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api.js";

/* Estado + chamadas de API dos professores vinculados a UM curso (N:N,
   tabela ProfessoresCursos), usado por PainelCursoGestao.jsx (Admin e
   Coordenador, curso ja fixo). Apresentacao em BlocoProfessoresCurso.jsx. */
export function useProfessoresCurso({ cursoId, mostrarToast, onRefresh, onSessionExpired, professores = [] }) {
  const [professoresDoCurso, setProfessoresDoCurso] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [professorParaVincular, setProfessorParaVincular] = useState(null);
  const [vinculando, setVinculando] = useState(false);
  const [desvinculandoId, setDesvinculandoId] = useState(null);

  useEffect(() => {
    if (!cursoId) {
      setProfessoresDoCurso([]);
      return undefined;
    }

    let ativo = true;
    setCarregando(true);
    setErro("");

    apiRequest(`/Cursos/${cursoId}/professores`)
      .then((dados) => {
        if (ativo) {
          setProfessoresDoCurso(dados);
        }
      })
      .catch((err) => {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar os professores deste curso agora.");
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [cursoId, onSessionExpired]);

  const idsVinculados = useMemo(() => new Set(professoresDoCurso.map((professor) => professor.id)), [professoresDoCurso]);
  const professoresDisponiveisParaVincular = useMemo(
    () =>
      [...professores]
        .filter((professor) => !idsVinculados.has(professor.id))
        .sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [idsVinculados, professores]
  );

  async function vincularProfessor() {
    if (!professorParaVincular) {
      return;
    }

    try {
      setVinculando(true);

      await apiRequest(`/Cursos/${cursoId}/professores/${professorParaVincular}`, { method: "POST" });

      const atualizados = await apiRequest(`/Cursos/${cursoId}/professores`);
      setProfessoresDoCurso(atualizados);
      setProfessorParaVincular(null);
      mostrarToast("Professor vinculado ao curso com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel vincular o professor agora.", "erro");
    } finally {
      setVinculando(false);
    }
  }

  async function desvincularProfessor(professorId) {
    try {
      setDesvinculandoId(professorId);

      await apiRequest(`/Cursos/${cursoId}/professores/${professorId}`, { method: "DELETE" });

      setProfessoresDoCurso((atuais) => atuais.filter((professor) => professor.id !== professorId));
      mostrarToast("Professor desvinculado do curso com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel desvincular o professor agora.", "erro");
    } finally {
      setDesvinculandoId(null);
    }
  }

  return {
    carregando,
    desvincularProfessor,
    desvinculandoId,
    erro,
    professoresDisponiveisParaVincular,
    professoresDoCurso,
    professorParaVincular,
    setProfessorParaVincular,
    vincularProfessor,
    vinculando
  };
}
