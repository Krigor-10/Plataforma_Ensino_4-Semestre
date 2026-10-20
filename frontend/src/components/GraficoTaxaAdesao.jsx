import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MdTrendingUp } from "react-icons/md";
import CartaoEstatistica from "./CartaoEstatistica.jsx";
import SelectSimples from "./SelectSimples.jsx";
import { EmptyState, InlineMessage } from "./Primitives.jsx";
import { ApiError, apiRequest } from "../lib/api.js";
import { compactText } from "../lib/format.js";

const CORES_SERIE = ["var(--cor-marca-clara)", "var(--cor-sucesso)", "var(--cor-info)", "var(--cor-aviso)", "var(--cor-erro)"];
const MAXIMO_CURSOS_NO_RANKING = 10;

const ATALHOS_PERIODO = [
  { valor: "esteMes", rotulo: "Este mes" },
  { valor: "ultimoTrimestre", rotulo: "Ultimo trimestre" },
  { valor: "esteSemestre", rotulo: "Este semestre" },
  { valor: "esteAno", rotulo: "Este ano" },
  { valor: "personalizado", rotulo: "Personalizado" }
];

const AGRUPAMENTOS = [
  { valor: "mensal", rotulo: "Mensal" },
  { valor: "trimestral", rotulo: "Trimestral" },
  { valor: "semestral", rotulo: "Semestral" }
];

function paraISODate(data) {
  return data.toISOString().slice(0, 10);
}

