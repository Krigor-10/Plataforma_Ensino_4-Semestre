import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, MiniList, PanelCard, StatusPill } from "../../components/Primitives.jsx";
import {
  describeCourse,
  formatDate,
  formatGrade,
  formatMoney,
  formatPercent,
  normalizeContentType,
  normalizeProgressStatus,
  normalizePublicationStatus,
  normalizeStatus,
  parseApiDate,
  progressStatusTone
} from "../../lib/format.js";

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function buildEnrollmentsByMonth(matriculas) {
  const datas = matriculas.map((matricula) => parseApiDate(matricula.dataSolicitacao)).filter(Boolean);
  const base = datas.length ? new Date(Math.max(...datas.map((data) => data.getTime()))) : new Date();

  return Array.from({ length: 6 }, (_, indice) => {
    const referencia = new Date(base.getFullYear(), base.getMonth() - (5 - indice), 1);
    const total = matriculas.filter((matricula) => {
      const data = parseApiDate(matricula.dataSolicitacao);
      return data && data.getFullYear() === referencia.getFullYear() && data.getMonth() === referencia.getMonth();
    }).length;

    return { mes: MESES_PT[referencia.getMonth()], total };
  });
}

function ChartTooltipStyle() {
  return {
    background: "var(--card-strong)",
    border: "1px solid var(--border-strong)",
    borderRadius: "8px",
    color: "var(--ink-strong)",
    fontSize: "0.82rem"
  };
}

