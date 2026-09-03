import { useEffect, useMemo, useState } from "react";
import { InlineMessage, PanelCard } from "../components/Primitives.jsx";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import LayoutWorkspace from "./workspace/LayoutWorkspace.jsx";
import { SecaoAlunos } from "./workspace/SecaoAlunos.jsx";
import { SecaoAvaliacoesProfessor } from "./workspace/SecaoAvaliacoesProfessor.jsx";
import { SecaoConteudosProfessor } from "./workspace/SecaoConteudosProfessor.jsx";
import { SecaoCoordenadores } from "./workspace/SecaoCoordenadores.jsx";
import { SecaoCursos } from "./workspace/SecaoCursos.jsx";
import { SecaoDesempenhoCoordenador } from "./workspace/SecaoDesempenhoCoordenador.jsx";
import { SecaoModulos } from "./workspace/SecaoModulos.jsx";
import { SecaoAvaliacoesAluno, SecaoConteudosAluno, SecaoCursosAluno } from "./workspace/SecoesAluno.jsx";
import { SecaoMatriculas, SecaoMeusCursosMatriculados } from "./workspace/SecaoMatriculas.jsx";
import { SecaoProfessores } from "./workspace/SecaoProfessores.jsx";
import { SecaoTurmas } from "./workspace/SecaoTurmas.jsx";
import { SecaoTurmasProfessor } from "./workspace/SecaoTurmasProfessor.jsx";
import { ModalPerfilWorkspace } from "./workspace/ModalPerfilWorkspace.jsx";
import { DashboardAdmin } from "./workspace/DashboardAdmin.jsx";
import { DashboardAluno } from "./workspace/DashboardAluno.jsx";
import { DashboardCoordenador } from "./workspace/DashboardCoordenador.jsx";
import { DashboardProfessor } from "./workspace/DashboardProfessor.jsx";
import { SecaoCertificados } from "./workspace/SecaoCertificados.jsx";
import { APP_SECTIONS, getSectionMeta, MANAGER_ROLES, EMPTY_SNAPSHOT } from "../data/appConfig.js";
import { hasSnapshotData, loadWorkspaceSnapshot, mapById } from "../lib/dashboard.js";
import { ApiError } from "../lib/api.js";
import { formatDate, formatGrade, maskCpf, normalizeStatus, timestampFromApiDate } from "../lib/format.js";
import { normalizePath } from "../lib/router.js";

