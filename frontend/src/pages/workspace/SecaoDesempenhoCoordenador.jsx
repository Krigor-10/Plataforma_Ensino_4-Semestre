import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbAward, TbChartBar, TbCircleCheck, TbUserCheck, TbUsers } from "react-icons/tb";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatGrade, formatPercent } from "../../lib/format.js";
import PainelModulosDesempenho from "./PainelModulosDesempenho.jsx";

/* PROGRESSO DA COORDENACAO — navegacao por Curso -> Modulos -> Materiais/
   Avaliacoes, so visualizacao/analise (sem acoes administrativas de Professor
   como Editar/Excluir/Publicar). Busca os dados agregados direto do backend
   (GET /Cursos/desempenho), que ja escopa por coordenador autenticado.
   "Turma" nao aparece em lugar nenhum desta tela — e so uma abstracao interna
   do backend, 1:1 com o curso na pratica. O bloco de Modulos/Avaliacoes e
   compartilhado com o Progresso do Professor via PainelModulosDesempenho. */
export function SecaoDesempenhoCoordenador({ cursoEmFoco, cursoPorId, onCursoEmFocoAplicado, onSessionExpired }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [cursosDesempenho, setCursosDesempenho] = useState([]);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        setCarregando(true);
        setErro("");
        const dados = await apiRequest("/Cursos/desempenho");

        if (!ativo) {
          return;
        }

        setCursosDesempenho(dados);
      } catch (err) {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar o progresso dos cursos agora.");
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDesempenho();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId || carregando) {
      return;
    }

    const cursoAlvo = cursosDesempenho.find((curso) => curso.cursoId === cursoEmFocoId);
    if (cursoAlvo) {
      setCursoSelecionadoId(cursoEmFocoId);
    }

    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId, carregando]);

  const cursoSelecionado = useMemo(
    () => cursosDesempenho.find((curso) => curso.cursoId === cursoSelecionadoId) || null,
    [cursoSelecionadoId, cursosDesempenho]
  );

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(cursoId);
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
  }

  return (
    <div className="tela-progresso-coordenador">
      {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}

      {carregando ? (
        <p className="texto-vazio texto-vazio--central" role="status">Carregando progresso dos cursos...</p>
      ) : !cursoSelecionado ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Progresso</h2>
              <p className="cabecalho-pagina__subtitulo">Analise de progresso e desempenho dos cursos, modulos e materiais.</p>
            </div>
          </header>

          <GradeCursosProfessor
            cursos={cursosDesempenho.map((curso) => ({
              curso: cursoPorId.get(curso.cursoId) || { id: curso.cursoId, titulo: curso.cursoTitulo, descricao: "" },
              resumo: `${curso.totalAlunos} aluno${curso.totalAlunos === 1 ? "" : "s"} · ${curso.modulos.length} modulo${curso.modulos.length === 1 ? "" : "s"}`,
              rodapeEsquerda: curso.professorNome || "Sem professor",
              badge: `Media ${formatGrade(curso.desempenhoMedio)}`,
              percentual: curso.progressoMedio
            }))}
            mensagemVazia="Voce ainda nao tem cursos sob coordenacao."
            onSelecionar={selecionarCurso}
          />
        </>
      ) : (
        <>
          <nav aria-label="Navegacao do progresso" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaLista} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Progresso
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{cursoSelecionado.cursoTitulo}</h2>
              {cursoSelecionado.professorNome ? (
                <p className="atividades-curso__subtitulo">Professor responsavel: {cursoSelecionado.professorNome}</p>
              ) : null}
            </div>
          </header>

          <div className="grade-estatisticas">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Alunos" valor={cursoSelecionado.totalAlunos} />
            <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbUserCheck size={22} />} rotulo="Ativos" valor={cursoSelecionado.alunosAtivos} />
            <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio" valor={formatPercent(cursoSelecionado.progressoMedio)} />
            <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Taxa de conclusao" valor={formatPercent(cursoSelecionado.percentualConclusao)} />
            <CartaoEstatistica icone={<TbAward size={22} />} rotulo="Desempenho medio" valor={formatGrade(cursoSelecionado.desempenhoMedio)} />
          </div>

          <PainelModulosDesempenho curso={cursoSelecionado} />
        </>
      )}
    </div>
  );
}
