import { normalizeStatus } from "./format.js";

function estaConcluido(progresso) {
  return Boolean(progresso && (Number(progresso.percentualConclusao || 0) >= 100 || Number(progresso.statusProgresso) === 3));
}

function obterTituloCurso(cursoId, cursoPorId) {
  const curso = cursoPorId.get(cursoId);
  return curso?.titulo || `Curso #${cursoId}`;
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

  const matriculasAprovadas = matriculas.filter((matricula) => normalizeStatus(matricula.status) === "Aprovada");
  const progressoPorConteudoId = new Map((progressos.conteudos || []).map((progresso) => [progresso.conteudoDidaticoId, progresso]));

  // Fonte de verdade do progresso de modulo/curso e o backend
  // (ProgressoAlunoService.RecalcularModuloAsync/RecalcularCursoAsync), que
  // pondera quiz junto com conteudo via PesoProgresso e so conta o quiz
  // apos envio valido (todas as questoes respondidas) - nunca por abrir o
  // modal ou navegar entre questoes. Mesmo padrao do web (SecoesAluno.jsx).
  const progressoCursoPorMatriculaId = new Map((progressos.cursos || []).map((progresso) => [progresso.matriculaId, progresso]));
  const progressoModuloPorChave = new Map(
    (progressos.modulos || []).map((progresso) => [`${progresso.matriculaId}-${progresso.moduloId}`, progresso])
  );

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
        imagemUrl: cursoPorId.get(cursoId)?.imagemUrl || null,
        matriculaId: null,
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
    curso.matriculaId = matricula.id;

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
    modulo.conteudos.push({ ...conteudo, concluido, progresso, quizzes: [] });
  });

  // Quiz vinculado a um material especifico (avaliacao.conteudoDidaticoId) fica
  // aninhado nesse conteudo em vez de solto no modulo — espelha o mesmo
  // criterio de SecoesAluno.jsx (web), so que la o material morador e achado
  // via modulo.conteudos.find, aqui idem.
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

      const material = avaliacao.conteudoDidaticoId
        ? modulo.conteudos.find((conteudo) => conteudo.id === avaliacao.conteudoDidaticoId)
        : null;

      if (material) {
        material.quizzes.push(avaliacao);
      } else {
        modulo.quizzes.push(avaliacao);
      }
    });

  return [...cursosMapeados.values()].map((curso) => {
    const progressoCurso = curso.matriculaId != null ? progressoCursoPorMatriculaId.get(curso.matriculaId) : null;

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

      const progressoModulo =
        curso.matriculaId != null ? progressoModuloPorChave.get(`${curso.matriculaId}-${modulo.id}`) : null;

      return {
        ...modulo,
        bloqueado,
        conteudos: conteudosComBloqueio,
        progresso:
          progressoModulo?.percentualConclusao ??
          (modulo.conteudos.length ? (modulo.concluidos / modulo.conteudos.length) * 100 : 0),
        // Com progresso real do backend, "concluido" tambem considera o(s)
        // quiz(zes) do modulo (PesoProgresso) - nao so os conteudos, que e o
        // unico criterio quando ainda nao ha registro de progresso.
        concluido: progressoModulo ? estaConcluido(progressoModulo) : modulo.concluidos === modulo.conteudos.length
      };
    });

    const conteudosDoCurso = modulosComBloqueio.flatMap((modulo) => modulo.conteudos);

    return {
      id: curso.id,
      titulo: curso.titulo,
      imagemUrl: curso.imagemUrl,
      progresso:
        progressoCurso?.percentualConclusao ?? (curso.totalConteudos ? (curso.concluidos / curso.totalConteudos) * 100 : 0),
      modulos: modulosComBloqueio,
      proximoConteudo: conteudosDoCurso.find((conteudo) => !conteudo.concluido && !conteudo.bloqueado) || null
    };
  });
}
