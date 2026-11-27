import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SecaoAvaliacoesAluno, SecaoConteudosAluno, SecaoCursosAluno } from "./SecoesAluno.jsx";
import { AssistenteChatbotProvider } from "../../hooks/useAssistenteChatbot.jsx";
import { ToastProvider } from "../../hooks/useToast.jsx";
import { apiRequest, ApiError } from "../../lib/api.js";

vi.mock("../../lib/api.js", async () => {
  const real = await vi.importActual("../../lib/api.js");
  return { ...real, apiRequest: vi.fn() };
});

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
  beforeEach(() => {
    apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("lista os modulos do curso mesmo quando a matricula nao tem turma vinculada", async () => {
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    expect(screen.queryByText(/ainda nao possui modulos publicados/i)).not.toBeInTheDocument();
    expect(screen.getByText("Fundamentos")).toBeInTheDocument();
  });

  test("mostra o estado vazio quando o curso realmente nao tem modulo nenhum", async () => {
    const cursos = [{ id: 20, titulo: "Curso Sem Modulo Nenhum", imagemUrl: null }];
    const matriculas = [{ id: 6, cursoId: 20, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = { conteudos: [], modulos: [], cursos: [] };

    render(
      <SecaoCursosAluno
        avaliacoes={[]}
        conteudos={[]}
        cursoIdSelecionado={20}
        cursos={cursos}
        matriculas={matriculas}
        modulos={[]}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={[]}
      />
    );

    expect(screen.getByText(/ainda nao possui modulos publicados/i)).toBeInTheDocument();
  });

  // PROMPT-agente-progresso-e-trava-ao-concluir.md, Parte B, item 7: modulo
  // so com quiz (sem nenhum conteudo) precisa aparecer na tela de Progresso
  // e entrar em "Modulos concluidos" - antes o filtro so olhava conteudos.
  test("modulo so com quiz (sem conteudo) aparece e entra em Modulos concluidos", async () => {
    const cursos = [{ id: 30, titulo: "Curso So Com Quiz", imagemUrl: null }];
    const modulos = [{ id: 300, cursoId: 30, titulo: "Fundamentos de Quiz", dataCriacao: "2026-01-01" }];
    const avaliacoes = [
      { id: 900, cursoId: 30, moduloId: 300, moduloTitulo: "Fundamentos de Quiz", titulo: "Quiz do modulo", tipoAvaliacao: 1, statusPublicacao: 2 }
    ];
    const matriculas = [{ id: 7, cursoId: 30, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = {
      conteudos: [],
      modulos: [{ matriculaId: 7, moduloId: 300, percentualConclusao: 100, statusProgresso: 3 }],
      cursos: [{ matriculaId: 7, cursoId: 30, percentualConclusao: 100, statusProgresso: 3 }]
    };

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={[]}
        cursoIdSelecionado={30}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={[]}
      />
    );

    expect(screen.queryByText(/ainda nao possui modulos publicados/i)).not.toBeInTheDocument();
    expect(screen.getByText("Fundamentos de Quiz")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  test("clicar num curso navega pra /app/meus-cursos/:id, e Voltar navega de volta pra lista", async () => {
    const usuario = userEvent.setup();
    const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();
    const onNavigate = vi.fn();

    const { rerender } = render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={onNavigate}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: /Curso Sem Turma na Matricula/i }));
    expect(onNavigate).toHaveBeenCalledWith("/app/meus-cursos/10");

    rerender(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={onNavigate}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await usuario.click(screen.getByRole("button", { name: "Voltar para Progresso" }));
    expect(onNavigate).toHaveBeenCalledWith("/app/meus-cursos");
  });

  // Reproduz o bug: progresso de conteudo/modulo em 100% nao pode, por si
  // so, liberar o card de certificado - so GET /Certificados/status (que
  // sabe de avaliacao formal/nota minima/correcao pendente) pode.
  test("nao mostra o card de certificado so porque o progresso de conteudo esta em 100%", async () => {
    const { avaliacoes, conteudos, cursos, modulos, turmas } = montarCenario();
    const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 0 }];
    const progressos = {
      conteudos: [],
      modulos: [],
      cursos: [{ matriculaId: 5, percentualConclusao: 100 }]
    };
    apiRequest.mockResolvedValue([
      { matriculaId: 5, cursoId: 10, certificadoDisponivel: false, pendenciasCertificado: ["A avaliacao final ainda nao foi realizada."] }
    ]);

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/Certificados/status"));

    expect(screen.queryByText(/Parabens! Certificado disponivel/i)).not.toBeInTheDocument();
  });

  test("mostra o card de certificado quando o backend confirma a liberacao real", async () => {
    const { avaliacoes, conteudos, cursos, modulos, turmas } = montarCenario();
    const matriculas = [{ id: 5, cursoId: 10, turmaId: null, status: "Aprovada", notaFinal: 8 }];
    const progressos = {
      conteudos: [],
      modulos: [],
      cursos: [{ matriculaId: 5, percentualConclusao: 100 }]
    };
    apiRequest.mockResolvedValue([{ matriculaId: 5, cursoId: 10, certificadoDisponivel: true, pendenciasCertificado: [] }]);

    render(
      <SecaoCursosAluno
        avaliacoes={avaliacoes}
        conteudos={conteudos}
        cursoIdSelecionado={10}
        cursos={cursos}
        matriculas={matriculas}
        modulos={modulos}
        onNavigate={vi.fn()}
        progressos={progressos}
        turmas={turmas}
      />
    );

    expect(await screen.findByText(/Parabens! Certificado disponivel/i)).toBeInTheDocument();
  });

  // docs/TelaConteudosAlunos/PROMPT-agente-progresso-aluno-cabecalho-curso.md:
  // titulo + subtitulo de turma + grade-estatisticas (4 cartoes) saem, entra
  // o mesmo cabecalho CartaoCursoModulo medio da tela do modulo do
  // coordenador, com 3 KPIs e o selo da trilha do aluno.
  describe("cabecalho do detalhe (CartaoCursoModulo medio)", () => {
    function montarCenarioComAvaliacaoFormal({ certificadoEmitidoEm = null, notaFinal = 8.5, percentualConclusao = 100 } = {}) {
      const cursos = [{ id: 40, titulo: "Curso Completo", descricao: "Descricao do curso completo", imagemUrl: null }];
      const modulos = [{ id: 400, cursoId: 40, titulo: "Modulo 1", dataCriacao: "2026-01-01" }];
      const conteudos = [
        { id: 1, cursoId: 40, moduloId: 400, moduloTitulo: "Modulo 1", turmaId: null, titulo: "Aula 1", ordemExibicao: 1 },
        { id: 2, cursoId: 40, moduloId: 400, moduloTitulo: "Modulo 1", turmaId: null, titulo: "Aula 2", ordemExibicao: 2 }
      ];
      const avaliacoes = [
        { id: 900, cursoId: 40, moduloId: 400, moduloTitulo: "Modulo 1", titulo: "Prova Final", tipoAvaliacao: 2, statusPublicacao: 2 }
      ];
      const matriculas = [{ id: 8, cursoId: 40, turmaId: null, status: "Aprovada", notaFinal, certificadoEmitidoEm }];
      const progressos = {
        conteudos: [
          { conteudoDidaticoId: 1, percentualConclusao: 100 },
          { conteudoDidaticoId: 2, percentualConclusao: 100 }
        ],
        modulos: [{ matriculaId: 8, moduloId: 400, percentualConclusao: 100, statusProgresso: 3 }],
        cursos: [{ matriculaId: 8, percentualConclusao: percentualConclusao }]
      };

      return { avaliacoes, conteudos, cursos, matriculas, modulos, progressos };
    }

    test("mostra o cartao medio com 3 KPIs certos e a legenda da barra, sem a grade-estatisticas nem o texto da turma", () => {
      const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenarioComAvaliacaoFormal();

      render(
        <SecaoCursosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={40}
          cursos={cursos}
          matriculas={matriculas}
          modulos={modulos}
          onNavigate={vi.fn()}
          progressos={progressos}
          turmas={[]}
        />
      );

      expect(document.querySelector(".cartao-curso-modulo--medio")).not.toBeNull();
      expect(document.querySelector(".grade-estatisticas")).toBeNull();
      expect(document.querySelector(".atividades-curso__subtitulo")).toBeNull();
      expect(screen.getByText("100% do curso concluído")).toBeInTheDocument();

      const kpiModulos = screen.getByText("Módulos concluídos").closest(".cartao-curso-modulo__kpi");
      const kpiConteudos = screen.getByText("Conteúdos concluídos").closest(".cartao-curso-modulo__kpi");
      const kpiNota = screen.getByText("Nota final").closest(".cartao-curso-modulo__kpi");
      expect(within(kpiModulos).getByText("1/1")).toBeInTheDocument();
      expect(within(kpiConteudos).getByText("2/2")).toBeInTheDocument();
      expect(within(kpiNota).getByText("8,5")).toBeInTheDocument();
    });

    test("selo 'Certificado emitido' quando a matricula tem certificadoEmitidoEm", () => {
      const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenarioComAvaliacaoFormal({
        certificadoEmitidoEm: "2026-08-28T00:00:00Z"
      });

      render(
        <SecaoCursosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={40}
          cursos={cursos}
          matriculas={matriculas}
          modulos={modulos}
          onNavigate={vi.fn()}
          progressos={progressos}
          turmas={[]}
        />
      );

      expect(screen.getAllByText("🏆 Certificado emitido")).toHaveLength(1);
    });

    test("selo 'Concluído' com 100% e sem certificado emitido", () => {
      const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenarioComAvaliacaoFormal();

      render(
        <SecaoCursosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={40}
          cursos={cursos}
          matriculas={matriculas}
          modulos={modulos}
          onNavigate={vi.fn()}
          progressos={progressos}
          turmas={[]}
        />
      );

      expect(screen.getAllByText("Concluído")).toHaveLength(1);
    });

    test("selo 'Curso em andamento' abaixo de 100%", () => {
      const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos } = montarCenarioComAvaliacaoFormal({
        percentualConclusao: 50
      });

      render(
        <SecaoCursosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={40}
          cursos={cursos}
          matriculas={matriculas}
          modulos={modulos}
          onNavigate={vi.fn()}
          progressos={progressos}
          turmas={[]}
        />
      );

      expect(screen.getAllByText("Curso em andamento")).toHaveLength(1);
    });

    test("nota final mostra '—' quando o curso nao tem avaliacao formal", () => {
      const { avaliacoes, conteudos, cursos, matriculas, modulos, progressos, turmas } = montarCenario();

      render(
        <SecaoCursosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={10}
          cursos={cursos}
          matriculas={matriculas}
          modulos={modulos}
          onNavigate={vi.fn()}
          progressos={progressos}
          turmas={turmas}
        />
      );

      const kpiNota = screen.getByText("Nota final").closest(".cartao-curso-modulo__kpi");
      expect(within(kpiNota).getByText("—")).toBeInTheDocument();
    });
  });
});

describe("SecaoAvaliacoesAluno (prompt metricas avaliacoes aluno e gestao)", () => {
  const CURSO_ID = 10;

  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderAvaliacoesAluno(avaliacoes) {
    return render(
      <ToastProvider>
        <AssistenteChatbotProvider ativo={false} contexto={null} onNavigate={vi.fn()}>
          <SecaoAvaliacoesAluno
            avaliacoes={avaliacoes}
            cursoIdSelecionado={CURSO_ID}
            cursos={[{ id: CURSO_ID, titulo: "Curso Teste" }]}
            onNavigate={vi.fn()}
            onRefresh={vi.fn()}
            onSessionExpired={vi.fn()}
          />
        </AssistenteChatbotProvider>
      </ToastProvider>
    );
  }

  test("prova disponivel com nota: metricas centralizadas mostram Status/Questoes/Tentativas/Ultima nota com icone", async () => {
    const usuario = userEvent.setup();
    renderAvaliacoesAluno([
      {
        id: 1,
        cursoId: CURSO_ID,
        titulo: "Prova Final",
        tipoAvaliacao: 2,
        totalQuestoes: 5,
        tentativasRealizadas: 1,
        tentativasPermitidas: 2,
        tentativasRestantes: 1,
        progressoLiberado: true,
        ultimaNota: 7.5,
        notaMaxima: 10
      }
    ]);

    await usuario.click(screen.getByRole("button", { name: /Prova Final/ }));

    expect(screen.getByText("Disponivel")).toBeInTheDocument();
    expect(screen.getByText("Questões")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Tentativas")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("Última nota")).toBeInTheDocument();
    expect(screen.getByText("7,5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iniciar avaliacao/ })).toBeInTheDocument();
  });

  test("avaliacao bloqueada: mostra Nota máxima (sem Ultima nota) e a mensagem de bloqueio no lugar do botao", async () => {
    const usuario = userEvent.setup();
    renderAvaliacoesAluno([
      {
        id: 2,
        cursoId: CURSO_ID,
        titulo: "Prova Bloqueada",
        tipoAvaliacao: 2,
        totalQuestoes: 3,
        tentativasRealizadas: 0,
        tentativasPermitidas: 1,
        tentativasRestantes: 1,
        progressoLiberado: false,
        ultimaNota: null,
        notaMaxima: 10
      }
    ]);

    await usuario.click(screen.getByRole("button", { name: /Prova Bloqueada/ }));

    expect(screen.getByText("Nota máxima")).toBeInTheDocument();
    expect(screen.queryByText("Última nota")).not.toBeInTheDocument();
    expect(screen.getByText(/Conclua todos os conteudos e quizzes do curso/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Iniciar avaliacao/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por quê\? Pergunte ao assistente/ })).toBeInTheDocument();
  });
});

describe("TelaCursoAluno / TelaModuloGestaoAluno (SecaoConteudosAluno, trilha no mesmo fluxo do professor)", () => {
  const CURSO_ID = 10;
  const TURMA_ID = 77;
  const MATRICULA_ID = 5;
  const MODULO_ID = 100;

  beforeEach(() => {
    apiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderConteudosAluno({ avaliacoes = [], conteudos = [], moduloIdSelecionado = null, modulos, onNavigate = vi.fn(), progressos } = {}) {
    return render(
      <ToastProvider>
        <SecaoConteudosAluno
          avaliacoes={avaliacoes}
          conteudos={conteudos}
          cursoIdSelecionado={CURSO_ID}
          cursos={[{ id: CURSO_ID, titulo: "Curso Teste" }]}
          matriculas={[{ id: MATRICULA_ID, cursoId: CURSO_ID, turmaId: TURMA_ID, status: "Aprovada" }]}
          moduloIdSelecionado={moduloIdSelecionado}
          modulos={modulos || [{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }]}
          onNavigate={onNavigate}
          onRefresh={vi.fn()}
          onSessionExpired={vi.fn()}
          progressos={progressos || { conteudos: [], modulos: [], cursos: [] }}
          turmas={[{ id: TURMA_ID, cursoId: CURSO_ID, nomeTurma: "Turma A" }]}
        />
      </ToastProvider>
    );
  }

  test('cartao do modulo (tela do curso) mostra "N de M concluídos" contando quizzes, com singular', () => {
    const { container } = renderConteudosAluno({
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          totalQuestoes: 1,
          tentativasRealizadas: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const contagem = container.querySelector(".modulos-curso-aluno__contagem");
    expect(contagem.textContent).toMatch(/1 de 1 concluído$/);
  });

  test("módulo concluído mostra check verde no cartão, e clicar navega para a tela do módulo", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      progressos: { conteudos: [{ conteudoDidaticoId: 1, percentualConclusao: 100 }], modulos: [], cursos: [] },
      onNavigate
    });

    const cartaoModulo = screen.getByRole("button", { name: /Módulo 1/ });
    expect(cartaoModulo.querySelector(".modulos-curso-aluno__check")).toBeInTheDocument();
    expect(cartaoModulo.querySelector(".modulos-curso-aluno__seta")).toBeInTheDocument();
    expect(cartaoModulo.lastElementChild).toHaveClass("modulos-curso-aluno__seta");

    await usuario.click(cartaoModulo);
    expect(onNavigate).toHaveBeenCalledWith(`/app/conteudos/${CURSO_ID}/modulos/${MODULO_ID}`);
  });

  test("módulo em andamento (não concluído) tem a seta › como último elemento da linha", () => {
    renderConteudosAluno({
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ]
    });

    const cartaoModulo = screen.getByRole("button", { name: /Módulo 1/ });
    expect(cartaoModulo.querySelector(".modulos-curso-aluno__check")).not.toBeInTheDocument();
    expect(cartaoModulo.querySelector(".modulos-curso-aluno__seta")).toBeInTheDocument();
    expect(cartaoModulo.lastElementChild).toHaveClass("modulos-curso-aluno__seta");
  });

  test("módulo bloqueado no cartão não é clicável e tem o aviso certo", async () => {
    const usuario = userEvent.setup();
    const onNavigate = vi.fn();
    const MODULO_2 = 101;
    renderConteudosAluno({
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 },
        { id: 2, cursoId: CURSO_ID, moduloId: MODULO_2, turmaId: TURMA_ID, titulo: "Aula 2", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      onNavigate
    });

    const cartaoBloqueado = screen.getByRole("button", { name: /Módulo 2/ });
    expect(cartaoBloqueado).toHaveAttribute("aria-disabled", "true");
    expect(cartaoBloqueado).toHaveAttribute("title", "Conclua o módulo 01 para liberar");
    expect(cartaoBloqueado.querySelector(".modulos-curso-aluno__seta")).not.toBeInTheDocument();

    await usuario.click(cartaoBloqueado);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("linha do módulo liberado mostra contagem, barra, % e a seta nessa ordem", () => {
    renderConteudosAluno({
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          totalQuestoes: 1,
          tentativasRealizadas: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const cartaoModulo = screen.getByRole("button", { name: /Módulo 1/ });
    const direita = cartaoModulo.querySelector(".modulos-curso-aluno__direita");
    const ordemClasses = Array.from(direita.children).map((elemento) => elemento.className);

    expect(ordemClasses[0]).toContain("modulos-curso-aluno__contagem");
    expect(ordemClasses[1]).toContain("modulos-curso-aluno__barra");
    expect(ordemClasses[2]).toContain("modulos-curso-aluno__percentual");
    expect(cartaoModulo.lastElementChild).toHaveClass("modulos-curso-aluno__seta");
  });

  test('"Ver revisão" aparece na tela do módulo e abre a revisão', async () => {
    const usuario = userEvent.setup();
    apiRequest.mockResolvedValue({ questoes: [], notaBruta: 0, notaMaxima: 10 });
    renderConteudosAluno({
      moduloIdSelecionado: MODULO_ID,
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do Módulo",
          totalQuestoes: 1,
          tentativasRealizadas: 1,
          ultimaTentativaId: 900,
          ultimoStatusTentativa: 3
        }
      ]
    });

    const botaoVerRevisao = screen.getByRole("button", { name: "Ver revisão" });
    expect(botaoVerRevisao).toBeInTheDocument();

    await usuario.click(botaoVerRevisao);

    expect(await screen.findByRole("dialog", { name: "Revisão detalhada · Quiz do Módulo" })).toBeInTheDocument();
  });

  test('"Iniciar quiz" aparece na tela do módulo nos dois tipos de quiz e abre a confirmação', async () => {
    const usuario = userEvent.setup();
    renderConteudosAluno({
      moduloIdSelecionado: MODULO_ID,
      conteudos: [
        {
          id: 1,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          turmaId: TURMA_ID,
          titulo: "Aula 1",
          tipoConteudo: 1,
          ordemExibicao: 1
        }
      ],
      // Quiz vinculado so libera com o conteudo-pai concluido (ordem estrita).
      progressos: { conteudos: [{ conteudoDidaticoId: 1, percentualConclusao: 100 }], modulos: [], cursos: [] },
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz vinculado",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        },
        {
          id: 201,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: null,
          tipoAvaliacao: 1,
          titulo: "Quiz do módulo",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const botoesIniciar = screen.getAllByRole("button", { name: "Iniciar quiz" });
    expect(botoesIniciar).toHaveLength(2);

    await usuario.click(botoesIniciar[0]);

    expect(screen.getByRole("dialog", { name: "Antes de comecar" })).toBeInTheDocument();
  });

  test("item bloqueado na tela do módulo fica inerte com cadeado, e o quiz vinculado a ele tambem aparece bloqueado", async () => {
    const usuario = userEvent.setup();
    renderConteudosAluno({
      moduloIdSelecionado: MODULO_ID,
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 2, arquivoUrl: "a.pdf", ordemExibicao: 1 },
        { id: 2, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 2", tipoConteudo: 2, arquivoUrl: "b.pdf", ordemExibicao: 2 }
      ],
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 2,
          tipoAvaliacao: 1,
          titulo: "Quiz da Aula 2",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const itemBloqueado = screen.getByText("Aula 2").closest(".painel-itens-modulo__item");
    expect(within(itemBloqueado).getByText(/Bloqueado/)).toBeInTheDocument();

    await usuario.click(within(itemBloqueado).getByText("Aula 2"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const itemQuizBloqueado = screen.getByText("Quiz da Aula 2").closest(".painel-itens-modulo__item");
    expect(within(itemQuizBloqueado).getByText(/Bloqueado/)).toBeInTheDocument();
    expect(within(itemQuizBloqueado).queryByRole("button", { name: "Iniciar quiz" })).not.toBeInTheDocument();
  });

  describe("ordem estrita + quiz vinculado recuado (PROMPT-agente-quiz-vinculado-ordem-estrita.md)", () => {
    const conteudosDoModulo = [
      { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Conteúdo 1", tipoConteudo: 2, arquivoUrl: "a.pdf", ordemExibicao: 1 },
      { id: 2, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Conteúdo 2", tipoConteudo: 3, arquivoUrl: "b.mp4", ordemExibicao: 2 }
    ];
    const conteudo1Concluido = { conteudos: [{ conteudoDidaticoId: 1, percentualConclusao: 100 }], modulos: [], cursos: [] };

    function quizVinculadoAoConteudo1(extras = {}) {
      return {
        id: 300,
        cursoId: CURSO_ID,
        moduloId: MODULO_ID,
        conteudoDidaticoId: 1,
        tipoAvaliacao: 1,
        titulo: "Revisão rápida",
        totalQuestoes: 3,
        tentativasRestantes: 1,
        tentativasPermitidas: 1,
        ...extras
      };
    }

    test("conteúdo 1 concluído e quiz não enviado: quiz liberado e destacado, conteúdo 2 espera o quiz", () => {
      renderConteudosAluno({
        moduloIdSelecionado: MODULO_ID,
        conteudos: conteudosDoModulo,
        avaliacoes: [quizVinculadoAoConteudo1()],
        progressos: conteudo1Concluido
      });

      const itemQuiz = screen.getByText("Revisão rápida").closest(".painel-itens-modulo__item");
      expect(itemQuiz).toHaveClass("painel-itens-modulo__item--vinculado");
      expect(itemQuiz).toHaveClass("painel-itens-modulo__item--proximo-passo");
      expect(itemQuiz.querySelector(".painel-itens-modulo__conector-vinculo")).toBeInTheDocument();
      expect(within(itemQuiz).getByText(/Quiz sobre Conteúdo 1/)).toBeInTheDocument();
      expect(within(itemQuiz).getByRole("button", { name: "Iniciar quiz" })).toBeInTheDocument();

      const itemConteudo2 = screen.getByText("Conteúdo 2").closest(".painel-itens-modulo__item");
      expect(within(itemConteudo2).getByText(/Responda o quiz acima para liberar/)).toBeInTheDocument();
      expect(itemConteudo2).not.toHaveClass("painel-itens-modulo__item--proximo-passo");
    });

    test("depois de enviar o quiz, o conteúdo 2 libera e vira o próximo passo", () => {
      renderConteudosAluno({
        moduloIdSelecionado: MODULO_ID,
        conteudos: conteudosDoModulo,
        avaliacoes: [quizVinculadoAoConteudo1({ tentativasRealizadas: 1, tentativasRestantes: 0 })],
        progressos: conteudo1Concluido
      });

      const itemConteudo2 = screen.getByText("Conteúdo 2").closest(".painel-itens-modulo__item");
      expect(within(itemConteudo2).queryByText(/Bloqueado/)).not.toBeInTheDocument();
      expect(itemConteudo2).toHaveClass("painel-itens-modulo__item--proximo-passo");
    });

    test("conteúdo-pai pendente: quiz vinculado bloqueado, mas o primeiro conteúdo é o próximo passo", () => {
      renderConteudosAluno({
        moduloIdSelecionado: MODULO_ID,
        conteudos: conteudosDoModulo,
        avaliacoes: [quizVinculadoAoConteudo1({ progressoLiberado: false })]
      });

      const itemQuiz = screen.getByText("Revisão rápida").closest(".painel-itens-modulo__item");
      expect(within(itemQuiz).getByText(/Bloqueado/)).toBeInTheDocument();
      expect(within(itemQuiz).queryByRole("button", { name: "Iniciar quiz" })).not.toBeInTheDocument();
      expect(screen.getByText("Conteúdo 1").closest(".painel-itens-modulo__item")).toHaveClass(
        "painel-itens-modulo__item--proximo-passo"
      );
    });

    test("quiz solto continua no fim, sem recuo nem conector", () => {
      renderConteudosAluno({
        moduloIdSelecionado: MODULO_ID,
        conteudos: conteudosDoModulo,
        avaliacoes: [quizVinculadoAoConteudo1({ id: 301, conteudoDidaticoId: null, titulo: "Quiz do módulo", progressoLiberado: false })]
      });

      const itens = Array.from(document.querySelectorAll(".painel-itens-modulo__item"));
      const itemQuizSolto = screen.getByText("Quiz do módulo").closest(".painel-itens-modulo__item");
      expect(itens[itens.length - 1]).toBe(itemQuizSolto);
      expect(itemQuizSolto).not.toHaveClass("painel-itens-modulo__item--vinculado");
      expect(itemQuizSolto.querySelector(".painel-itens-modulo__conector-vinculo")).not.toBeInTheDocument();
      expect(within(itemQuizSolto).queryByText(/Quiz sobre/)).not.toBeInTheDocument();
    });

    test('"Continuar" do cartão do curso aponta para o quiz vinculado antes do conteúdo 2', () => {
      renderConteudosAluno({
        conteudos: conteudosDoModulo,
        avaliacoes: [quizVinculadoAoConteudo1()],
        progressos: conteudo1Concluido
      });

      expect(screen.getByRole("button", { name: /Continuar: Revisão rápida/ })).toBeInTheDocument();
    });
  });

  test('quiz com titulo generico exibe "Quiz do conteúdo" na tela do módulo, e o titulo proprio e mantido', () => {
    renderConteudosAluno({
      moduloIdSelecionado: MODULO_ID,
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      avaliacoes: [
        {
          id: 200,
          cursoId: CURSO_ID,
          moduloId: MODULO_ID,
          conteudoDidaticoId: 1,
          tipoAvaliacao: 1,
          titulo: "Quiz - Aula 1",
          totalQuestoes: 1,
          tentativasRestantes: 1,
          tentativasPermitidas: 1
        }
      ]
    });

    const tituloQuiz = screen.getByText("Quiz do conteúdo");
    expect(tituloQuiz).toBeInTheDocument();
    expect(tituloQuiz).toHaveAttribute("title", "Quiz - Aula 1");
    expect(screen.queryByText("Quiz - Aula 1")).not.toBeInTheDocument();
  });

  test("moduloIdSelecionado de um modulo bloqueado redireciona de volta para a tela do curso", async () => {
    const onNavigate = vi.fn();
    const MODULO_2 = 101;
    renderConteudosAluno({
      moduloIdSelecionado: MODULO_2,
      modulos: [
        { id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" },
        { id: MODULO_2, cursoId: CURSO_ID, titulo: "Módulo 2", dataCriacao: "2026-01-02" }
      ],
      conteudos: [
        { id: 1, cursoId: CURSO_ID, moduloId: MODULO_ID, turmaId: TURMA_ID, titulo: "Aula 1", tipoConteudo: 1, ordemExibicao: 1 },
        { id: 2, cursoId: CURSO_ID, moduloId: MODULO_2, turmaId: TURMA_ID, titulo: "Aula 2", tipoConteudo: 1, ordemExibicao: 1 }
      ],
      onNavigate
    });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(`/app/conteudos/${CURSO_ID}`, { replace: true }));
  });
});

// docs/bugs/PROMPT-agente-envio-avaliacao-alterada-durante-resposta.md: o
// envio manda iniciadaEm e, quando o professor mexeu na avaliacao durante a
// resposta, mostra a mensagem certa por codigo sem fechar a tela nem perder
// o rascunho local.
describe("SecaoConteudosAluno - envio de avaliacao alterada durante a resposta", () => {
  const CURSO_ID = 10;
  const TURMA_ID = 77;
  const MATRICULA_ID = 5;
  const MODULO_ID = 100;
  const AVALIACAO_ID = 200;

  const QUESTAO = {
    id: 1,
    ordem: 1,
    enunciado: "Pergunta de teste",
    tipoQuestao: 2,
    pontos: 5,
    contexto: "",
    alternativas: [
      { id: 1, letra: "A", texto: "Resposta A" },
      { id: 2, letra: "B", texto: "Resposta B" }
    ],
    afirmativas: []
  };

  beforeEach(() => {
    window.sessionStorage.setItem("usuarioLogado", JSON.stringify({ id: 1 }));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  function renderComQuiz() {
    return render(
      <ToastProvider>
        <SecaoConteudosAluno
          avaliacoes={[
            {
              id: AVALIACAO_ID,
              cursoId: CURSO_ID,
              moduloId: MODULO_ID,
              conteudoDidaticoId: null,
              tipoAvaliacao: 1,
              titulo: "Quiz do módulo",
              totalQuestoes: 1,
              tentativasRestantes: 1,
              tentativasPermitidas: 1
            }
          ]}
          conteudos={[]}
          cursoIdSelecionado={CURSO_ID}
          cursos={[{ id: CURSO_ID, titulo: "Curso Teste" }]}
          matriculas={[{ id: MATRICULA_ID, cursoId: CURSO_ID, turmaId: TURMA_ID, status: "Aprovada" }]}
          moduloIdSelecionado={MODULO_ID}
          modulos={[{ id: MODULO_ID, cursoId: CURSO_ID, titulo: "Módulo 1", dataCriacao: "2026-01-01" }]}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
          onSessionExpired={vi.fn()}
          progressos={{ conteudos: [], modulos: [], cursos: [] }}
          turmas={[{ id: TURMA_ID, cursoId: CURSO_ID, nomeTurma: "Turma A" }]}
        />
      </ToastProvider>
    );
  }

  async function abrirEResponderQuiz(usuario) {
    await usuario.click(screen.getByRole("button", { name: "Iniciar quiz" }));
    await usuario.click(screen.getByRole("button", { name: "Iniciar" }));
    await screen.findByText("Pergunta de teste");
    await usuario.click(screen.getByText("Resposta A").closest("button"));
    await usuario.click(screen.getByRole("button", { name: /Confirmar|Enviar avaliacao/ }));
  }

  test("envia iniciadaEm junto com as respostas", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint.endsWith("/aluno/questoes")) {
        return Promise.resolve([QUESTAO]);
      }
      if (endpoint.endsWith("/aluno/respostas")) {
        return Promise.resolve({ id: 1, statusTentativa: 3 });
      }
      return Promise.resolve({});
    });

    renderComQuiz();
    await abrirEResponderQuiz(usuario);

    const chamadaEnvio = apiRequest.mock.calls.find(([endpoint]) => endpoint.endsWith("/aluno/respostas"));
    expect(chamadaEnvio).toBeDefined();
    const corpo = JSON.parse(chamadaEnvio[1].body);
    expect(typeof corpo.iniciadaEm).toBe("string");
  });

  test("AVALIACAO_ALTERADA: mostra o aviso, oferece 'Abrir de novo' e nao fecha a tela", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint.endsWith("/aluno/questoes")) {
        return Promise.resolve([QUESTAO]);
      }
      if (endpoint.endsWith("/aluno/respostas")) {
        return Promise.reject(new ApiError("O professor alterou as questoes.", 409, "AVALIACAO_ALTERADA"));
      }
      return Promise.resolve({});
    });

    renderComQuiz();
    await abrirEResponderQuiz(usuario);

    const dialog = screen.getByRole("dialog", { name: "Quiz do módulo" });
    expect(await within(dialog).findByText(/O professor alterou as questões desta avaliação/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Abrir de novo/ })).toBeInTheDocument();
    // a tela continua aberta, com a questao e a resposta ainda visiveis
    expect(within(dialog).getByText("Pergunta de teste")).toBeInTheDocument();
  });

  test("AVALIACAO_REMOVIDA: mostra o aviso sem 'Abrir de novo', e o rascunho local nao e apagado", async () => {
    const usuario = userEvent.setup();
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint.endsWith("/aluno/questoes")) {
        return Promise.resolve([QUESTAO]);
      }
      if (endpoint.endsWith("/aluno/respostas")) {
        return Promise.reject(new ApiError("O professor removeu esta avaliacao.", 404, "AVALIACAO_REMOVIDA"));
      }
      return Promise.resolve({});
    });

    renderComQuiz();
    await abrirEResponderQuiz(usuario);

    const dialog = screen.getByRole("dialog", { name: "Quiz do módulo" });
    expect(await within(dialog).findByText(/O professor removeu esta avaliação enquanto você respondia/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Abrir de novo/ })).not.toBeInTheDocument();

    const chaveRascunho = `edtech.rascunhoAvaliacao.1.${AVALIACAO_ID}`;
    const rascunho = JSON.parse(window.localStorage.getItem(chaveRascunho));
    expect(rascunho.respostas[QUESTAO.id].alternativaId).toBe(1);
  });
});
