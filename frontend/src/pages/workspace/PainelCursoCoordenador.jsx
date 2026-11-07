import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbArrowLeft,
  TbAward,
  TbChartBar,
  TbChevronDown,
  TbCircleCheck,
  TbDotsVertical,
  TbLayoutGrid,
  TbLock,
  TbLockOpen,
  TbPencil,
  TbPlus,
  TbTrophy,
  TbUsers
} from "react-icons/tb";
import BarraProgresso from "../../components/BarraProgresso.jsx";
import BlocoProfessoresCurso from "../../components/BlocoProfessoresCurso.jsx";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import DetalheModuloDesempenho from "../../components/DetalheModuloDesempenho.jsx";
import Insignia from "../../components/Insignia.jsx";
import ModaisModulo from "../../components/ModaisModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useModaisModulo } from "../../hooks/useModaisModulo.js";
import { useProfessoresCurso } from "../../hooks/useProfessoresCurso.js";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatGrade, formatPercent, normalizeTipoAvaliacao } from "../../lib/format.js";

const MODELO_ACOMPANHADO = 3;

function ordenarPorCriacao(moduloA, moduloB) {
  const dataA = new Date(moduloA.dataCriacao || 0).getTime();
  const dataB = new Date(moduloB.dataCriacao || 0).getTime();
  return dataA - dataB || Number(moduloA.id) - Number(moduloB.id);
}

/* Tela unica do curso do Coordenador (prompt "fluxo do coordenador: tela
   unica do curso"): Cursos -> curso -> modulos com detalhe de cada um ->
   progresso, tudo numa pagina so, sem abas separadas (que saem do menu do
   Coordenador, ver appConfig.js). Renderizada por SecaoCursos quando
   ehCoordenador e ha curso aberto - os modais de editar curso continuam la
   (modaisComuns). Busca o desempenho do curso aqui dentro (GET
   /Cursos/{id}/desempenho), independente do snapshot global. */