export function ResumoWorkspace({
  avaliacoes = [],
  conteudos,
  cursos,
  ehGestor,
  ehProfessor,
  ehAluno,
  matriculas,
  pendencias,
  progressos = {},
  turmas,
  usuario
}) {
  const itensProfessor = conteudos.length
    ? [...conteudos]
        .sort((conteudoA, conteudoB) => {
          const dataConteudoA = new Date(conteudoA.atualizadoEm || conteudoA.criadoEm || 0).getTime();
          const dataConteudoB = new Date(conteudoB.atualizadoEm || conteudoB.criadoEm || 0).getTime();
          return dataConteudoB - dataConteudoA;
        })
        .slice(0, 4)
        .map((conteudo) => ({
          id: conteudo.id,
          title: conteudo.titulo,
          meta: `${conteudo.turmaNome || "Turma"} - ${conteudo.moduloTitulo || "Modulo"}`,
          badge: normalizePublicationStatus(conteudo.statusPublicacao)
        }))
    : turmas.slice(0, 4).map((turma) => ({
        id: turma.id,
        title: turma.nomeTurma,
        meta: `${formatDate(turma.dataCriacao)} - Curso #${turma.cursoId}`,
        badge: turma.professorId ? "Atribuida" : "Pendente"
      }));

  const itensAluno = conteudos.length
    ? [...conteudos]
        .sort((conteudoA, conteudoB) => {
          const dataConteudoA = new Date(conteudoA.publicadoEm || conteudoA.atualizadoEm || conteudoA.criadoEm || 0).getTime();
          const dataConteudoB = new Date(conteudoB.publicadoEm || conteudoB.atualizadoEm || conteudoB.criadoEm || 0).getTime();
          return dataConteudoB - dataConteudoA;
        })
        .slice(0, 4)
        .map((conteudo) => ({
          id: conteudo.id,
          title: conteudo.titulo,
          meta: `${conteudo.turmaNome || "Turma"} - ${conteudo.moduloTitulo || "Modulo"}`,
          badge: normalizeContentType(conteudo.tipoConteudo)
        }))
    : [];

  const itensPrincipais = ehGestor
    ? pendencias.slice(0, 4).map((pendencia) => ({
        id: pendencia.id,
        title: pendencia.nomeAluno,
        meta: `${pendencia.curso} - ${formatDate(pendencia.dataSolicitacao)}`,
        badge: pendencia.cpfMascarado || "Sem CPF"
      }))
    : ehProfessor
      ? itensProfessor
      : ehAluno && itensAluno.length
        ? itensAluno
      : matriculas.slice(0, 4).map((matricula) => ({
          id: matricula.id,
          title: matricula.curso,
          meta: `${matricula.turma} - ${formatDate(matricula.dataSolicitacao)}`,
          badge: matricula.status
        }));

  const mensagemVazia = ehGestor
    ? "Nenhuma pendencia aberta agora."
    : ehProfessor
      ? "Nenhum conteudo criado ainda."
      : "Voce ainda nao possui matriculas registradas.";

  const descricao = ehGestor
    ? "Fila que merece atencao imediata do time academico."
    : ehProfessor
      ? conteudos.length
        ? "Materiais mais recentes ligados ao seu workspace de professor."
        : "Turmas vinculadas ao seu usuario dentro do sistema."
      : ehAluno && itensAluno.length
        ? `Ultimos materiais liberados para a jornada de ${usuario.nome}.`
        : `Resumo rapido das solicitacoes enviadas por ${usuario.nome}.`;

  const titulo = ehGestor
    ? "Fila de analise"
    : ehProfessor
      ? conteudos.length
        ? "Publicacoes recentes"
        : "Turmas em destaque"
      : ehAluno && itensAluno.length
        ? "Conteudos recentes"
        : "Minha trilha recente";
  const progressosCursos = progressos.cursos || [];
  const progressoPorMatricula = new Map(progressosCursos.map((progresso) => [Number(progresso.matriculaId), progresso]));
  const avaliacoesPorCurso = avaliacoes.reduce((mapa, avaliacao) => {
    const cursoId = Number(avaliacao.cursoId);

    if (!cursoId || avaliacao.ultimaNota === null || typeof avaliacao.ultimaNota === "undefined") {
      return mapa;
    }

    const notasCurso = mapa.get(cursoId) || [];
    notasCurso.push(avaliacao);
    mapa.set(cursoId, notasCurso);
    return mapa;
  }, new Map());
  const desempenhoCursosAluno = ehAluno
    ? matriculas
        .filter((matricula) => normalizeStatus(matricula.status) === "Aprovada")
        .map((matricula) => {
          const cursoId = Number(matricula.cursoId);
          const progressoCurso =
            progressoPorMatricula.get(Number(matricula.id)) ||
            progressosCursos.find((progresso) => Number(progresso.cursoId) === cursoId);
          const avaliacoesDoCurso = avaliacoesPorCurso.get(cursoId) || [];
          const notasAvaliacoes = avaliacoesDoCurso.map((avaliacao) => Number(avaliacao.ultimaNota || 0));
          const mediaAvaliacoes = notasAvaliacoes.length
            ? notasAvaliacoes.reduce((total, nota) => total + nota, 0) / notasAvaliacoes.length
            : null;
          const progressoPercentual = Number(progressoCurso?.percentualConclusao || 0);
          const statusProgresso =
            progressoCurso?.statusProgresso || (progressoPercentual >= 100 ? 3 : progressoPercentual > 0 ? 2 : 1);

          return {
            id: matricula.id,
            curso: matricula.curso,
            turma: matricula.turma,
            progresso: progressoPercentual,
            statusProgresso,
            notaFinal: matricula.notaFinal,
            mediaAvaliacoes,
            totalAvaliacoes: notasAvaliacoes.length
          };
        })
    : [];

  return (
    <section className={`panel-grid${ehGestor ? "" : " panel-grid--stacked"}`}>
      <PanelCard description={descricao} title={titulo}>
        <MiniList emptyMessage={mensagemVazia} items={itensPrincipais} />
      </PanelCard>

      {ehAluno ? (
        <PanelCard description="Notas e progresso consolidados nas matriculas aprovadas." title="Desempenho por curso">
          {desempenhoCursosAluno.length ? (
            <div className="student-performance-list">
              {desempenhoCursosAluno.map((item) => (
                <article className="student-performance-card" key={item.id}>
                  <header className="student-performance-card__header">
                    <div>
                      <strong>{item.curso}</strong>
                      <p>{item.turma}</p>
                    </div>
                    <StatusPill tone={progressStatusTone(item.statusProgresso)}>
                      {normalizeProgressStatus(item.statusProgresso)}
                    </StatusPill>
                  </header>

                  <div className="student-performance-card__metrics">
                    <span>
                      <small>Progresso</small>
                      <strong>{formatPercent(item.progresso)}</strong>
                    </span>
                    <span>
                      <small>Nota atual</small>
                      <strong>{formatGrade(item.notaFinal)}</strong>
                    </span>
                    <span>
                      <small>Avaliacoes</small>
                      <strong>{item.mediaAvaliacoes === null ? "-" : formatGrade(item.mediaAvaliacoes)}</strong>
                    </span>
                  </div>

                  <div className="student-progress-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(0, Math.min(item.progresso, 100))}%` }} />
                  </div>
                  <p className="student-performance-card__footer">
                    {item.totalAvaliacoes
                      ? `${item.totalAvaliacoes} avaliacao${item.totalAvaliacoes === 1 ? "" : "es"} com nota registrada`
                      : "Sem avaliacao corrigida neste curso"}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="Quando uma matricula for aprovada, o desempenho por curso aparecera aqui." />
          )}
        </PanelCard>
      ) : null}

      {ehGestor ? (
        <PanelCard description="Os mesmos cursos alimentam a area publica e o painel autenticado." title="Catalogo visivel no React">
          <div className="course-grid course-grid--compact">
            {cursos.slice(0, 3).map((curso) => (
              <article className="course-card course-card--compact" key={curso.id}>
                <span className="chip">Curso</span>
                <h3>{curso.titulo}</h3>
                <p>{describeCourse(curso)}</p>
                <strong>{formatMoney(curso.preco)}</strong>
              </article>
            ))}
          </div>
        </PanelCard>
      ) : null}

      {ehGestor ? (
        <PanelCard description="Volume de solicitacoes de matricula nos ultimos 6 meses." title="Matriculas por mes">
          <EnrollmentsChart matriculas={matriculas} />
        </PanelCard>
      ) : null}

      {ehAluno && desempenhoCursosAluno.length ? (
        <PanelCard description="Percentual de conclusao das suas matriculas aprovadas." title="Progresso por curso">
          <StudentProgressChart itens={desempenhoCursosAluno} />
        </PanelCard>
      ) : null}
    </section>
  );
}

function EnrollmentsChart({ matriculas }) {
  const dados = buildEnrollmentsByMonth(matriculas);
  const maxTotal = Math.max(...dados.map((item) => item.total), 1);

  if (!matriculas.length) {
    return <EmptyState message="Ainda nao ha matriculas registradas para montar o grafico." />;
  }

  return (
    <ResponsiveContainer height={220} width="100%">
      <BarChart barCategoryGap="30%" data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis axisLine={false} dataKey="mes" tick={{ fill: "var(--ink-soft)", fontSize: 12 }} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--ink-soft)", fontSize: 11 }} tickLine={false} width={32} />
        <Tooltip cursor={{ fill: "rgba(123,47,247,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [valor, "Matriculas"]} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {dados.map((item, indice) => (
            <Cell fill={item.total === maxTotal ? "var(--brand)" : "var(--brand-mint)"} key={indice} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StudentProgressChart({ itens }) {
  const dados = itens.map((item) => ({
    curso: item.curso.length > 18 ? `${item.curso.slice(0, 16)}...` : item.curso,
    progresso: Math.max(0, Math.min(item.progresso, 100))
  }));

  return (
    <ResponsiveContainer height={Math.max(160, dados.length * 46)} width="100%">
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <XAxis axisLine={false} domain={[0, 100]} tick={{ fill: "var(--ink-soft)", fontSize: 11 }} tickLine={false} type="number" />
        <YAxis axisLine={false} dataKey="curso" tick={{ fill: "var(--ink-soft)", fontSize: 12 }} tickLine={false} type="category" width={140} />
        <Tooltip cursor={{ fill: "rgba(123,47,247,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [`${valor}%`, "Progresso"]} />
        <Bar dataKey="progresso" fill="var(--brand)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