function calcularIntervalo(atalho, inicioPersonalizado, fimPersonalizado) {
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  switch (atalho) {
    case "ultimoTrimestre":
      return { dataFim: hojeSemHora, dataInicio: new Date(hojeSemHora.getFullYear(), hojeSemHora.getMonth() - 3, hojeSemHora.getDate()) };
    case "esteSemestre":
      return { dataFim: hojeSemHora, dataInicio: new Date(hojeSemHora.getFullYear(), hojeSemHora.getMonth() < 6 ? 0 : 6, 1) };
    case "esteAno":
      return { dataFim: hojeSemHora, dataInicio: new Date(hojeSemHora.getFullYear(), 0, 1) };
    case "personalizado":
      return {
        dataFim: fimPersonalizado ? new Date(`${fimPersonalizado}T00:00:00`) : hojeSemHora,
        dataInicio: inicioPersonalizado ? new Date(`${inicioPersonalizado}T00:00:00`) : hojeSemHora
      };
    case "esteMes":
    default:
      return { dataFim: hojeSemHora, dataInicio: new Date(hojeSemHora.getFullYear(), hojeSemHora.getMonth(), 1) };
  }
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

/**
 * Taxa de Adesao por curso: ranking por volume de matriculas aprovadas +
 * evolucao no tempo + card de destaque. Usado nos dashboards de Admin e
 * Coordenador — o escopo por perfil (Admin=todos os cursos, Coordenador=so
 * os dele) e aplicado no backend (GET /Cursos/taxa-adesao), nao aqui.
 */
export default function GraficoTaxaAdesao({ onSessionExpired, papel }) {
  const [atalho, setAtalho] = useState("esteAno");
  const [agrupamento, setAgrupamento] = useState("mensal");
  const [inicioPersonalizado, setInicioPersonalizado] = useState("");
  const [fimPersonalizado, setFimPersonalizado] = useState("");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [seriesOcultas, setSeriesOcultas] = useState(() => new Set());

  const precisaDatasPersonalizadas = atalho === "personalizado" && (!inicioPersonalizado || !fimPersonalizado);
  const { dataInicio, dataFim } = useMemo(
    () => calcularIntervalo(atalho, inicioPersonalizado, fimPersonalizado),
    [atalho, inicioPersonalizado, fimPersonalizado]
  );

  useEffect(() => {
    if (precisaDatasPersonalizadas) {
      setCarregando(false);
      setDados(null);
      return undefined;
    }

    let ativo = true;

    async function buscar() {
      try {
        setCarregando(true);
        setErro("");

        const params = new URLSearchParams({
          dataInicio: paraISODate(dataInicio),
          dataFim: paraISODate(dataFim),
          agrupamento
        });

        const resposta = await apiRequest(`/Cursos/taxa-adesao?${params.toString()}`);
        if (!ativo) {
          return;
        }

        setDados(resposta);
        setSeriesOcultas(new Set());
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar a taxa de adesao agora.");
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    buscar();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, agrupamento, precisaDatasPersonalizadas]);

  function alternarSerie(dataKey) {
    setSeriesOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(dataKey)) {
        proximo.delete(dataKey);
      } else {
        proximo.add(dataKey);
      }
      return proximo;
    });
  }

  const ranking = useMemo(() => dados?.ranking || [], [dados]);
  const rankingExibido = useMemo(
    () => ranking.slice(0, MAXIMO_CURSOS_NO_RANKING).map((curso) => ({ ...curso, cursoTituloCurto: compactText(curso.cursoTitulo, 26) })),
    [ranking]
  );
  const maiorValorRanking = rankingExibido.length ? Math.max(...rankingExibido.map((curso) => curso.matriculasConfirmadas)) : 0;

  const evolucao = useMemo(() => dados?.evolucao || [], [dados]);
  const dadosEvolucao = useMemo(() => {
    if (!evolucao.length) {
      return [];
    }

    const totalPontos = evolucao[0].pontos.length;
    return Array.from({ length: totalPontos }, (_valor, indice) => {
      const linha = { periodoLabel: evolucao[0].pontos[indice].periodoLabel };
      evolucao.forEach((curso) => {
        linha[`curso_${curso.cursoId}`] = curso.pontos[indice]?.matriculasConfirmadas ?? 0;
      });
      return linha;
    });
  }, [evolucao]);

  const semCursoVinculado = Boolean(dados) && ranking.length === 0;
  const semDadosNoPeriodo = Boolean(dados) && ranking.length > 0 && ranking.every((curso) => curso.matriculasConfirmadas === 0);

  return (
    <section aria-labelledby="titulo-taxa-adesao" className="painel-secao" style={{ marginTop: "var(--espaco-xl)" }}>
      <header className="painel-secao__cabecalho" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: "var(--espaco-sm)" }}>
        <h2 className="painel-secao__titulo" id="titulo-taxa-adesao">Taxa de adesao por curso</h2>
        <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: "var(--espaco-sm)" }}>
          <div className="campo" style={{ minWidth: "9rem" }}>
            <label className="campo__rotulo" htmlFor="taxa-adesao-atalho">Periodo</label>
            <SelectSimples id="taxa-adesao-atalho" onChange={setAtalho} opcoes={ATALHOS_PERIODO} value={atalho} />
          </div>
          {atalho === "personalizado" ? (
            <>
              <div className="campo" style={{ minWidth: 0 }}>
                <label className="campo__rotulo" htmlFor="taxa-adesao-data-inicio">De</label>
                <input
                  className="campo__entrada"
                  id="taxa-adesao-data-inicio"
                  onChange={(event) => setInicioPersonalizado(event.target.value)}
                  type="date"
                  value={inicioPersonalizado}
                />
              </div>
              <div className="campo" style={{ minWidth: 0 }}>
                <label className="campo__rotulo" htmlFor="taxa-adesao-data-fim">Ate</label>
                <input
                  className="campo__entrada"
                  id="taxa-adesao-data-fim"
                  onChange={(event) => setFimPersonalizado(event.target.value)}
                  type="date"
                  value={fimPersonalizado}
                />
              </div>
            </>
          ) : null}
          <div className="campo" style={{ minWidth: "8rem" }}>
            <label className="campo__rotulo" htmlFor="taxa-adesao-agrupamento">Agrupar por</label>
            <SelectSimples id="taxa-adesao-agrupamento" onChange={setAgrupamento} opcoes={AGRUPAMENTOS} value={agrupamento} />
          </div>
        </div>
      </header>

      <div className="painel-secao__conteudo">
        {precisaDatasPersonalizadas ? (
          <p className="texto-vazio">Selecione a data inicial e final do periodo personalizado.</p>
        ) : carregando ? (
          <p className="texto-vazio">Carregando...</p>
        ) : erro ? (
          <InlineMessage tone="error">{erro}</InlineMessage>
        ) : !dados ? (
          // Janela transitoria entre o state de "precisaDatasPersonalizadas" virar falso e o
          // efeito de busca rodar (seta carregando=true de forma assincrona) — sem isso o
          // render cai no branch abaixo com dados ainda null e quebra em dados.destaque.
          <p className="texto-vazio">Carregando...</p>
        ) : semCursoVinculado ? (
          <EmptyState
            message={papel === "Coordenador" ? "Nenhum curso vinculado a sua coordenacao." : "Nenhum curso cadastrado ainda."}
          />
        ) : semDadosNoPeriodo ? (
          <EmptyState message="Sem dados no periodo selecionado." />
        ) : (
          <>
            {dados.destaque ? (
              <div style={{ marginBottom: "var(--espaco-lg)" }}>
                <CartaoEstatistica
                  corBorda="var(--cor-sucesso)"
                  icone={<MdTrendingUp size={22} />}
                  rotulo="Curso com mais adesao no periodo"
                  valor={`${dados.destaque.cursoTitulo} — ${dados.destaque.matriculasConfirmadas} matricula(s)`}
                />
              </div>
            ) : null}

            <h3 className="admin-grafico-subtitulo" style={{ marginBottom: "var(--espaco-sm)" }}>
              Ranking por matriculas confirmadas
              {ranking.length > MAXIMO_CURSOS_NO_RANKING ? ` (10 primeiros de ${ranking.length})` : ""}
            </h3>
            <ResponsiveContainer height={Math.max(220, rankingExibido.length * 36)} width="100%">
              <BarChart data={rankingExibido} layout="vertical" margin={{ bottom: 0, left: 8, right: 24, top: 8 }}>
                <XAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} type="number" />
                <YAxis axisLine={false} dataKey="cursoTituloCurto" tick={{ fill: "var(--cor-texto-suave)", fontSize: 11 }} tickLine={false} type="category" width={160} />
                <Tooltip
                  contentStyle={ChartTooltipStyle()}
                  cursor={{ fill: "rgba(157,103,255,0.08)" }}
                  formatter={(valor, _nome, item) => [`${valor} matricula(s)`, item.payload.cursoTitulo]}
                />
                <Bar dataKey="matriculasConfirmadas" radius={[0, 4, 4, 0]}>
                  {rankingExibido.map((curso, indice) => (
                    <Cell
                      fill={curso.matriculasConfirmadas === maiorValorRanking && maiorValorRanking > 0 ? "var(--cor-marca-clara)" : "rgba(157,103,255,0.35)"}
                      key={indice}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {dadosEvolucao.length > 0 ? (
              <>
                <h3 className="admin-grafico-subtitulo" style={{ margin: "var(--espaco-lg) 0 var(--espaco-sm)" }}>
                  Evolucao (top {evolucao.length} curso{evolucao.length > 1 ? "s" : ""})
                </h3>
                <ResponsiveContainer height={240} width="100%">
                  <LineChart data={dadosEvolucao} margin={{ bottom: 0, left: -12, right: 16, top: 8 }}>
                    <CartesianGrid stroke="var(--cor-borda)" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="periodoLabel" tick={{ fill: "var(--cor-texto-suave)", fontSize: 11 }} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--cor-texto-mudo)", fontSize: 11 }} tickLine={false} width={32} />
                    <Tooltip contentStyle={ChartTooltipStyle()} />
                    <Legend onClick={(item) => alternarSerie(item.dataKey)} wrapperStyle={{ cursor: "pointer", fontSize: "0.78rem" }} />
                    {evolucao.map((curso, indice) => {
                      const dataKey = `curso_${curso.cursoId}`;
                      return (
                        <Line
                          dataKey={dataKey}
                          dot={{ r: 3 }}
                          hide={seriesOcultas.has(dataKey)}
                          key={dataKey}
                          name={compactText(curso.cursoTitulo, 22)}
                          stroke={CORES_SERIE[indice % CORES_SERIE.length]}
                          strokeWidth={2}
                          type="monotone"
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
