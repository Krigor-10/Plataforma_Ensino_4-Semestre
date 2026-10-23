import { useEffect, useMemo, useState } from "react";
import { TbArrowLeft, TbPlus, TbUsers, TbX } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import SelectUsuario from "../../components/SelectUsuario.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";

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
  const [professoresDoCurso, setProfessoresDoCurso] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [professorParaVincular, setProfessorParaVincular] = useState(null);
  const [vinculando, setVinculando] = useState(false);
  const [desvinculandoId, setDesvinculandoId] = useState(null);

  const cursosOrdenados = useMemo(
    () => [...cursoPorId.values()].sort((left, right) => String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR")),
    [cursoPorId]
  );
  const professoresOrdenados = useMemo(
    () => [...professores].sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [professores]
  );

  const cursoSelecionado = cursoSelecionadoId ? cursoPorId.get(cursoSelecionadoId) || null : null;
  const cursoEmFocoId = Number(cursoEmFoco?.cursoId || 0);

  useEffect(() => {
    if (!cursoEmFocoId) {
      return;
    }

    setCursoSelecionadoId(cursoEmFocoId);
    onCursoEmFocoAplicado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEmFocoId]);

  useEffect(() => {
    if (!cursoSelecionadoId) {
      setProfessoresDoCurso([]);
      return undefined;
    }

    let ativo = true;
    setCarregando(true);
    setErro("");

    apiRequest(`/Cursos/${cursoSelecionadoId}/professores`)
      .then((dados) => {
        if (ativo) {
          setProfessoresDoCurso(dados);
        }
      })
      .catch((err) => {
        if (!ativo) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar os professores deste curso agora.");
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [cursoSelecionadoId, onSessionExpired]);

  const idsVinculados = useMemo(() => new Set(professoresDoCurso.map((professor) => professor.id)), [professoresDoCurso]);
  const professoresDisponiveisParaVincular = useMemo(
    () => professoresOrdenados.filter((professor) => !idsVinculados.has(professor.id)),
    [professoresOrdenados, idsVinculados]
  );

  function selecionarCurso(cursoId) {
    setCursoSelecionadoId(cursoId);
  }

  function voltarParaLista() {
    setCursoSelecionadoId(null);
    setProfessorParaVincular(null);
  }

  async function vincularProfessor() {
    if (!professorParaVincular) {
      return;
    }

    try {
      setVinculando(true);

      await apiRequest(`/Cursos/${cursoSelecionadoId}/professores/${professorParaVincular}`, { method: "POST" });

      const atualizados = await apiRequest(`/Cursos/${cursoSelecionadoId}/professores`);
      setProfessoresDoCurso(atualizados);
      setProfessorParaVincular(null);
      mostrarToast("Professor vinculado ao curso com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel vincular o professor agora.", "erro");
    } finally {
      setVinculando(false);
    }
  }

  async function desvincularProfessor(professorId) {
    try {
      setDesvinculandoId(professorId);

      await apiRequest(`/Cursos/${cursoSelecionadoId}/professores/${professorId}`, { method: "DELETE" });

      setProfessoresDoCurso((atuais) => atuais.filter((professor) => professor.id !== professorId));
      mostrarToast("Professor desvinculado do curso com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel desvincular o professor agora.", "erro");
    } finally {
      setDesvinculandoId(null);
    }
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
          <nav aria-label="Navegacao dos cursos" className="atividades-curso__navegacao">
            <button className="atividades-curso__voltar" onClick={voltarParaLista} type="button">
              <TbArrowLeft aria-hidden="true" size={22} />
              Voltar para Professores por curso
            </button>
          </nav>

          <header className="atividades-curso__cabecalho">
            <div>
              <h2 className="atividades-curso__titulo">{cursoSelecionado.titulo}</h2>
              <p className="atividades-curso__subtitulo">Professores vinculados a este curso</p>
            </div>
          </header>

          {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}

          <div className="grade-estatisticas">
            <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Professores vinculados" valor={professoresDoCurso.length} />
          </div>

          <div className="campo" style={{ marginTop: "var(--espaco-md)" }}>
            <label className="campo__rotulo" htmlFor="selecionar-professor-vincular">Vincular professor</label>
            <div style={{ display: "flex", gap: "var(--espaco-sm)" }}>
              <SelectUsuario
                id="selecionar-professor-vincular"
                onChange={setProfessorParaVincular}
                opcoes={professoresDisponiveisParaVincular}
                placeholder={professoresDisponiveisParaVincular.length ? "Selecione um professor" : "Todos os professores ja vinculados"}
                value={professorParaVincular}
              />
              <Botao disabled={!professorParaVincular || vinculando} onClick={vincularProfessor} tamanho="pequeno" variante="primario">
                <TbPlus aria-hidden="true" size={15} /> {vinculando ? "Vinculando..." : "Vincular"}
              </Botao>
            </div>
          </div>

          {carregando ? (
            <p className="texto-vazio texto-vazio--central" role="status">Carregando professores...</p>
          ) : professoresDoCurso.length === 0 ? (
            <p className="texto-vazio">Nenhum professor vinculado a este curso ainda.</p>
          ) : (
            <ul aria-label={`Professores de ${cursoSelecionado.titulo}`} className="slide-alunos__lista" role="list">
              {professoresDoCurso.map((professor) => (
                <li className="slide-alunos__linha" key={professor.id}>
                  <div className="slide-alunos__linha-info">
                    <strong className="slide-alunos__linha-nome">{professor.nome}</strong>
                  </div>
                  <Botao
                    disabled={desvinculandoId === professor.id}
                    onClick={() => desvincularProfessor(professor.id)}
                    tamanho="pequeno"
                    variante="perigo"
                  >
                    <TbX aria-hidden="true" size={14} /> {desvinculandoId === professor.id ? "Removendo..." : "Desvincular"}
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
