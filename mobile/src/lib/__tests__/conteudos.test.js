import { agruparConteudosPorCurso } from "../conteudos.js";

function montarCenario() {
  const cursos = [{ id: 1, titulo: "Curso Teste" }];
  const matriculas = [{ cursoId: 1, turmaId: 5, status: "Aprovada" }];
  const modulos = [
    { id: 100, cursoId: 1, titulo: "Modulo 1", dataCriacao: "2026-01-01" },
    { id: 200, cursoId: 1, titulo: "Modulo 2", dataCriacao: "2026-02-01" }
  ];
  const conteudos = [
    { id: 1, cursoId: 1, moduloId: 100 },
    { id: 2, cursoId: 1, moduloId: 100 },
    { id: 3, cursoId: 1, moduloId: 200 }
  ];
  const progressos = {
    conteudos: [{ conteudoDidaticoId: 1, percentualConclusao: 100 }]
  };
  const avaliacoes = [
    { id: 500, tipoAvaliacao: 1, cursoId: 1, moduloId: 100, conteudoDidaticoId: 1 },
    { id: 501, tipoAvaliacao: 1, cursoId: 1, moduloId: 200, conteudoDidaticoId: null }
  ];

  return { avaliacoes, conteudos, cursos, matriculas, modulos, progressos };
}

describe("agruparConteudosPorCurso", () => {
  it("so inclui cursos com matricula aprovada", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const resultado = agruparConteudosPorCurso({
      avaliacoes,
      conteudos,
      cursos,
      matriculas: matriculas.map((matricula) => ({ ...matricula, status: "Pendente" })),
      modulos,
      progressos
    });

    expect(resultado).toHaveLength(0);
  });

  it("bloqueia o proximo modulo apenas quando o anterior nao esta 100% concluido", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const [curso] = agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos });

    const [modulo1, modulo2] = curso.modulos;
    expect(modulo1.bloqueado).toBe(false);
    expect(modulo2.bloqueado).toBe(true);
  });

  it("bloqueia o proximo conteudo dentro do modulo ate o anterior ser concluido", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const [curso] = agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos });

    const [conteudoA1, conteudoA2] = curso.modulos[0].conteudos;
    expect(conteudoA1.concluido).toBe(true);
    expect(conteudoA1.bloqueado).toBe(false);
    expect(conteudoA2.concluido).toBe(false);
    expect(conteudoA2.bloqueado).toBe(false);

    const [conteudoB1] = curso.modulos[1].conteudos;
    expect(conteudoB1.bloqueado).toBe(true);
  });

  it("aponta o proximo conteudo como o primeiro nao concluido e nao bloqueado", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const [curso] = agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos });

    expect(curso.proximoConteudo?.id).toBe(2);
  });

  it("aninha o quiz vinculado a um material especifico dentro do conteudo, nao solto no modulo", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const [curso] = agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos });

    const conteudoComQuiz = curso.modulos[0].conteudos.find((conteudo) => conteudo.id === 1);
    expect(conteudoComQuiz.quizzes).toHaveLength(1);
    expect(conteudoComQuiz.quizzes[0].id).toBe(500);
    expect(curso.modulos[0].quizzes).toHaveLength(0);
  });

  it("deixa o quiz solto no modulo quando nao esta vinculado a nenhum material", () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenario();
    const [curso] = agruparConteudosPorCurso({ avaliacoes, conteudos, cursos, matriculas, modulos, progressos });

    expect(curso.modulos[1].quizzes).toHaveLength(1);
    expect(curso.modulos[1].quizzes[0].id).toBe(501);
  });
});