export default function PainelCursoCoordenador({
  curso,
  modulos,
  onEditarCurso,
  onEncerrarCurso,
  onReabrirCurso,
  onRefresh,
  onSessionExpired,
  onVoltar,
  professores,
  salvandoCurso
}) {
  const { mostrarToast } = useToast();
  const [desempenho, setDesempenho] = useState(null);
  const [carregandoDesempenho, setCarregandoDesempenho] = useState(true);
  const [erroDesempenho, setErroDesempenho] = useState("");
  const [tentativaRecarga, setTentativaRecarga] = useState(0);
  const [moduloAbertoId, setModuloAbertoId] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [avaliacoesCursoAbertas, setAvaliacoesCursoAbertas] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregandoDesempenho(true);
    setErroDesempenho("");

    apiRequest(`/Cursos/${curso.id}/desempenho`)
      .then((dados) => {
        if (ativo) {
          setDesempenho(dados);
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

        setErroDesempenho(err.message || "Nao foi possivel carregar o desempenho do curso agora.");
      })
      .finally(() => {
        if (ativo) {
          setCarregandoDesempenho(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [curso.id, onSessionExpired, tentativaRecarga]);

  function recarregarDesempenho() {
    setTentativaRecarga((atual) => atual + 1);
  }

  const modulosOrdenados = useMemo(
    () => modulos.filter((modulo) => Number(modulo.cursoId) === Number(curso.id)).slice().sort(ordenarPorCriacao),
    [curso.id, modulos]
  );

  const desempenhoPorModuloId = useMemo(
    () => new Map((desempenho?.modulos || []).map((modulo) => [modulo.moduloId, modulo])),
    [desempenho]
  );

  const modais = useModaisModulo({
    cursoFixoId: curso.id,
    mostrarToast,
    onSalvo: () => {
      onRefresh?.();
      recarregarDesempenho();
    },
    onSessionExpired
  });

  const professoresCurso = useProfessoresCurso({ cursoId: curso.id, mostrarToast, onRefresh, onSessionExpired, professores });

  useEffect(() => {
    if (menuAbertoId === null) {
      return undefined;
    }

    function fechar(event) {
      if (event.type === "keydown" && event.key !== "Escape") {
        return;
      }

      setMenuAbertoId(null);
    }

    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [menuAbertoId]);

  function alternarModulo(moduloId) {
    setModuloAbertoId((atual) => (atual === moduloId ? null : moduloId));
  }

  function abrirExclusaoModulo(modulo) {
    modais.abrirExclusaoModulo(modulo);
    setMenuAbertoId(null);
  }

  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;
  const avaliacoesSemModulo = desempenho?.avaliacoesSemModulo || [];

  return (
    <div className="conteudos-aluno">
      <nav aria-label="Navegacao dos cursos" className="atividades-curso__navegacao">
        <button className="atividades-curso__voltar" onClick={onVoltar} type="button">
          <TbArrowLeft aria-hidden="true" size={22} />
          Voltar para Cursos
        </button>
      </nav>

      <p aria-label="Trilha de navegacao" className="atividades-curso__meta">
        CodeRyse Academy › Cursos › {curso.titulo}
      </p>

      <header className="atividades-curso__cabecalho">
        <div>
          <h2 className="atividades-curso__titulo">{curso.titulo}</h2>
          <p className="atividades-curso__subtitulo">{curso.codigoRegistro || "Sem codigo"}</p>
          {curso.descricao ? <p className="texto-vazio">{curso.descricao}</p> : null}
        </div>
        {ehAcompanhado ? (
          <Insignia
            texto={curso.encerradoEm ? "Encerrado" : curso.concluidoPeloProfessorEm ? "Aguardando encerramento" : "Em andamento"}
          />
        ) : null}
      </header>

      <section aria-label="Acoes do curso" className="painel-secao">
        <div className="painel-secao__conteudo" style={{ display: "flex", flexWrap: "wrap", gap: "var(--espaco-sm)" }}>
          <Botao onClick={onEditarCurso} tamanho="pequeno" variante="secundario">
            <TbPencil aria-hidden="true" size={16} /> Editar curso
          </Botao>
          {ehAcompanhado && curso.concluidoPeloProfessorEm && !curso.encerradoEm ? (
            <Botao disabled={salvandoCurso} onClick={onEncerrarCurso} tamanho="pequeno" variante="primario">
              <TbLock aria-hidden="true" size={16} /> Encerrar curso
            </Botao>
          ) : null}
          {ehAcompanhado && curso.encerradoEm ? (
            <Botao disabled={salvandoCurso} onClick={onReabrirCurso} tamanho="pequeno" variante="secundario">
              <TbLockOpen aria-hidden="true" size={16} /> Reabrir curso
            </Botao>
          ) : null}
        </div>
      </section>

      <div className="grade-estatisticas">
        <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Alunos matriculados" valor={desempenho ? desempenho.totalAlunos : "—"} />
        <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio" valor={desempenho ? formatPercent(desempenho.progressoMedio) : "—"} />
        <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Concluiram o curso" valor={desempenho ? formatPercent(desempenho.percentualConclusao) : "—"} />
        <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbAward size={22} />} rotulo="Media geral" valor={desempenho ? formatGrade(desempenho.desempenhoMedio) : "—"} />
      </div>

      {erroDesempenho ? <InlineMessage tone="error">{erroDesempenho}</InlineMessage> : null}

      <section aria-label="Modulos do curso" className="painel-secao">
        <header className="atividades-curso__cabecalho">
          <h3 className="atividades-curso__titulo">Modulos ({modulosOrdenados.length})</h3>
          <Botao onClick={() => modais.abrirFormularioNovoModulo(curso.id)} tamanho="pequeno" variante="primario">
            <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
              <TbPlus aria-hidden="true" size={16} />
            </motion.span>{" "}
            Novo modulo
          </Botao>
        </header>

        {modulosOrdenados.length === 0 ? (
          <p className="texto-vazio" role="status">Nenhum modulo cadastrado neste curso.</p>
        ) : (
          <div className="atividades-curso__lista-modulos">
            {modulosOrdenados.map((modulo, indice) => {
              const aberto = moduloAbertoId === modulo.id;
              const idDetalhe = `modulo-coordenador-detalhe-${modulo.id}`;
              const desempenhoModulo = desempenhoPorModuloId.get(modulo.id) || null;
              const totalConteudos = desempenhoModulo ? desempenhoModulo.materiais.length : modulo.totalConteudos ?? 0;
              const totalAvaliacoes = desempenhoModulo ? desempenhoModulo.avaliacoes.length : modulo.totalAvaliacoes ?? 0;

              return (
                <section className="conteudos-modulo" key={modulo.id}>
                  <header className="conteudos-modulo__cabecalho">
                    <h3 className="conteudos-modulo__cabecalho-wrapper">
                      <button
                        aria-controls={idDetalhe}
                        aria-expanded={aberto}
                        className="conteudos-modulo__toggle"
                        onClick={() => alternarModulo(modulo.id)}
                        type="button"
                      >
                        <div className="conteudos-modulo__info">
                          <span aria-hidden="true" className="conteudos-modulo__icone">
                            <TbLayoutGrid size="1.4rem" />
                          </span>
                          <span className="conteudos-modulo__eyebrow">Modulo {String(indice + 1).padStart(2, "0")}</span>
                          <span className="conteudos-modulo__titulo">{modulo.titulo}</span>
                          <span className="conteudos-modulo__contagem">
                            {totalConteudos} conteudo{totalConteudos === 1 ? "" : "s"} · {totalAvaliacoes} avaliacao{totalAvaliacoes === 1 ? "" : "es"}
                          </span>
                        </div>
                        <div className="conteudos-modulo__progresso-wrapper" style={{ minWidth: "8rem" }}>
                          {desempenhoModulo ? <BarraProgresso percentual={desempenhoModulo.progressoMedio} /> : <span className="texto-vazio">—</span>}
                        </div>
                        <TbChevronDown
                          aria-hidden="true"
                          className={`conteudos-modulo__chevron${aberto ? " conteudos-modulo__chevron--aberto" : ""}`}
                          size="1.1rem"
                        />
                      </button>
                    </h3>

                    <div className="menu-contexto">
                      <button
                        aria-expanded={menuAbertoId === modulo.id}
                        aria-haspopup="true"
                        aria-label={`Opcoes para ${modulo.titulo}`}
                        className="menu-contexto__botao"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuAbertoId((atual) => (atual === modulo.id ? null : modulo.id));
                        }}
                        type="button"
                      >
                        <TbDotsVertical aria-hidden="true" size={18} />
                      </button>
                      {menuAbertoId === modulo.id ? (
                        <ul className="menu-contexto__lista">
                          <li>
                            <button onClick={() => modais.abrirEdicaoModulo(modulo)} type="button">
                              Editar
                            </button>
                          </li>
                          <li>
                            <button className="menu-item--perigo" onClick={() => abrirExclusaoModulo(modulo)} type="button">
                              Excluir
                            </button>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  </header>

                  <AnimatePresence initial={false}>
                    {aberto ? (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        id={idDetalhe}
                        initial={{ height: 0, opacity: 0 }}
                        key={`detalhe-modulo-coordenador-${modulo.id}`}
                        style={{ overflow: "hidden" }}
                        transition={{ duration: 0.24, ease: "easeInOut" }}
                      >
                        {desempenhoModulo ? (
                          <DetalheModuloDesempenho contextoCoordenador modulo={desempenhoModulo} separarGrupos />
                        ) : (
                          <p className="texto-vazio" role="status">
                            {carregandoDesempenho ? "Carregando desempenho do modulo..." : "Nao foi possivel carregar o desempenho deste modulo agora."}
                          </p>
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        )}
      </section>

      {avaliacoesSemModulo.length > 0 ? (
        <section aria-label="Avaliacoes do curso" className="conteudos-modulo">
          <header className="conteudos-modulo__cabecalho">
            <h3 className="conteudos-modulo__cabecalho-wrapper">
              <button
                aria-controls="avaliacoes-curso-coordenador-detalhe"
                aria-expanded={avaliacoesCursoAbertas}
                className="conteudos-modulo__toggle"
                onClick={() => setAvaliacoesCursoAbertas((atual) => !atual)}
                type="button"
              >
                <div className="conteudos-modulo__info">
                  <span aria-hidden="true" className="conteudos-modulo__icone">
                    <TbTrophy size="1.4rem" />
                  </span>
                  <span className="conteudos-modulo__titulo">Avaliacoes do curso</span>
                  <span className="conteudos-modulo__contagem">
                    {avaliacoesSemModulo.length} avaliacao{avaliacoesSemModulo.length === 1 ? "" : "es"}
                  </span>
                </div>
                <TbChevronDown
                  aria-hidden="true"
                  className={`conteudos-modulo__chevron${avaliacoesCursoAbertas ? " conteudos-modulo__chevron--aberto" : ""}`}
                  size="1.1rem"
                />
              </button>
            </h3>
          </header>

          <AnimatePresence initial={false}>
            {avaliacoesCursoAbertas ? (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                id="avaliacoes-curso-coordenador-detalhe"
                initial={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden" }}
                transition={{ duration: 0.24, ease: "easeInOut" }}
              >
                <p className="atividades-curso__meta conteudos-modulo__descricao">Provas e exercicios vinculados direto ao curso, sem modulo.</p>
                <ul aria-label="Avaliacoes vinculadas direto ao curso" className="atividades-curso__lista" role="list">
                  {avaliacoesSemModulo.map((avaliacao) => (
                    <li className="atividades-curso__item atividades-curso__item--quiz" key={`avaliacao-curso-${avaliacao.avaliacaoId}`}>
                      <div className="atividades-curso__linha">
                        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
                          <TbTrophy aria-hidden="true" size="1.75rem" />
                        </span>
                        <div className="atividades-curso__corpo">
                          <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
                          <p className="atividades-curso__meta">
                            <span>{normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)}</span>
                          </p>
                        </div>
                        <div className="atividades-curso__metrica">
                          {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"} · Media {formatGrade(avaliacao.mediaNota)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      ) : null}

      <section aria-label="Professores do curso" className="painel-secao">
        <header className="atividades-curso__cabecalho">
          <h3 className="atividades-curso__titulo">Professores</h3>
        </header>
        <BlocoProfessoresCurso confirmarDesvinculo titulo={`Professores de ${curso.titulo}`} {...professoresCurso} />
      </section>

      <ModaisModulo
        cursoFixo={{ titulo: curso.titulo }}
        dadosFormulario={modais.dadosFormulario}
        formularioAberto={modais.formularioAberto}
        mensagemExclusao={modais.mensagemExclusao}
        mensagemFormulario={modais.mensagemFormulario}
        moduloEmEdicaoId={modais.moduloEmEdicaoId}
        moduloParaExcluir={modais.moduloParaExcluir}
        onConfirmarExclusao={modais.confirmarExclusao}
        onFecharExclusao={modais.fecharExclusaoModulo}
        onFecharFormulario={modais.fecharFormulario}
        onSalvarModulo={modais.salvarModulo}
        salvando={modais.salvando}
        setDadosFormulario={modais.setDadosFormulario}
      />
    </div>
  );
}
