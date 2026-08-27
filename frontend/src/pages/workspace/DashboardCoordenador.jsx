/* ============================================================
   DASHBOARD COORDENADOR — Painel inicial do coordenador (Etapa 2)
   Replica TelaDashboardCoordenador do protótipo. O grafico do
   protótipo mostrava "progresso medio por curso", mas o snapshot
   de Admin/Coordenador nao carrega dados de progresso (ver
   lib/dashboard.js) — por isso o grafico aqui usa "alunos
   aprovados por curso", metrica que existe de fato nos dados
   ja carregados (matriculas).
   ============================================================ */
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MdChevronRight, MdGroups, MdMenuBook, MdSchool } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import { EmptyState } from "../../components/Primitives.jsx";

function ChartTooltipStyle() {
  return {
    background: "var(--cor-cartao)",
    border: "1px solid var(--cor-borda)",
    borderRadius: "8px",
    color: "var(--cor-texto-forte)",
    fontSize: "0.82rem"
  };
}

export function DashboardCoordenador({ cursos = [], matriculas = [], onMudarSecao, professores = [], turmas = [], usuario }) {
  const professorPorId = new Map(professores.map((professor) => [Number(professor.id), professor]));
  const meusCursos = cursos.filter((curso) => Number(curso.coordenadorId) === Number(usuario.id));
  const idsMeusCursos = new Set(meusCursos.map((curso) => Number(curso.id)));
  const turmasVinculadas = turmas.filter((turma) => idsMeusCursos.has(Number(turma.cursoId)));
  const turmasDosMeusCursos = turmasVinculadas.slice(0, 4);

  const totalAlunosMatriculados = new Set(
    matriculas
      .filter((matricula) => idsMeusCursos.has(Number(matricula.cursoId)) && matricula.status === "Aprovada")
      .map((matricula) => matricula.alunoId)
  ).size;

  const dadosGrafico = meusCursos.map((curso) => {
    const aprovados = matriculas.filter(
      (matricula) => Number(matricula.cursoId) === Number(curso.id) && matricula.status === "Aprovada"
    ).length;
    const nome = curso.titulo.length > 16 ? `${curso.titulo.slice(0, 14)}...` : curso.titulo;
    return { nome, aprovados };
  });
  const maxAprovados = dadosGrafico.length ? Math.max(...dadosGrafico.map((item) => item.aprovados)) : 0;

  return (
    <main className="dashboard-coordenador">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Ola, {(usuario.nome ?? "").split(" ")[0]}</h1>
          <p className="cabecalho-pagina__subtitulo">Acompanhe turmas, cursos e indicadores academicos.</p>
        </div>
      </header>

      <section aria-labelledby="titulo-stats-coord">
        <h2 className="visualmente-oculto" id="titulo-stats-coord">Indicadores academicos</h2>
        <div className="grade-estatisticas">
          <CartaoEstatistica icone={<MdMenuBook size={22} />} rotulo="Cursos sob coordenacao" valor={meusCursos.length} />
          <CartaoEstatistica
            corBorda="var(--cor-sucesso)"
            icone={<MdGroups size={22} />}
            rotulo="Turmas vinculadas"
            valor={turmasVinculadas.length}
          />
          <CartaoEstatistica
            corBorda="var(--cor-info)"
            icone={<MdSchool size={22} />}
            rotulo="Alunos aprovados"
            valor={totalAlunosMatriculados}
          />
        </div>
      </section>

      {dadosGrafico.length > 0 ? (
        <section aria-labelledby="titulo-grafico-coord" className="painel-secao" style={{ marginTop: "var(--espaco-lg)" }}>
          <header className="painel-secao__cabecalho">
            <h2 className="painel-secao__titulo" id="titulo-grafico-coord">Alunos aprovados por curso</h2>
            <span className="admin-grafico-subtitulo">matriculas com status aprovada</span>
          </header>
          <div className="painel-secao__conteudo admin-grafico-wrapper">
            <ResponsiveContainer height={220} width="100%">
              <BarChart barCategoryGap="30%" data={dadosGrafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis axisLine={false} dataKey="nome" tick={{ fill: "var(--cor-texto-suave)", fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} width={32} />
                <Tooltip cursor={{ fill: "rgba(157,103,255,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [valor, "Alunos aprovados"]} />
                <Bar dataKey="aprovados" radius={[4, 4, 0, 0]}>
                  {dadosGrafico.map((item, indice) => (
                    <Cell fill={item.aprovados === maxAprovados && maxAprovados > 0 ? "var(--cor-marca-clara)" : "rgba(157,103,255,0.35)"} key={indice} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="titulo-turmas-coord" className="painel-secao" style={{ marginTop: "var(--espaco-xl)" }}>
        <header className="painel-secao__cabecalho">
          <h2 className="painel-secao__titulo" id="titulo-turmas-coord">Turmas sob coordenacao</h2>
          <Botao onClick={() => onMudarSecao("turmas")} tamanho="pequeno" variante="fantasma">
            Ver todas <MdChevronRight aria-hidden="true" size={14} />
          </Botao>
        </header>
        <div className="painel-secao__conteudo">
          {turmasDosMeusCursos.length > 0 ? (
            <ul className="lista-turmas" role="list">
              {turmasDosMeusCursos.map((turma) => {
                const alunosDaTurma = matriculas.filter(
                  (matricula) => Number(matricula.turmaId) === Number(turma.id) && matricula.status === "Aprovada"
                ).length;
                return (
                  <li className="item-turma" key={turma.id}>
                    <div className="item-turma__info">
                      <strong className="item-turma__nome">{turma.nomeTurma}</strong>
                      <span className="item-turma__curso">{professorPorId.get(Number(turma.professorId))?.nome || "Sem professor atribuido"}</span>
                    </div>
                    <div className="item-turma__meta">
                      <span>{alunosDaTurma} alunos</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState message="Nenhuma turma encontrada para os cursos sob sua coordenacao." />
          )}
        </div>
      </section>
    </main>
  );
}
