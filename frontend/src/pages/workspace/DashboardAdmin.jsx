/* ============================================================
   DASHBOARD ADMIN — Painel administrativo (Etapa 2 do reskin)
   Replica TelaDashboardAdmin do protótipo. O KPI "Taxa de
   conclusao" busca GET /Cursos/inscricoes (mesma fonte da tela
   Inscrições) e soma concluíram/inscritos entre todos os cursos -
   antes era "Taxa de aprovacao" de matrícula, que ficou sempre
   100% desde que a matrícula deixou de ser aprovada manualmente
   (PROMPT-agente-tela-inscricoes.md). O botao de resetar dados de
   demonstracao nao existe: e um recurso do modo mock do protótipo,
   sem equivalente no backend real.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  MdAssignment,
  MdAssignmentTurnedIn,
  MdBarChart,
  MdDescription,
  MdMenuBook,
  MdPeople,
  MdSchool,
  MdTrendingUp
} from "react-icons/md";
import { TbTag } from "react-icons/tb";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GraficoTaxaAdesao from "../../components/GraficoTaxaAdesao.jsx";
import { mapById } from "../../lib/dashboard.js";
import { LARGURA_MAXIMA_BARRA_EM_PE } from "../../lib/graficos.js";
import { ApiError, apiRequest } from "../../lib/api.js";
import { parseApiDate } from "../../lib/format.js";

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* Generaliza o grafico "X por mes" pra qualquer lista com data (matriculas
   por dataSolicitacao, alunos por dataCadastro) - evita duplicar a mesma
   logica de janela de 6 meses pros dois graficos do Dashboard Admin. */
