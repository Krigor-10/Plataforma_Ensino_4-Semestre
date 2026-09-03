/* ============================================================
   DASHBOARD ALUNO — Painel inicial do aluno (Etapa 2 do reskin)
   Replica TelaDashboardAluno do protótipo, mas com dados reais
   vindos do snapshot da API (matriculas/progressos/conteudos) em
   vez dos mocks do protótipo. Sem a secao de Favoritos: nao existe
   campo de favorito no modelo de dados real, entao o espaco vira
   uma lista de cursos ativos (matriculas aprovadas).
   ============================================================ */
import { motion } from "framer-motion";
import { MdSchool } from "react-icons/md";
import { TbPlayerPlay, TbBooks, TbCheck, TbStack, TbChartBar, TbRocket } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import { EmptyState } from "../../components/Primitives.jsx";
import { normalizeProgressStatus } from "../../lib/format.js";

const PAGAMENTO_PENDENTE = 1;

export function DashboardAluno({ avaliacoes = [], conteudos = [], matriculas = [], modulos = [], onMudarSecao, progressos = {}, usuario }) {
  const progressosCursos = progressos.cursos || [];
  const progressosModulos = progressos.modulos || [];
  const progressosConteudos = progressos.conteudos || [];

  const progressoCursoPorMatricula = new Map(progressosCursos.map((item) => [Number(item.matriculaId), item]));
  const progressoModuloPorChave = new Map(
    progressosModulos.map((item) => [`${item.matriculaId}-${item.moduloId}`, item])
  );
  const progressoConteudoPorId = new Map(progressosConteudos.map((item) => [Number(item.conteudoDidaticoId), item]));
  const moduloPorId = new Map(modulos.map((modulo) => [Number(modulo.id), modulo]));

  // Curso pago com pagamento pendente nao conta como "ativo" aqui — mesma
  // regra aplicada em Meus Cursos (CartaoCursoMatricula): matricula aprovada
  // != acesso liberado quando o curso e pago.
  const matriculasAprovadas = matriculas.filter(
    (matricula) => matricula.status === "Aprovada" && matricula.pagamentoStatus !== PAGAMENTO_PENDENTE
  );

  const cursosAtivos = matriculasAprovadas.map((matricula) => {
    const progressoCurso = progressoCursoPorMatricula.get(Number(matricula.id));
    return {
      ...matricula,
      percentual: Number(progressoCurso?.percentualConclusao || 0)
    };
  });

  const moduloEmAndamento = (() => {
    for (const matricula of matriculasAprovadas) {
      const modulosDoCurso = modulos
        .filter((modulo) => Number(modulo.cursoId) === Number(matricula.cursoId))
        .sort((a, b) => new Date(a.dataCriacao || 0).getTime() - new Date(b.dataCriacao || 0).getTime());

      for (const modulo of modulosDoCurso) {
        const progresso = progressoModuloPorChave.get(`${matricula.id}-${modulo.id}`);
        const percentual = Number(progresso?.percentualConclusao || 0);

        if (percentual > 0 && percentual < 100) {
          return { matricula, moduloId: modulo.id, moduloTitulo: modulo.titulo, percentual };
        }
      }
    }

    return null;
  })();

  const proximoConteudo = moduloEmAndamento
    ? conteudos.find((conteudo) => {
        if (Number(conteudo.moduloId) !== Number(moduloEmAndamento.moduloId)) {
          return false;
        }

        const progresso = progressoConteudoPorId.get(Number(conteudo.id));
        return normalizeProgressStatus(progresso?.statusProgresso) !== "Concluido";
      })
    : null;

  const cursoParaComecar = !moduloEmAndamento && matriculasAprovadas.length ? matriculasAprovadas[0] : null;

  const conteudosConcluidos = progressosConteudos.filter(
    (item) => normalizeProgressStatus(item.statusProgresso) === "Concluido"
  ).length;
  const modulosConcluidos = progressosModulos.filter(
    (item) => normalizeProgressStatus(item.statusProgresso) === "Concluido"
  ).length;
  const cursosEmAndamento = cursosAtivos.filter((item) => item.percentual > 0 && item.percentual < 100).length;
  const progressoGeral = progressosCursos.length
    ? Math.round(
        progressosCursos.reduce((total, item) => total + Number(item.percentualConclusao || 0), 0) /
          progressosCursos.length
      )
    : 0;

  return (
    <main className="dashboard-aluno">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Ola, {(usuario.nome ?? "").split(" ")[0]}</h1>
          <p className="cabecalho-pagina__subtitulo">Continue de onde parou e acompanhe sua trilha academica.</p>
        </div>
      </header>

      {moduloEmAndamento ? (
        <section className="cartao-retomar" aria-label="Continuar onde parou">
          <div className="cartao-retomar__info">
            <span className="cartao-retomar__etiqueta">Em andamento</span>
            <h3 className="cartao-retomar__modulo">{moduloEmAndamento.moduloTitulo}</h3>
            {proximoConteudo ? (
              <p className="cartao-retomar__proximo">
                Proximo: <strong>{proximoConteudo.titulo}</strong>
              </p>
            ) : null}
            <div className="cartao-retomar__barra">
              <BarraProgresso percentual={moduloEmAndamento.percentual} />
            </div>
          </div>
          <div className="cartao-retomar__acao">
            <motion.div
              animate={{
                scale: [1, 1.07, 1],
                boxShadow: [
                  "0 0 0px rgba(123, 47, 247, 0)",
                  "0 6px 28px rgba(123, 47, 247, 0.65)",
                  "0 0 0px rgba(123, 47, 247, 0)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              whileHover={{ scale: 1.1, boxShadow: "0 8px 32px rgba(123, 47, 247, 0.8)" }}
              whileTap={{ scale: 0.95 }}
              style={{ display: "inline-block", borderRadius: "var(--raio-md)" }}
            >
              <Botao onClick={() => onMudarSecao("conteudos")} variante="primario">
                <TbPlayerPlay aria-hidden="true" size={16} /> Continuar agora
              </Botao>
            </motion.div>
          </div>
        </section>
      ) : cursoParaComecar ? (
        <section aria-label="Iniciar jornada" className="cartao-retomar cartao-retomar--inicio">
          <div className="cartao-retomar__info">
            <span className="cartao-retomar__etiqueta">Pronto para comecar</span>
            <h3 className="cartao-retomar__modulo">{cursoParaComecar.curso}</h3>
            <p className="cartao-retomar__proximo">Acesse o primeiro modulo e de o primeiro passo na sua jornada.</p>
          </div>
          <div className="cartao-retomar__acao">
            <motion.div
              animate={{
                scale: [1, 1.07, 1],
                boxShadow: [
                  "0 0 0px rgba(123, 47, 247, 0)",
                  "0 6px 28px rgba(123, 47, 247, 0.65)",
                  "0 0 0px rgba(123, 47, 247, 0)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              whileHover={{ scale: 1.1, boxShadow: "0 8px 32px rgba(123, 47, 247, 0.8)" }}
              whileTap={{ scale: 0.95 }}
              style={{ display: "inline-block", borderRadius: "var(--raio-md)" }}
            >
              <Botao onClick={() => onMudarSecao("conteudos")} variante="primario">
                <TbRocket aria-hidden="true" size={16} /> Iniciar jornada
              </Botao>
            </motion.div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="titulo-cursos-ativos" style={{ marginTop: "var(--espaco-xl)" }}>
        <h2 className="secao-titulo" id="titulo-cursos-ativos">
          <MdSchool aria-hidden="true" size={18} style={{ color: "var(--cor-marca)", marginRight: "6px", verticalAlign: "middle" }} />
          Meus cursos ativos
        </h2>
        {cursosAtivos.length === 0 ? (
          <p className="cursos-ativos-vazio">
            Nenhuma matricula aprovada ainda. Explore o{" "}
            <button className="cursos-ativos-vazio__link" onClick={() => onMudarSecao("matriculas")} type="button">
              catalogo
            </button>{" "}
            e solicite sua matricula.
          </p>
        ) : (
          <ul className="cursos-ativos-lista" role="list">
            {cursosAtivos.map((item) => (
              <li className="cartao-curso-ativo" key={item.id}>
                <div className="cartao-curso-ativo__info">
                  <strong className="cartao-curso-ativo__titulo">{item.curso}</strong>
                  <p className="cartao-curso-ativo__meta">{item.turma}</p>
                </div>
                <div className="cartao-curso-ativo__progresso">
                  <BarraProgresso percentual={item.percentual} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-stats-aluno" style={{ marginTop: "var(--espaco-xl)" }}>
        <h2 className="visualmente-oculto" id="titulo-stats-aluno">Resumo de atividades</h2>
        <div className="grade-estatisticas">
          <CartaoEstatistica icone={<TbBooks size={22} />} rotulo="Cursos em andamento" valor={cursosEmAndamento} />
          <CartaoEstatistica
            corBorda="var(--cor-sucesso)"
            icone={<TbCheck size={22} />}
            rotulo="Conteudos concluidos"
            valor={conteudosConcluidos}
          />
          <CartaoEstatistica
            corBorda="var(--cor-info)"
            icone={<TbStack size={22} />}
            rotulo="Modulos concluidos"
            valor={modulosConcluidos}
          />
          <CartaoEstatistica
            corBorda="var(--cor-marca)"
            icone={<TbChartBar size={22} />}
            rotulo="Progresso geral"
            valor={`${progressoGeral}%`}
          />
        </div>
      </section>

      {avaliacoes.length === 0 && conteudos.length === 0 && matriculasAprovadas.length === 0 ? (
        <EmptyState message="Assim que sua primeira matricula for aprovada, seu painel ganha vida por aqui." />
      ) : null}
    </main>
  );
}
