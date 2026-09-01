import { normalizeStatus } from "./format.js";

function estaConcluido(progresso) {
  return Boolean(progresso && (Number(progresso.percentualConclusao || 0) >= 100 || Number(progresso.statusProgresso) === 3));
}

function obterTituloCurso(cursoId, cursoPorId) {
  const curso = cursoPorId.get(cursoId);
  return curso?.titulo || `Curso #${cursoId}`;
}

function obterNomeTurma(turmaId, turmaPorId) {
  const turma = turmaPorId.get(turmaId);
  return turma?.nomeTurma || (turmaId ? `Turma #${turmaId}` : "Turma em definicao");
}

/**
 * Monta curso -> modulo -> conteudos/quizzes, com bloqueio sequencial de
 * modulo (modulo so libera quando o anterior esta 100% concluido) e de
 * conteudo dentro do modulo (item so libera quando o anterior foi concluido).
 * Espelha a logica de gruposConteudosPorCurso em
 * frontend/src/pages/workspace/SecoesAluno.jsx.
 */
export function agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos }) {
  const cursoPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const turmaPorId = new Map();

  const matriculasAprovadas = matriculas.filter((matricula) => normalizeStatus(matricula.status) === "Aprovada");
  const progressoPorConteudoId = new Map((progressos.conteudos || []).map((progresso) => [progresso.conteudoDidaticoId, progresso]));

  const modulosPorCursoId = new Map();
  modulos.forEach((modulo) => {
    const cursoId = Number(modulo.cursoId);
    if (!modulosPorCursoId.has(cursoId)) {
      modulosPorCursoId.set(cursoId, []);
    }
    modulosPorCursoId.get(cursoId).push(modulo);
  });

  const cursosMapeados = new Map();

  function garantirCurso(cursoId) {
    if (!cursosMapeados.has(cursoId)) {
      cursosMapeados.set(cursoId, {
        id: cursoId,
        titulo: obterTituloCurso(cursoId, cursoPorId),
        turmas: new Set(),
        modulos: new Map(),
        totalConteudos: 0,
        concluidos: 0
      });
    }
    return cursosMapeados.get(cursoId);
  }

  function garantirModulo(curso, moduloId, tituloModulo, dataCriacao) {
    if (!curso.modulos.has(moduloId)) {
      curso.modulos.set(moduloId, {
        id: moduloId,
        titulo: tituloModulo || `Modulo #${moduloId}`,
        dataCriacao,
        conteudos: [],
        quizzes: [],
        concluidos: 0
      });
    }
    return curso.modulos.get(moduloId);
  }

  matriculasAprovadas.forEach((matricula) => {
    const cursoId = Number(matricula.cursoId);
    const curso = garantirCurso(cursoId);
    curso.turmas.add(obterNomeTurma(Number(matricula.turmaId), turmaPorId));

    (modulosPorCursoId.get(cursoId) || []).forEach((modulo) => {
      garantirModulo(curso, Number(modulo.id), modulo.titulo, modulo.dataCriacao);
    });
  });

  conteudos.forEach((conteudo) => {
    const cursoId = Number(conteudo.cursoId);
    if (!cursosMapeados.has(cursoId)) {
      return;
    }

    const curso = garantirCurso(cursoId);
    const moduloId = Number(conteudo.moduloId);
    const modulo = garantirModulo(curso, moduloId, conteudo.moduloTitulo, null);
    const progresso = progressoPorConteudoId.get(conteudo.id);
    const concluido = estaConcluido(progresso);

    curso.totalConteudos += 1;
    curso.concluidos += concluido ? 1 : 0;
    modulo.concluidos += concluido ? 1 : 0;
    modulo.conteudos.push({ ...conteudo, concluido, progresso });
  });

  (avaliacoes || [])
    .filter((avaliacao) => Number(avaliacao.tipoAvaliacao) === 1)
    .forEach((avaliacao) => {
      const cursoId = Number(avaliacao.cursoId);
      const curso = cursosMapeados.get(cursoId);
      if (!curso) {
        return;
      }

      const modulo = curso.modulos.get(Number(avaliacao.moduloId));
      if (!modulo) {
        return;
      }

      modulo.quizzes.push(avaliacao);
    });

  return [...cursosMapeados.values()].map((curso) => {
    const modulosOrdenados = [...curso.modulos.values()]
      .filter((modulo) => modulo.conteudos.length > 0 || modulo.quizzes.length > 0)
      .sort((moduloA, moduloB) => new Date(moduloA.dataCriacao || 0) - new Date(moduloB.dataCriacao || 0));

    let moduloAnterior = null;
    const modulosComBloqueio = modulosOrdenados.map((modulo) => {
      const bloqueado = Boolean(moduloAnterior) && moduloAnterior.concluidos < moduloAnterior.conteudos.length;
      moduloAnterior = modulo;

      let conteudoAnteriorConcluido = true;
      const conteudosComBloqueio = modulo.conteudos.map((conteudo) => {
        const itemBloqueado = bloqueado || !conteudoAnteriorConcluido;
        conteudoAnteriorConcluido = conteudo.concluido;
        return { ...conteudo, bloqueado: itemBloqueado };
      });

      return { ...modulo, bloqueado, conteudos: conteudosComBloqueio };
    });

    const conteudosDoCurso = modulosComBloqueio.flatMap((modulo) => modulo.conteudos);

    return {
      id: curso.id,
      titulo: curso.titulo,
      turmas: [...curso.turmas].filter(Boolean),
      progresso: curso.totalConteudos ? (curso.concluidos / curso.totalConteudos) * 100 : 0,
      modulos: modulosComBloqueio,
      proximoConteudo: conteudosDoCurso.find((conteudo) => !conteudo.concluido && !conteudo.bloqueado) || null
    };
  });
}
