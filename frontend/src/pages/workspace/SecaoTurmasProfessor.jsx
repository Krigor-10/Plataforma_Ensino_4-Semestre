import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbAward, TbChartBar, TbCircleCheck, TbDownload, TbUserCheck, TbUsers } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest, baixarArquivo } from "../../lib/api.js";
import { formatGrade, formatPercent } from "../../lib/format.js";
import PainelModulosDesempenho from "./PainelModulosDesempenho.jsx";

/* PROGRESSO DO PROFESSOR — mesma linguagem visual/estrutural do Progresso do
   Coordenador (SecaoDesempenhoCoordenador.jsx): Curso -> Modulos -> Materiais/
   Avaliacoes, via o mesmo endpoint (GET /Cursos/desempenho, escopado por
   professor autenticado) e o mesmo bloco compartilhado
   (PainelModulosDesempenho). Diferenca de contexto por papel: sem "Professor
   responsavel" (e o proprio professor), com o botao "Exportar desempenho"
   (acao operacional que so faz sentido pra quem leciona a turma). Sem nenhuma
   acao administrativa de turma — isso e exclusivo do Coordenador/Admin em
   SecaoTurmas.jsx. */
export function SecaoTurmasProfessor({ cursoPorId, onSessionExpired }) {
  const { mostrarToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [cursosDesempenho, setCursosDesempenho] = useState([]);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState("");

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

  /* Exportacao usa o turmaId do curso selecionado — o backend
     (ObterDesempenhoPorTurmaAsync) so devolve dados dessa turma, ja validando
     que ela pertence ao professor autenticado. */
  async function exportarDesempenho() {
    if (!cursoSelecionado?.turmaId || exportando) {
      return;
    }

    try {
      setExportando(true);
      setErroExportacao("");

      const { blob, nomeArquivo } = await baixarArquivo(`/Turmas/${cursoSelecionado.turmaId}/desempenho/exportar`);

      const urlObjeto = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlObjeto;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlObjeto);
      mostrarToast("Relatorio de desempenho gerado com sucesso.", "sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setErroExportacao(err.message || "Nao foi possivel exportar o desempenho agora.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="tela-progresso-professor">
      {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}

      {carregando ? (
        <p className="texto-vazio texto-vazio--central" role="status">Carregando progresso dos cursos...</p>
      ) : !cursoSelecionado ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Progresso</h2>
              <p className="cabecalho-pagina__subtitulo">Analise de progresso e desempenho dos meus cursos.</p>
            </div>
          </header>

          <GradeCursosProfessor
            cursos={cursosDesempenho.map((curso) => ({
              curso: cursoPorId.get(curso.cursoId) || { id: curso.cursoId, titulo: curso.cursoTitulo, descricao: "" },
              resumo: `${curso.totalAlunos} aluno${curso.totalAlunos === 1 ? "" : "s"} · ${curso.modulos.length} modulo${curso.modulos.length === 1 ? "" : "s"}`,
              rodapeEsquerda: `${curso.alunosAtivos} ativo${curso.alunosAtivos === 1 ? "" : "s"}`,
              badge: `Media ${formatGrade(curso.desempenhoMedio)}`,
              percentual: curso.progressoMedio
            }))}
            mensagemVazia="Voce ainda nao tem turmas atribuidas a nenhum curso."
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
            <h2 className="atividades-curso__titulo">{cursoSelecionado.cursoTitulo}</h2>
            <Botao disabled={exportando || !cursoSelecionado.turmaId} onClick={exportarDesempenho} variante="secundario">
              <TbDownload aria-hidden="true" size={16} /> {exportando ? "Gerando Excel..." : "Exportar desempenho"}
            </Botao>
          </header>

          {erroExportacao ? <InlineMessage tone="error">{erroExportacao}</InlineMessage> : null}

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
