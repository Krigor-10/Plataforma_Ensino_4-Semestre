/* ============================================================
   DASHBOARD ADMIN — Painel administrativo (Etapa 2 do reskin)
   Replica TelaDashboardAdmin do protótipo. O KPI "taxa de
   conclusao" do protótipo vinha de um mock global; aqui vira
   "taxa de aprovacao de matriculas", que e calculavel a partir
   dos dados reais ja carregados pelo snapshot do Admin. O botao
   de resetar dados de demonstracao nao existe: e um recurso do
   modo mock do protótipo, sem equivalente no backend real.
   ============================================================ */
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  MdAssignment,
  MdAssignmentTurnedIn,
  MdBarChart,
  MdDescription,
  MdGroups,
  MdLayers,
  MdMenuBook,
  MdPeople,
  MdSchool
} from "react-icons/md";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GraficoTaxaAdesao from "../../components/GraficoTaxaAdesao.jsx";
import { parseApiDate } from "../../lib/format.js";

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function gerarDados6Meses(matriculas) {
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
    background: "var(--cor-cartao)",
    border: "1px solid var(--cor-borda)",
    borderRadius: "8px",
    color: "var(--cor-texto-forte)",
    fontSize: "0.82rem"
  };
}

const ACESSO_RAPIDO = [
  { icone: <MdMenuBook size={20} />, rotulo: "Cursos", secao: "cursos" },
  { icone: <MdLayers size={20} />, rotulo: "Modulos", secao: "modulos" },
  { icone: <MdGroups size={20} />, rotulo: "Turmas", secao: "turmas" },
  { icone: <MdAssignment size={20} />, rotulo: "Matriculas", secao: "matriculas" },
  { icone: <MdPeople size={20} />, rotulo: "Alunos", secao: "alunos" },
  { icone: <MdDescription size={20} />, rotulo: "Professores", secao: "professores" }
];

export function DashboardAdmin({ alunos = [], coordenadores = [], matriculas = [], onMudarSecao, onSessionExpired, professores = [], usuario }) {
  const alunosAtivos = alunos.filter((aluno) => aluno.ativo).length;
  const totalUsuarios = alunos.length + professores.length + coordenadores.length;
  const aprovadas = matriculas.filter((matricula) => matricula.status === "Aprovada").length;
  const taxaAprovacao = matriculas.length ? Math.round((aprovadas / matriculas.length) * 100) : 0;

  const kpis = [
    { detalhe: `${professores.length} professor(es), ${coordenadores.length} coordenador(es)`, icone: <MdPeople size={22} />, rotulo: "Usuarios", valor: totalUsuarios },
    { corBorda: "var(--cor-info)", detalhe: `de ${alunos.length} cadastrados`, icone: <MdSchool size={22} />, rotulo: "Alunos ativos", valor: alunosAtivos },
    { corBorda: "var(--cor-sucesso)", detalhe: "das matriculas registradas", icone: <MdBarChart size={22} />, rotulo: "Taxa de aprovacao", valor: `${taxaAprovacao}%` }
  ];

  const dadosGrafico = gerarDados6Meses(matriculas);
  const maxTotal = Math.max(...dadosGrafico.map((item) => item.total), 1);

  return (
    <div className="dashboard-admin">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Ola, {(usuario?.nome ?? "").split(" ")[0]}</h1>
          <p className="cabecalho-pagina__subtitulo">Visao geral da plataforma</p>
        </div>
      </header>

      <section aria-label="Metricas gerais da plataforma">
        <div className="grade-estatisticas">
          {kpis.map((kpi) => (
            <CartaoEstatistica corBorda={kpi.corBorda} icone={kpi.icone} key={kpi.rotulo} rotulo={kpi.rotulo} valor={kpi.valor} />
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-acesso-rapido" className="painel-secao" style={{ marginTop: "var(--espaco-xl)" }}>
        <header className="painel-secao__cabecalho">
          <h2 className="painel-secao__titulo" id="titulo-acesso-rapido">Acesso rapido</h2>
        </header>
        <div className="painel-secao__conteudo">
          <ul className="grade-acesso-rapido" role="list">
            {ACESSO_RAPIDO.map((item) => (
              <li key={item.secao}>
                <button
                  aria-label={`Ir para ${item.rotulo}`}
                  className="botao-acesso-rapido"
                  onClick={() => onMudarSecao(item.secao)}
                  type="button"
                >
                  <span aria-hidden="true">{item.icone}</span>
                  <span>{item.rotulo}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="titulo-grafico-matriculas" className="painel-secao" style={{ marginTop: "var(--espaco-lg)" }}>
        <header className="painel-secao__cabecalho">
          <h2 className="painel-secao__titulo" id="titulo-grafico-matriculas">Matriculas por mes</h2>
          <span className="admin-grafico-subtitulo">ultimos 6 meses</span>
        </header>
        <div className="painel-secao__conteudo admin-grafico-wrapper">
          <ResponsiveContainer height={220} width="100%">
            <BarChart barCategoryGap="30%" data={dadosGrafico} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis axisLine={false} dataKey="mes" tick={{ fill: "var(--cor-texto-suave)", fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} width={36} />
              <Tooltip cursor={{ fill: "rgba(157,103,255,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [valor, "Matriculas"]} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {dadosGrafico.map((item, indice) => (
                  <Cell fill={item.total === maxTotal ? "var(--cor-marca-clara)" : "rgba(157,103,255,0.35)"} key={indice} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <GraficoTaxaAdesao onSessionExpired={onSessionExpired} papel="Admin" />
    </div>
  );
}