function gerarDadosPorMes(itens, obterData) {
  const datas = itens.map(obterData).map(parseApiDate).filter(Boolean);
  const base = datas.length ? new Date(Math.max(...datas.map((data) => data.getTime()))) : new Date();

  return Array.from({ length: 6 }, (_, indice) => {
    const referencia = new Date(base.getFullYear(), base.getMonth() - (5 - indice), 1);
    const total = itens.filter((item) => {
      const data = parseApiDate(obterData(item));
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

const MODELO_GRATUITO = 1;

const ACESSO_RAPIDO = [
  { icone: <MdMenuBook size={20} />, rotulo: "Cursos", secao: "cursos" },
  { icone: <MdAssignment size={20} />, rotulo: "Matriculas", secao: "matriculas" },
  { icone: <MdPeople size={20} />, rotulo: "Alunos", secao: "alunos" },
  { icone: <MdDescription size={20} />, rotulo: "Professores", secao: "professores" }
];

export function DashboardAdmin({ alunos = [], coordenadores = [], cursos = [], matriculas = [], onMudarSecao, onSessionExpired, professores = [], usuario }) {
  const alunosAtivos = alunos.filter((aluno) => aluno.ativo).length;
  const totalUsuarios = alunos.length + professores.length + coordenadores.length;
  const matriculasAprovadas = matriculas.filter((matricula) => matricula.status === "Aprovada");

  // PROMPT-agente-tela-inscricoes.md, item 9: "Taxa de aprovacao" (sempre
  // 100% desde que a matricula deixou de ser aprovada manualmente) vira
  // "Taxa de conclusao" = concluiram / inscritos, somado entre todos os
  // cursos, com os mesmos dados da tela Inscricoes (sem filtro de periodo).
  const [inscricoes, setInscricoes] = useState([]);

  useEffect(() => {
    let ativo = true;

    apiRequest("/Cursos/inscricoes")
      .then((dados) => {
        if (ativo) {
          setInscricoes(dados);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
        // Falha ao carregar nao deve quebrar o resto do Dashboard - o KPI so
        // fica em 0% (mesmo tratamento silencioso ja usado em outros
        // carregamentos auxiliares desta tela, ex. status de certificado).
      });

    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const totalInscritos = inscricoes.reduce((total, curso) => total + curso.inscritos, 0);
  const totalConcluiram = inscricoes.reduce((total, curso) => total + curso.concluiram, 0);
  const taxaConclusao = totalInscritos ? Math.round((totalConcluiram / totalInscritos) * 100) : 0;

  const cursoPorId = mapById(cursos);
  // Conversao: cadastro -> pelo menos uma matricula aprovada (matricula e
  // sempre automatica hoje, entao isso mede adesao real, nao aprovacao
  // manual). Aquisicao: nao existe endpoint admin com pagamento confirmado
  // (so /Pagamentos/aluno, escopado ao proprio aluno) - matricula em curso
  // pago e o sinal mais proximo sem inventar dado, por isso o rotulo fica
  // "em cursos pagos" em vez de "compras confirmadas".
  const alunosComMatriculaAprovada = new Set(matriculasAprovadas.map((matricula) => matricula.alunoId)).size;
  const taxaConversao = alunos.length ? Math.round((alunosComMatriculaAprovada / alunos.length) * 100) : 0;
  const matriculasEmCursoPago = matriculasAprovadas.filter((matricula) => cursoPorId.get(matricula.cursoId)?.ehGratuito === false).length;

  // Plano fluxo-venda-cursos, Round 6: so conta Gratuito encerrado - e o
  // unico modelo que fica "aguardando o Admin" preparar pra venda (achado
  // 7 do plano). Acompanhado encerrado nao entra aqui, nao tem acao de
  // pacote associada.
  const totalCursosEncerradosAguardandoVenda = useMemo(
    () => cursos.filter((curso) => Number(curso.modeloCurso) === MODELO_GRATUITO && Boolean(curso.encerradoEm)).length,
    [cursos]
  );

  const kpis = [
    { detalhe: `${professores.length} professor(es), ${coordenadores.length} coordenador(es)`, icone: <MdPeople size={22} />, rotulo: "Usuarios", valor: totalUsuarios },
    { corBorda: "var(--cor-info)", detalhe: `de ${alunos.length} cadastrados`, icone: <MdSchool size={22} />, rotulo: "Alunos ativos", valor: alunosAtivos },
    { corBorda: "var(--cor-sucesso)", detalhe: "dos alunos inscritos", icone: <MdBarChart size={22} />, rotulo: "Taxa de conclusao", valor: `${taxaConclusao}%` },
    { corBorda: "var(--cor-marca)", detalhe: "alunos cadastrados com matricula aprovada", icone: <MdTrendingUp size={22} />, rotulo: "Conversao", valor: `${taxaConversao}%` },
    { corBorda: "var(--cor-aviso)", detalhe: "matriculas aprovadas em cursos pagos", icone: <MdAssignmentTurnedIn size={22} />, rotulo: "Em cursos pagos", valor: matriculasEmCursoPago },
    {
      corBorda: "var(--cor-aviso)",
      icone: <TbTag size={22} />,
      onClick: () => onMudarSecao("cursos"),
      rotulo: "Cursos encerrados aguardando voce",
      valor: totalCursosEncerradosAguardandoVenda
    }
  ];

  const dadosGraficoMatriculas = gerarDadosPorMes(matriculas, (matricula) => matricula.dataSolicitacao);
  const maxTotalMatriculas = Math.max(...dadosGraficoMatriculas.map((item) => item.total), 1);
  const dadosGraficoCadastros = gerarDadosPorMes(alunos, (aluno) => aluno.dataCadastro);
  const maxTotalCadastros = Math.max(...dadosGraficoCadastros.map((item) => item.total), 1);

  return (
    <div className="dashboard-admin">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Ola, {(usuario?.nome ?? "").split(" ")[0]}</h1>
          <p className="cabecalho-pagina__subtitulo">Visao geral da plataforma</p>
        </div>
      </header>

      <section aria-label="Metricas gerais da plataforma">
        <div className="grade-estatisticas grade-estatisticas--compacta-6">
          {kpis.map((kpi) => (
            <CartaoEstatistica corBorda={kpi.corBorda} icone={kpi.icone} key={kpi.rotulo} onClick={kpi.onClick} rotulo={kpi.rotulo} valor={kpi.valor} />
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

      <div className="grade-2" style={{ marginTop: "var(--espaco-lg)" }}>
        <section aria-labelledby="titulo-grafico-matriculas" className="painel-secao">
          <header className="painel-secao__cabecalho">
            <h2 className="painel-secao__titulo" id="titulo-grafico-matriculas">Matriculas por mes</h2>
            <span className="admin-grafico-subtitulo">ultimos 6 meses</span>
          </header>
          <div className="painel-secao__conteudo admin-grafico-wrapper">
            <ResponsiveContainer height={220} width="100%">
              <BarChart barCategoryGap="30%" data={dadosGraficoMatriculas} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis axisLine={false} dataKey="mes" tick={{ fill: "var(--cor-texto-suave)", fontSize: 12 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} width={36} />
                <Tooltip cursor={{ fill: "rgba(157,103,255,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [valor, "Matriculas"]} />
                <Bar dataKey="total" maxBarSize={LARGURA_MAXIMA_BARRA_EM_PE} radius={[4, 4, 0, 0]}>
                  {dadosGraficoMatriculas.map((item, indice) => (
                    <Cell fill={item.total === maxTotalMatriculas ? "var(--cor-marca-clara)" : "rgba(157,103,255,0.35)"} key={indice} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-labelledby="titulo-grafico-cadastros" className="painel-secao">
          <header className="painel-secao__cabecalho">
            <h2 className="painel-secao__titulo" id="titulo-grafico-cadastros">Novos alunos cadastrados</h2>
            <span className="admin-grafico-subtitulo">ultimos 6 meses</span>
          </header>
          <div className="painel-secao__conteudo admin-grafico-wrapper">
            <ResponsiveContainer height={220} width="100%">
              <BarChart barCategoryGap="30%" data={dadosGraficoCadastros} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis axisLine={false} dataKey="mes" tick={{ fill: "var(--cor-texto-suave)", fontSize: 12 }} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} width={36} />
                <Tooltip cursor={{ fill: "rgba(34,197,94,0.08)" }} contentStyle={ChartTooltipStyle()} formatter={(valor) => [valor, "Alunos"]} />
                <Bar dataKey="total" maxBarSize={LARGURA_MAXIMA_BARRA_EM_PE} radius={[4, 4, 0, 0]}>
                  {dadosGraficoCadastros.map((item, indice) => (
                    <Cell fill={item.total === maxTotalCadastros ? "var(--cor-sucesso)" : "rgba(34,197,94,0.35)"} key={indice} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <GraficoTaxaAdesao onSessionExpired={onSessionExpired} papel="Admin" />
    </div>
  );
}
