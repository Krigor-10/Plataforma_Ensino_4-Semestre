import { useEffect, useMemo, useState } from "react";
import { TbUsers } from "react-icons/tb";
import BlocoProfessoresCurso from "../../components/BlocoProfessoresCurso.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useProfessoresCurso } from "../../hooks/useProfessoresCurso.js";
import { useToast } from "../../hooks/useToast.jsx";

/* PROFESSORES POR CURSO — gestao do vinculo Professor<->Curso (N:N, tabela
   ProfessoresCursos). Substitui a antiga SecaoTurmas.jsx: desde que a
   matricula parou de depender de Turma (Fase B, Rodada 1), Turma deixou de
   ser o vinculo relevante entre professor e curso — o vinculo de verdade
   agora e ProfessorCurso, gerenciado via POST/DELETE
   /Cursos/{id}/professores/{professorId} (endpoints da Rodada 1, so ficaram
   sem tela ate aqui). */
export function SecaoProfessoresCurso({ cursoEmFoco, cursoPorId, onCursoEmFocoAplicado, onRefresh, onSessionExpired, professores = [] }) {
  const { mostrarToast } = useToast();
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);

  const cursosOrdenados = useMemo(
    () => [...cursoPorId.values()].sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR")),
    [cursoPorId]
  );

  const cursoSelecionado = cursoSelecionadoId ? cursoPorId.get(cursoSelecionadoId) || null : null;
  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);
  const professoresCurso = useProfessoresCurso({ cursoId: cursoSelecionadoId, mostrarToast, onRefresh, onSessionExpired, professores });

  useEffect(() => {
    if (!cursoEmFocoId) {
      return;
    }

    setCursoSelecionadoId(cursoEmFocoId);
    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId]);

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(cursoId);
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
    professoresCurso.setProfessorParaVincular(null);
  }

  return (
    <div className="tela-turmas">
      {!cursoSelecionado ? (
        <>
          <header className="cabecalho-pagina">
            <div>
              <h2 className="cabecalho-pagina__titulo">Professores por curso</h2>
              <p className="cabecalho-pagina__subtitulo">Escolha um curso para gerenciar quais professores lecionam nele.</p>
            </div>
          </header>

          <GradeCursosProfessor
            cursos={cursosOrdenados.map((curso) => ({ curso, resumo: curso.codigoRegistro || "Sem codigo" }))}
            mensagemVazia="Nenhum curso cadastrado."
            onSelecionar={selecionarCurso}
          />
        </>
      ) : (
        <>
          <BotaoVoltar destino="Professores por curso" onClick={voltarParaLista} />

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{cursoSelecionado.titulo}</h2>
              <p className="atividades-curso__subtitulo">Professores vinculados a este curso</p>
            </div>
          </header>

          {professoresCurso.erro ? <InlineMessage tone="error">{professoresCurso.erro}</InlineMessage> : null}

          <div className="grade-estatisticas">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Professores vinculados" valor={professoresCurso.professoresDoCurso.length} />
          </div>

          <BlocoProfessoresCurso titulo={`Professores de ${cursoSelecionado.titulo}`} {...professoresCurso} />
        </>
      )}
    </div>
  );
}
