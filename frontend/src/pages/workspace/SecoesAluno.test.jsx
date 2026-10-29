import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SecaoCursosAluno } from "./SecoesAluno.jsx";

/* Reproduz o bug relatado na tela PROGRESSO: matricula sem turma (matricula
   automatica/direta, ver pendencia_matriculas_sempre_automatica_2026_10_27 na
   memoria do projeto) mas com modulos/conteudos reais publicados pro curso -
   a consulta anterior filtrava conteudo/avaliacao por turmaId === matricula.
   turmaId, que dava vazio sempre que a matricula nao tinha turma, mesmo o
   curso tendo modulos. A correcao agrupa por cursoId. */
function montarCenario() {
  const cursos = [{ id: 10, titulo: "Curso Sem Turma na Matricula", imagemUrl: null }];
  const turmas = [{ id: 77, cursoId: 10, nomeTurma: "Turma online - Curso Sem Turma na Matricula" }];
  const modulos = [{ id: 100, cursoId: 10, titulo: "Fundamentos", dataCriacao: "2026-01-01" }];
  const conteudos = [
    {
      id: 1,
      cursoId: 10,
      moduloId: 100,
      moduloTitulo: "Fundamentos",
      turmaId: 77,
      turmaNome: "Turma online - Curso Sem Turma na Matricula",
      titulo: "Aula 1",
      ordemExibicao: 1
    }
  ];
  const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 0 }];
  const avaliacoes = [];
  const progressos = { conteudos: [], modulos: [], cursos: [] };

  return { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas };
}

describe("SecaoCursosAluno (tela Progresso)", () => {
  test("lista os modulos do curso mesmo quando a matricula nao tem turma vinculada", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));

    expect(screen.queryByText(/ainda nao possui modulos publicados/i)).not.toBeInTheDocument();
    expect(screen.getByText("Fundamentos")).toBeInTheDocument();
  });

  test("mostra o estado vazio quando o curso realmente nao tem modulo nenhum", async () => {
    const usuario = userEvent.setup();
    const cursos = [{ id: 20, titulo: "Curso Sem Modulo Nenhum", imagemUrl: null }];
    const matriculas = [{ id: 6, cursoId: 20, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = { conteudos: [], modulos: [], cursos: [] };

    render(
      <SecaoCursosAluno
        avaliacoes={[]}
        conteudos={[]}
        cursos={cursos}
        matriculas={matriculas}
        modulos={[]}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={[]}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Modulo Nenhum/i }));

    expect(screen.getByText(/ainda nao possui modulos publicados/i)).toBeInTheDocument();
  });
});