export default function WorkspaceScreen({
  canDisableDemoMode,
  isDemoMode,
  onDemoModeExit,
  route,
  usuario,
  onNavigate,
  onLogout,
  onSessionExpired,
  onUsuarioAtualizado
}) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [confirmacaoSessao, setConfirmacaoSessao] = useState(null);
  const [cursoEmFocoPorSecao, setCursoEmFocoPorSecao] = useState({
    modulos: null,
    turmas: null
  });

  const role = usuario.tipoUsuario || "";
  const isManager = MANAGER_ROLES.has(role);
  const isProfessor = role === "Professor";
  const isStudent = role === "Aluno";

  const sections = useMemo(
    () =>
      APP_SECTIONS.filter((section) => section.roles.includes(role)).map((section) => {
        if (section.key === "matriculas" && role === "Aluno") {
          return { ...section, label: "Catalogo de Cursos" };
        }

        if (section.key === "turmas" && (role === "Professor" || role === "Coordenador")) {
          return { ...section, label: "Progresso" };
        }

        return section;
      }),
    [role]
  );
  const navSections = useMemo(
    () => sections.filter((section) => section.showInSidebar !== false && !(isStudent && section.key === "matriculas")),
    [isStudent, sections]
  );

  const activeSection = sections.some((section) => section.key === route.section)
    ? route.section
    : "dashboard";
  const isDashboard = activeSection === "dashboard";
  const showOverviewCards =
    !isDashboard &&
    (isManager
      ? false
      : !isProfessor && activeSection !== "conteudos" && !(isStudent && ["avaliacoes", "matriculas", "meus-cursos", "cursos-matriculados", "certificados"].includes(activeSection)));
  // Secoes que sempre renderizam seu proprio cabecalho.cabecalho-pagina (titulo +
  // subtitulo) — mostrar o hero generico ali so duplicaria o titulo da pagina.
  const SECOES_COM_CABECALHO_PROPRIO = [
    "cursos",
    "modulos",
    "turmas",
    "alunos",
    "professores",
    "coordenadores",
    "matriculas",
    "cursos-matriculados"
  ];
  const ocultarHeroGenerico =
    (isStudent && (activeSection === "conteudos" || activeSection === "avaliacoes") && Boolean(route.param)) ||
    (isProfessor && (activeSection === "conteudos" || activeSection === "avaliacoes") && Boolean(route.param)) ||
    SECOES_COM_CABECALHO_PROPRIO.includes(activeSection);

  useEffect(() => {
    const canonicalPath =
      activeSection === "dashboard" ? "/app" : `/app/${activeSection}${route.param ? `/${route.param}` : ""}`;
    const currentPath = window.location.pathname || "/app";

    if (normalizePath(currentPath) !== canonicalPath) {
      onNavigate(canonicalPath, { replace: true });
    }
  }, [activeSection, onNavigate, route.param]);

  useEffect(() => {
    if (!confirmacaoSessao) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setConfirmacaoSessao(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmacaoSessao]);

  useEffect(() => {
    let ignore = false;

    async function loadWorkspace() {
      try {
        setStatus("loading");
        setError("");

        const nextSnapshot = await loadWorkspaceSnapshot(usuario);

        if (ignore) {
          return;
        }

        setSnapshot(nextSnapshot);
        setStatus("ready");
      } catch (err) {
        if (ignore) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired();
          return;
        }

        setStatus("error");
        setError(err.message || "Nao foi possivel carregar o painel agora.");
      }
    }

    loadWorkspace();

    return () => {
      ignore = true;
    };
  }, [onSessionExpired, refreshKey, role, usuario]);

  const cursoById = useMemo(() => mapById(snapshot.cursos), [snapshot.cursos]);
  const alunoById = useMemo(() => mapById(snapshot.alunos), [snapshot.alunos]);
  const professorById = useMemo(() => mapById(snapshot.professores), [snapshot.professores]);
  const turmaById = useMemo(() => mapById(snapshot.turmas), [snapshot.turmas]);

  const professorTurmas = useMemo(
    () => snapshot.turmas.filter((turma) => turma.professorId === usuario.id),
    [snapshot.turmas, usuario.id]
  );

  const professorCursos = useMemo(() => {
    const ids = new Set(professorTurmas.map((turma) => turma.cursoId));
    return snapshot.cursos.filter((curso) => ids.has(curso.id));
  }, [professorTurmas, snapshot.cursos]);

  const coordenadorCursos = useMemo(() => {
    if (role !== "Coordenador") {
      return snapshot.cursos;
    }

    return snapshot.cursos.filter((curso) => curso.coordenadorId === usuario.id && cursoEstaAtivo(curso));
  }, [role, snapshot.cursos, usuario.id]);

  const visibleCursos = isProfessor ? professorCursos : snapshot.cursos;
  const cursosDaSecaoCursos = role === "Coordenador" ? coordenadorCursos : visibleCursos;

  const coordenadorTurmas = useMemo(() => {
    if (role !== "Coordenador") {
      return snapshot.turmas;
    }

    const idsCursosCoordenador = new Set(coordenadorCursos.map((curso) => curso.id));
    return snapshot.turmas.filter((turma) => idsCursosCoordenador.has(turma.cursoId));
  }, [coordenadorCursos, role, snapshot.turmas]);

  const visibleTurmas = isProfessor ? professorTurmas : role === "Coordenador" ? coordenadorTurmas : snapshot.turmas;

  const cursoByIdParaTurmas = useMemo(
    () => (role === "Coordenador" ? mapById(coordenadorCursos) : cursoById),
    [coordenadorCursos, cursoById, role]
  );

  const modulosDaSecaoModulos = useMemo(() => {
    if (role !== "Coordenador" && !isProfessor) {
      return snapshot.modulos;
    }

    const idsCursosAcademicos = new Set(cursosDaSecaoCursos.map((curso) => curso.id));
    return snapshot.modulos.filter((modulo) => idsCursosAcademicos.has(modulo.cursoId));
  }, [cursosDaSecaoCursos, isProfessor, role, snapshot.modulos]);

  const pagamentoPorMatriculaId = useMemo(() => mapById(snapshot.pagamentos.map((pagamento) => ({ ...pagamento, id: pagamento.matriculaId }))), [snapshot.pagamentos]);

  // Curso pago com pagamento pendente nao conta como "ativo"/"liberado" em
  // nenhuma tela do aluno (Dashboard, Progresso, Conteudos) — so a matricula
  // aprovada nao basta. StatusPagamento.Pendente = 1.
  const matriculaIdsComPagamentoPendente = useMemo(
    () => new Set(snapshot.pagamentos.filter((pagamento) => Number(pagamento.status) === 1).map((pagamento) => pagamento.matriculaId)),
    [snapshot.pagamentos]
  );
  const progressoCursoPorMatriculaId = useMemo(
    () => mapById((snapshot.progressos.cursos || []).map((progresso) => ({ ...progresso, id: progresso.matriculaId }))),
    [snapshot.progressos.cursos]
  );

  const matriculaRows = useMemo(
    () =>
      snapshot.matriculas.map((matricula) => {
        const pagamento = pagamentoPorMatriculaId.get(matricula.id);
        const progresso = progressoCursoPorMatriculaId.get(matricula.id);

        return {
          id: matricula.id,
          codigoRegistro: matricula.codigoRegistro,
          alunoId: matricula.alunoId,
          cursoId: matricula.cursoId,
          turmaId: matricula.turmaId,
          aluno: matricula.aluno?.nome || alunoById.get(matricula.alunoId)?.nome || `Aluno #${matricula.alunoId}`,
          curso: matricula.curso?.titulo || cursoById.get(matricula.cursoId)?.titulo || `Curso #${matricula.cursoId}`,
          turma:
            matricula.turma?.nomeTurma ||
            turmaById.get(matricula.turmaId)?.nomeTurma ||
            "Aguardando turma",
          professor:
            turmaById.get(matricula.turmaId)?.professorNome ||
            professorById.get(turmaById.get(matricula.turmaId)?.professorId)?.nome ||
            null,
          notaFinal: matricula.notaFinal ?? 0,
          status: normalizeStatus(matricula.status),
          dataSolicitacao: matricula.dataSolicitacao,
          pagamentoStatus: pagamento?.status ?? null,
          pagamentoValor: pagamento?.valor ?? null,
          progresso: progresso?.percentualConclusao ?? 0
        };
      }),
    [alunoById, cursoById, pagamentoPorMatriculaId, professorById, progressoCursoPorMatriculaId, snapshot.matriculas, turmaById]
  );

  const pendingRows = useMemo(
    () =>
      snapshot.pendentes.map((pendencia) => ({
        id: pendencia.id,
        nomeAluno: pendencia.nomeAluno,
        curso: cursoById.get(pendencia.cursoId)?.titulo || `Curso #${pendencia.cursoId}`,
        cpfMascarado: pendencia.cpfMascarado,
        nomeTurma: pendencia.nomeTurma || "Aguardando turma",
        dataSolicitacao: pendencia.dataSolicitacao
      })),
    [cursoById, snapshot.pendentes]
  );

  const studentApprovedCourseCount = useMemo(
    () =>
      new Set(
        snapshot.matriculas
          .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
          .map((matricula) => matricula.cursoId)
      ).size,
    [snapshot.matriculas]
  );

  const approvedStudentRows = useMemo(
    () => matriculaRows.filter((item) => item.status === "Aprovada"),
    [matriculaRows]
  );

  const pendingStudentRows = useMemo(
    () => matriculaRows.filter((item) => item.status === "Pendente"),
    [matriculaRows]
  );

  const latestStudentRequest = useMemo(() => {
    const latest = [...snapshot.matriculas].sort(
      (left, right) => timestampFromApiDate(right.dataSolicitacao) - timestampFromApiDate(left.dataSolicitacao)
    )[0];

    return latest?.dataSolicitacao || null;
  }, [snapshot.matriculas]);

  const latestVisibleContent = useMemo(() => {
    const latest = [...snapshot.conteudos]
      .map((conteudo) => conteudo.publicadoEm || conteudo.atualizadoEm || conteudo.criadoEm || null)
      .filter(Boolean)
      .sort((left, right) => timestampFromApiDate(right) - timestampFromApiDate(left))[0];

    return latest || null;
  }, [snapshot.conteudos]);

  const overviewCards = useMemo(() => {
    if (isManager) {
      return [
        { label: "Cursos no ar", value: snapshot.cursos.length, detail: "catalogo principal" },
        { label: "Modulos", value: snapshot.modulos.length, detail: "estrutura academica" },
        { label: "Alunos", value: snapshot.alunos.length, detail: "cadastros ativos" },
        { label: "Matriculas", value: snapshot.matriculas.length, detail: "solicitacoes registradas" },
        { label: "Pendentes", value: snapshot.pendentes.length, detail: "pedidos em analise" }
      ];
    }

    if (isProfessor) {
      return [];
    }

    const approvedCount = matriculaRows.filter((item) => item.status === "Aprovada").length;
    const pendingCount = matriculaRows.filter((item) => item.status === "Pendente").length;
    const contentModuleCount = new Set(snapshot.conteudos.map((item) => item.moduloId)).size;

    return [
      { label: "Meus cursos", value: studentApprovedCourseCount, detail: "jornada ativa no momento" },
      { label: "Minhas matriculas", value: snapshot.matriculas.length, detail: "solicitacoes enviadas" },
      { label: "Avaliacoes", value: snapshot.avaliacoes.length, detail: "publicadas para suas turmas" },
      {
        label: "Conteudos liberados",
        value: snapshot.conteudos.length,
        detail: contentModuleCount ? `${contentModuleCount} modulos com material` : "aguardando novas publicacoes"
      },
      { label: "Aprovadas", value: approvedCount, detail: "prontas para acompanhamento" },
      { label: "Pendentes", value: pendingCount, detail: "aguardando validacao" }
    ];
  }, [
    isManager,
    isProfessor,
    matriculaRows,
    professorCursos.length,
    professorTurmas.length,
    snapshot.alunos.length,
    snapshot.avaliacoes.length,
    snapshot.conteudos,
    snapshot.modulos.length,
    snapshot.matriculas.length,
    snapshot.pendentes.length,
    studentApprovedCourseCount
  ]);

  const sectionMeta = getSectionMeta(activeSection, role);
  const hasData = hasSnapshotData(snapshot);
  const userInitials = useMemo(() => {
    const parts = String(usuario.nome || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "US";
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [usuario.nome]);

  const profileFacts = useMemo(() => {
    const baseFacts = [
      { label: "Nome completo", value: usuario.nome || "-" },
      { label: "E-mail", value: usuario.email || "-" },
      { label: "CPF", value: maskCpf(usuario.cpf || "") },
      { label: "Perfil", value: role || "-" }
    ];

    if (isStudent) {
      return [
        ...baseFacts,
        { label: "Ultima solicitacao", value: formatDate(latestStudentRequest) },
        { label: "Ultima liberacao", value: formatDate(latestVisibleContent) }
      ];
    }

    if (isProfessor) {
      return [
        ...baseFacts,
        { label: "Turmas vinculadas", value: `${professorTurmas.length}` },
        { label: "Cursos em foco", value: `${professorCursos.length}` }
      ];
    }

    return [
      ...baseFacts,
      { label: "Cursos no catalogo", value: `${snapshot.cursos.length}` },
      { label: "Pendencias abertas", value: `${snapshot.pendentes.length}` }
    ];
  }, [
    isProfessor,
    isStudent,
    latestStudentRequest,
    latestVisibleContent,
    professorCursos.length,
    professorTurmas.length,
    role,
    snapshot.cursos.length,
    snapshot.pendentes.length,
    usuario.cpf,
    usuario.email,
    usuario.nome
  ]);

  const profileHighlights = useMemo(() => {
    if (isStudent) {
      return [
        `${studentApprovedCourseCount} curso(s) ativo(s)`,
        `${approvedStudentRows.length} matricula(s) aprovada(s)`,
        `${pendingStudentRows.length} solicitacao(oes) pendente(s)`,
        `${snapshot.conteudos.length} material(is) liberado(s)`
      ];
    }

    if (isProfessor) {
      return [
        `${professorTurmas.length} turma(s) vinculada(s)`,
        `${professorCursos.length} curso(s) acompanhados`,
        `${snapshot.conteudos.length} conteudo(s) no workspace`,
        `${snapshot.avaliacoes.length} avaliacao(oes) planejada(s)`
      ];
    }

    return [
      `${snapshot.cursos.length} curso(s) no catalogo`,
      `${snapshot.alunos.length} aluno(s) ativos`,
      `${snapshot.pendentes.length} pedido(s) em analise`
    ];
  }, [
    approvedStudentRows.length,
    isProfessor,
    isStudent,
    pendingStudentRows.length,
    professorCursos.length,
    professorTurmas.length,
    snapshot.alunos.length,
    snapshot.avaliacoes.length,
    snapshot.conteudos.length,
    snapshot.cursos.length,
    snapshot.pendentes.length,
    studentApprovedCourseCount
  ]);

  const profileCourseItems = useMemo(
    () =>
      approvedStudentRows.map((item) => ({
        id: item.id,
        title: item.curso,
        meta: `${item.turma} - solicitada em ${formatDate(item.dataSolicitacao)}`,
        badge: item.notaFinal > 0 ? `Nota ${formatGrade(item.notaFinal)}` : "Ativa"
      })),
    [approvedStudentRows]
  );

  // Mantem a navegacao contextual entre Curso -> Modulos/Turmas sem precisar expandir o roteador agora.
  function abrirSecaoRelacionadaAoCurso(section, curso) {
    setCursoEmFocoPorSecao((atual) => ({
      ...atual,
      [section]: {
        cursoId: Number(curso.id),
        titulo: curso.titulo || `Curso #${curso.id}`
      }
    }));
    onNavigate(`/app/${section}`);
  }

  function limparCursoEmFoco(section) {
    setCursoEmFocoPorSecao((atual) => {
      if (!atual[section]) {
        return atual;
      }

      return {
        ...atual,
        [section]: null
      };
    });
  }

  function solicitarSaida(tipo) {
    setConfirmacaoSessao(
      tipo === "demo"
        ? {
            title: "Sair do modo demo?",
            description: "A sessao demo sera encerrada e voce volta para o login.",
            confirmLabel: "Sair do demo",
            onConfirm: () => onDemoModeExit("/login")
          }
        : {
            title: "Encerrar sessao?",
            description: "Voce sera desconectado e voltara para a home publica.",
            confirmLabel: "Sair",
            onConfirm: () => onLogout("/")
          }
    );
  }

  function confirmarSaida() {
    const acao = confirmacaoSessao?.onConfirm;
    setConfirmacaoSessao(null);
    acao?.();
  }

  return (
    <div className="workspace-app">
      {confirmacaoSessao ? (
        <ConfirmacaoSessaoModal
          confirmLabel={confirmacaoSessao.confirmLabel}
          description={confirmacaoSessao.description}
          onCancel={() => setConfirmacaoSessao(null)}
          onConfirm={confirmarSaida}
          title={confirmacaoSessao.title}
        />
      ) : null}

      {isProfileOpen ? (
        <ModalPerfilWorkspace
          itensCursos={profileCourseItems}
          fatos={profileFacts}
          destaques={profileHighlights}
          ehAluno={isStudent}
          aoFechar={() => setIsProfileOpen(false)}
          perfil={role}
          iniciaisUsuario={userInitials}
          nomeUsuario={usuario.nome}
          usuario={usuario}
          onSessionExpired={onSessionExpired}
          onUsuarioAtualizado={onUsuarioAtualizado}
        />
      ) : null}

      <LayoutWorkspace
        usuario={usuario}
        secaoAtual={activeSection}
        sections={navSections}
        cursos={snapshot.cursos}
        modulos={snapshot.modulos}
        contadorMatriculasPendentes={isManager ? snapshot.pendentes.length : 0}
        onNavigate={onNavigate}
        onAbrirPerfil={() => setIsProfileOpen(true)}
        onLogoutClick={() => solicitarSaida(isDemoMode && canDisableDemoMode ? "demo" : "sessao")}
      >
        {!isDashboard && !ocultarHeroGenerico ? (
          <header className="workspace-hero">
            <div className="workspace-hero__meta">
              <h1>{sectionMeta.title}</h1>
              <p>{sectionMeta.description}</p>
            </div>
          </header>
        ) : null}

        {status === "loading" && !hasData ? (
          <PanelCard description="Buscando informacoes da API para montar o painel." title="Carregando workspace" />
        ) : null}

        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

        {status !== "loading" || hasData ? (
          <>
            {showOverviewCards ? (
              <section className="metric-grid">
                {overviewCards.map((card) => (
                  <article className="metric-card" key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.detail}</small>
                  </article>
                ))}
              </section>
            ) : null}

            {activeSection === "dashboard" ? (
              isProfessor ? (
                <DashboardProfessor
                  avaliacoes={snapshot.avaliacoes}
                  cursos={professorCursos}
                  onMudarSecao={(secao) => onNavigate(`/app/${secao}`)}
                  turmas={professorTurmas}
                  usuario={usuario}
                />
              ) : role === "Admin" ? (
                <DashboardAdmin
                  alunos={snapshot.alunos}
                  coordenadores={snapshot.coordenadores}
                  matriculas={matriculaRows}
                  onMudarSecao={(secao) => onNavigate(`/app/${secao}`)}
                  pendencias={pendingRows}
                  professores={snapshot.professores}
                  usuario={usuario}
                />
              ) : role === "Coordenador" ? (
                <DashboardCoordenador
                  cursos={coordenadorCursos}
                  matriculas={matriculaRows}
                  onMudarSecao={(secao) => onNavigate(`/app/${secao}`)}
                  professores={snapshot.professores}
                  turmas={coordenadorTurmas}
                  usuario={usuario}
                />
              ) : (
                <DashboardAluno
                  avaliacoes={snapshot.avaliacoes}
                  conteudos={snapshot.conteudos}
                  matriculas={matriculaRows}
                  modulos={snapshot.modulos}
                  onMudarSecao={(secao) => onNavigate(`/app/${secao}`)}
                  progressos={snapshot.progressos}
                  usuario={usuario}
                />
              )
            ) : null}

            {activeSection === "meus-cursos" ? (
              <SecaoCursosAluno
                avaliacoes={snapshot.avaliacoes}
                conteudos={snapshot.conteudos}
                cursos={snapshot.cursos}
                matriculaIdsComPagamentoPendente={matriculaIdsComPagamentoPendente}
                matriculas={snapshot.matriculas}
                modulos={snapshot.modulos}
                onNavigate={onNavigate}
                progressos={snapshot.progressos}
                turmas={snapshot.turmas}
              />
            ) : null}

            {activeSection === "alunos" ? (
              <SecaoAlunos alunos={snapshot.alunos} cursos={snapshot.cursos} matriculas={snapshot.matriculas} />
            ) : null}

            {activeSection === "professores" ? (
              <SecaoProfessores
                cursos={snapshot.cursos}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
                professores={snapshot.professores}
                turmas={snapshot.turmas}
              />
            ) : null}

            {activeSection === "coordenadores" ? (
              <SecaoCoordenadores
                coordenadores={snapshot.coordenadores}
                cursos={snapshot.cursos}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
              />
            ) : null}

            {activeSection === "cursos" ? (
              <SecaoCursos
                coordenadores={snapshot.coordenadores}
                cursos={cursosDaSecaoCursos}
                ehAdmin={role === "Admin"}
                ehCoordenador={role === "Coordenador"}
                ehProfessor={role === "Professor"}
                matriculas={snapshot.matriculas}
                modulos={snapshot.modulos}
                onAbrirSecaoCurso={abrirSecaoRelacionadaAoCurso}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
                professores={snapshot.professores}
                turmas={snapshot.turmas}
              />
            ) : null}

            {activeSection === "modulos" ? (
              <SecaoModulos
                alunos={snapshot.alunos}
                cursos={cursosDaSecaoCursos}
                cursoEmFoco={cursoEmFocoPorSecao.modulos}
                ehAdmin={role === "Admin"}
                ehCoordenador={role === "Coordenador"}
                matriculas={snapshot.matriculas}
                modulos={modulosDaSecaoModulos}
                onCursoEmFocoAplicado={() => limparCursoEmFoco("modulos")}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
                professores={snapshot.professores}
                turmas={snapshot.turmas}
              />
            ) : null}

            {activeSection === "conteudos" ? (
              isProfessor ? (
                <SecaoConteudosProfessor
                  avaliacoes={snapshot.avaliacoes}
                  conteudos={snapshot.conteudos}
                  cursoIdSelecionado={route.param ? Number(route.param) : null}
                  cursos={snapshot.cursos}
                  modulos={snapshot.modulos}
                  onNavigate={onNavigate}
                  onRefresh={() => setRefreshKey((current) => current + 1)}
                  onSessionExpired={onSessionExpired}
                  turmas={snapshot.turmas}
                  usuario={usuario}
                />
              ) : (
                <SecaoConteudosAluno
                  avaliacoes={snapshot.avaliacoes}
                  conteudos={snapshot.conteudos}
                  cursoIdSelecionado={route.param ? Number(route.param) : null}
                  cursos={snapshot.cursos}
                  matriculaIdsComPagamentoPendente={matriculaIdsComPagamentoPendente}
                  matriculas={snapshot.matriculas}
                  modulos={snapshot.modulos}
                  onNavigate={onNavigate}
                  onRefresh={() => setRefreshKey((current) => current + 1)}
                  onSessionExpired={onSessionExpired}
                  progressos={snapshot.progressos}
                  turmas={snapshot.turmas}
                />
              )
            ) : null}

            {activeSection === "avaliacoes" ? (
              isProfessor ? (
                <SecaoAvaliacoesProfessor
                  avaliacoes={snapshot.avaliacoes}
                  conteudos={snapshot.conteudos}
                  cursoIdSelecionado={route.param ? Number(route.param) : null}
                  cursos={snapshot.cursos}
                  modulos={snapshot.modulos}
                  onNavigate={onNavigate}
                  onRefresh={() => setRefreshKey((current) => current + 1)}
                  onSessionExpired={onSessionExpired}
                  turmas={snapshot.turmas}
                  usuario={usuario}
                />
              ) : isStudent ? (
                <SecaoAvaliacoesAluno
                  avaliacoes={snapshot.avaliacoes}
                  cursoIdSelecionado={route.param ? Number(route.param) : null}
                  cursos={snapshot.cursos}
                  onNavigate={onNavigate}
                  onRefresh={() => setRefreshKey((current) => current + 1)}
                  onSessionExpired={onSessionExpired}
                />
              ) : null
            ) : null}

            {activeSection === "matriculas" ? (
              <SecaoMatriculas
                cursos={snapshot.cursos}
                ehAluno={isStudent}
                linhasMatriculas={matriculaRows}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
                turmas={snapshot.turmas}
                usuario={usuario}
              />
            ) : null}

            {activeSection === "cursos-matriculados" ? (
              <SecaoMeusCursosMatriculados
                cursos={snapshot.cursos}
                linhasMatriculas={matriculaRows}
                onRefresh={() => setRefreshKey((current) => current + 1)}
                onSessionExpired={onSessionExpired}
              />
            ) : null}

            {activeSection === "certificados" ? (
              <SecaoCertificados
                avaliacoes={snapshot.avaliacoes}
                matriculaRows={matriculaRows}
                onSessionExpired={onSessionExpired}
                progressos={snapshot.progressos}
                usuario={usuario}
              />
            ) : null}

            {activeSection === "turmas" ? (
              isProfessor ? (
                <SecaoTurmasProfessor cursoPorId={cursoByIdParaTurmas} onSessionExpired={onSessionExpired} />
              ) : role === "Coordenador" ? (
                <SecaoDesempenhoCoordenador
                  cursoEmFoco={cursoEmFocoPorSecao.turmas}
                  cursoPorId={cursoByIdParaTurmas}
                  onCursoEmFocoAplicado={() => limparCursoEmFoco("turmas")}
                  onSessionExpired={onSessionExpired}
                />
              ) : (
                <SecaoTurmas
                  alunos={snapshot.alunos}
                  cursoPorId={cursoByIdParaTurmas}
                  cursoEmFoco={cursoEmFocoPorSecao.turmas}
                  ehGestor={isManager}
                  matriculas={snapshot.matriculas}
                  onCursoEmFocoAplicado={() => limparCursoEmFoco("turmas")}
                  onRefresh={() => setRefreshKey((current) => current + 1)}
                  onSessionExpired={onSessionExpired}
                  professores={snapshot.professores}
                  professorPorId={professorById}
                  turmas={visibleTurmas}
                />
              )
            ) : null}
          </>
        ) : null}
      </LayoutWorkspace>
    </div>
  );
}

function ConfirmacaoSessaoModal({ confirmLabel, description, onCancel, onConfirm, title }) {
  const refCartaoModal = useFocusTrap();

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onCancel]);

  return (
    <div
      className="content-form-modal session-confirmation-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        ref={refCartaoModal}
        aria-label={title}
        aria-modal="true"
        className="content-form-modal__card content-form-modal__card--compact"
        role="dialog"
      >
        <PanelCard description={description} title={title}>
          <div className="session-confirmation-modal__actions">
            <button className="button button--secondary" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="button button--danger" onClick={onConfirm} type="button">
              {confirmLabel}
            </button>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function cursoEstaAtivo(curso) {
  if (typeof curso.ativo === "boolean") {
    return curso.ativo;
  }

  const status = String(curso.statusCurso ?? curso.status ?? "").trim().toLowerCase();
  if (!status) {
    return true;
  }

  return !["inativo", "inativa", "arquivado", "arquivada", "cancelado", "cancelada"].includes(status);
}
