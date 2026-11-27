import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbAward,
  TbCheck,
  TbChevronDown,
  TbClock,
  TbDotsVertical,
  TbHelpCircle,
  TbPencil,
  TbPlus,
  TbRepeat,
  TbSparkles,
  TbTarget,
  TbTrophy,
  TbX
} from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";

const MOLA_ICONE = { type: "spring", stiffness: 400, damping: 18 };
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import GradeCursosProfessor from "../../components/GradeCursosProfessor.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatGrade, normalizePublicationStatus } from "../../lib/format.js";
import { cursoTravadoParaEdicao, motivoTravaEdicao } from "../../lib/situacaoCurso.js";
import { montarPayloadAvaliacao } from "../../lib/trilhaConteudos.js";
import { AssistenteGeracaoIA } from "./AssistenteGeracaoIA.jsx";
import { AssistenteQuizAvaliacao } from "./AssistenteQuizAvaliacao.jsx";

const STATUS_PUBLICADO = 2;
const STATUS_ARQUIVADO = 3;
const CAMPOS_NUMERICOS_AJUSTES = new Set(["tentativasPermitidas", "tempoLimiteMinutos"]);

// Rascunho do modal "Ajustes rapidos": tudo em texto (valor dos inputs),
// montado a partir do que esta salvo. tempoLimiteMinutos vazio = sem limite.
function montarRascunhoAjustes(avaliacao) {
  return {
    titulo: avaliacao.titulo || "",
    tentativasPermitidas: String(avaliacao.tentativasPermitidas ?? 1),
    tempoLimiteMinutos: avaliacao.tempoLimiteMinutos ? String(avaliacao.tempoLimiteMinutos) : ""
  };
}

// Numero digitado de outro jeito ("10" x "10.0") nao conta como alteracao.
function normalizarValorAjuste(campo, valor) {
  const texto = String(valor ?? "").trim();
  if (!CAMPOS_NUMERICOS_AJUSTES.has(campo) || texto === "") {
    return texto;
  }
  const numero = Number(texto);
  return Number.isFinite(numero) ? String(numero) : texto;
}

function camposAlteradosNoRascunho(avaliacao, rascunho) {
  const original = montarRascunhoAjustes(avaliacao);
  return new Set(
    Object.keys(original).filter(
      (campo) => normalizarValorAjuste(campo, rascunho[campo]) !== normalizarValorAjuste(campo, original[campo])
    )
  );
}

// Mesmas regras do servidor (AvaliacaoService) e do formulario completo
// (AssistenteQuizAvaliacao), com mensagem clara em vez de descartar calado.
function validarRascunhoAjustes(rascunho) {
  const titulo = rascunho.titulo.trim();
  if (!titulo) {
    return { erro: "Informe o título da avaliação." };
  }

  const tentativasPermitidas = Number(rascunho.tentativasPermitidas);
  if (!Number.isInteger(tentativasPermitidas) || tentativasPermitidas < 1) {
    return { erro: "Tentativas permitidas: informe um número inteiro maior que zero." };
  }

  const tempoTexto = String(rascunho.tempoLimiteMinutos).trim();
  const tempoLimiteMinutos = tempoTexto === "" ? null : Number(tempoTexto);
  if (tempoLimiteMinutos !== null && (!Number.isInteger(tempoLimiteMinutos) || tempoLimiteMinutos < 1)) {
    return { erro: "Tempo limite: deixe vazio para não ter limite ou informe os minutos (número inteiro maior que zero)." };
  }

  return { valores: { titulo, tentativasPermitidas, tempoLimiteMinutos } };
}

export function SecaoAvaliacoesProfessor({ avaliacoes, conteudos = [], cursoIdSelecionado = null, cursos, modulos, onNavigate, onRefresh, onSessionExpired }) {
  const { mostrarToast } = useToast();
  // Assistente de criacao/edicao de avaliacao/quiz — componente compartilhado
  // (AssistenteQuizAvaliacao.jsx), tambem montado direto por
  // SecaoConteudosProfessor.jsx no botao "Adicionar/Editar quiz" (sem
  // navegar pra esta tela, ver historico do arquivo).
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [escolhaNovaAvaliacaoAberta, setEscolhaNovaAvaliacaoAberta] = useState(false);
  const [geracaoIaAberta, setGeracaoIaAberta] = useState(false);
  const [avaliacaoParaEditar, setAvaliacaoParaEditar] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const [mensagemExclusaoAvaliacao, setMensagemExclusaoAvaliacao] = useState("");
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  /* Modal "Ajustes rapidos" (docs/auditorias/AUDITORIA-PENDENCIAS-REGRAS-
     2026-11-26.md, itens 6 e 7, decisoes E1/E2): os campos editam um
     RASCUNHO local - nada vai pro servidor ate o "Salvar". Fechar/X com
     alteracao pendente pede "Descartar alteracoes?" (antes cada campo se
     salvava sozinho no blur, entao clicar no X acabava salvando). O toggle
     Publicado/Arquivado continua sendo acao imediata, com estado de envio e
     mensagem de erro. */
  const [avaliacaoDetalhe, setAvaliacaoDetalhe] = useState(null);
  const [rascunhoDetalhe, setRascunhoDetalhe] = useState(null);
  const [mensagemDetalhe, setMensagemDetalhe] = useState({ tone: "", message: "" });
  const [salvandoDetalhe, setSalvandoDetalhe] = useState(false);
  const [alternandoStatusDetalhe, setAlternandoStatusDetalhe] = useState(false);
  const [confirmandoDescarteDetalhe, setConfirmandoDescarteDetalhe] = useState(false);

  /* Media de nota por avaliacao e informacao secundaria (nao existe no DTO de
     /Avaliacoes) - reaproveita o endpoint de desempenho por curso ja usado em
     SecaoTurmasProfessor.jsx (GET /Cursos/desempenho, escopado por
     ProfessorCurso) em vez de criar uma nova agregacao no backend. Antes usava
     /Turmas/desempenho (escopado por Turma.ProfessorId) - professor vinculado
     so via "Professores por curso" (sem Turma) sempre via essa coluna em
     branco, ver pendencia_fase_b_remocao_turma na memoria. */
  const [desempenhoAvaliacoes, setDesempenhoAvaliacoes] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregarDesempenho() {
      try {
        const cursosComDesempenho = await apiRequest("/Cursos/desempenho");
        if (ativo) {
          setDesempenhoAvaliacoes(
            cursosComDesempenho.flatMap((curso) => [
              ...curso.modulos.flatMap((modulo) => modulo.avaliacoes),
              ...curso.avaliacoesSemModulo
            ])
          );
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
      }
    }

    carregarDesempenho();
    return () => {
      ativo = false;
    };
  }, [onSessionExpired]);

  const mediaNotaPorAvaliacaoId = useMemo(
    () => new Map(desempenhoAvaliacoes.map((item) => [item.avaliacaoId, item.mediaNota])),
    [desempenhoAvaliacoes]
  );

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

  const modulosDoProfessor = useMemo(
    () => [...modulos].sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR")),
    [modulos]
  );

  const modulosPorCursoId = useMemo(() => {
    const agrupados = new Map();
    modulosDoProfessor.forEach((modulo) => {
      const atuais = agrupados.get(modulo.cursoId) || [];
      atuais.push(modulo);
      agrupados.set(modulo.cursoId, atuais);
    });
    return agrupados;
  }, [modulosDoProfessor]);

  /* "Meus cursos" vem direto do prop cursos (GET /Cursos/meus, escopado pelo
     vinculo ProfessorCurso) — mesma correcao aplicada na Trilha de Conteudos
     (ver SecaoConteudosProfessor.jsx e pendencia_fase_b_remocao_turma). */
  const cursosDoProfessor = useMemo(() => {
    return [...cursos]
      .map((curso) => {
        // Quiz (tipoAvaliacao === 1) nao e avaliacao formal — fica exclusivo da
        // trilha de Conteudos (ver SecaoConteudosProfessor.jsx), nao entra aqui.
        const avaliacoesDoCurso = avaliacoes.filter(
          (avaliacao) => avaliacao.cursoId === curso.id && Number(avaliacao.tipoAvaliacao) !== 1
        );

        return {
          curso,
          totalAvaliacoes: avaliacoesDoCurso.length,
          totalPublicadas: avaliacoesDoCurso.filter((avaliacao) => Number(avaliacao.statusPublicacao) === 2).length
        };
      })
      .sort((left, right) => left.curso.titulo.localeCompare(right.curso.titulo, "pt-BR"));
  }, [avaliacoes, cursos]);

  const cursoAtivo = useMemo(
    () => (cursoIdSelecionado ? cursosDoProfessor.find((entrada) => entrada.curso.id === cursoIdSelecionado) || null : null),
    [cursoIdSelecionado, cursosDoProfessor]
  );

  const avaliacoesDoCursoAtivo = useMemo(
    () =>
      cursoAtivo
        ? [...avaliacoes]
            .filter(
              (avaliacao) => avaliacao.cursoId === cursoAtivo.curso.id && Number(avaliacao.tipoAvaliacao) !== 1
            )
            .sort((left, right) => (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"))
        : [],
    [avaliacoes, cursoAtivo]
  );


  const modulosDoCursoAtivo = useMemo(
    () => (cursoAtivo ? modulosPorCursoId.get(cursoAtivo.curso.id) || [] : []),
    [cursoAtivo, modulosPorCursoId]
  );

  // Mesma regra de Curso.AceitaEdicao (backend, pacote 7 da auditoria de
  // 26/11): publicado, concluido ou encerrado trava.
  const edicaoTravadaCursoAtivo = cursoTravadoParaEdicao(cursoAtivo?.curso);

  function abrirCurso(cursoId) {
    onNavigate?.(`/app/avaliacoes/${cursoId}`);
  }

  function voltarParaCursos() {
    onNavigate?.("/app/avaliacoes");
  }

  function abrirEscolhaNovaAvaliacao() {
    setEscolhaNovaAvaliacaoAberta(true);
  }

  function fecharEscolhaNovaAvaliacao() {
    setEscolhaNovaAvaliacaoAberta(false);
  }

  function escolherCriacaoManual() {
    setEscolhaNovaAvaliacaoAberta(false);
    setAvaliacaoParaEditar(null);
    setAssistenteAberto(true);
  }

  function escolherGeracaoIa() {
    setEscolhaNovaAvaliacaoAberta(false);
    setGeracaoIaAberta(true);
  }

  function fecharGeracaoIa() {
    setGeracaoIaAberta(false);
  }

  function abrirEdicaoAvaliacao(avaliacao) {
    setMenuAbertoId(null);
    setAvaliacaoParaEditar(avaliacao);
    setAssistenteAberto(true);
  }

  function fecharAssistente() {
    setAssistenteAberto(false);
    setAvaliacaoParaEditar(null);
  }

  async function confirmarExclusaoAvaliacao() {
    if (!avaliacaoParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusaoAvaliacao("");

    try {
      const resultado = await apiRequest(`/Avaliacoes/${avaliacaoParaExcluir.id}`, { method: "DELETE" });

      if (avaliacaoParaEditar?.id === avaliacaoParaExcluir.id) {
        fecharAssistente();
      }

      setAvaliacaoParaExcluir(null);
      if (resultado?.arquivado) {
        mostrarToast(
          "Esta avaliacao ja tem tentativa de aluno registrada, por isso foi arquivada em vez de excluida definitivamente.",
          "sucesso",
          7000
        );
      } else {
        mostrarToast("Avaliacao excluida com sucesso.", "sucesso");
      }
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemExclusaoAvaliacao(err.message || "Nao foi possivel excluir a avaliacao agora.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirDetalheAvaliacao(avaliacao) {
    setAvaliacaoDetalhe(avaliacao);
    setRascunhoDetalhe(montarRascunhoAjustes(avaliacao));
    setMensagemDetalhe({ tone: "", message: "" });
    setConfirmandoDescarteDetalhe(false);
    setMenuAbertoId(null);
  }

  function fecharDetalheSemPerguntar() {
    setAvaliacaoDetalhe(null);
    setRascunhoDetalhe(null);
    setMensagemDetalhe({ tone: "", message: "" });
    setConfirmandoDescarteDetalhe(false);
  }

  const detalheTemAlteracaoPendente =
    Boolean(avaliacaoDetalhe && rascunhoDetalhe) && camposAlteradosNoRascunho(avaliacaoDetalhe, rascunhoDetalhe).size > 0;

  // X, "Fechar" e Escape passam por aqui. Com alteracao pendente, a primeira
  // tentativa so pede confirmacao (no rodape do proprio modal, sem empilhar
  // outro Modal - dois Escape listeners fechariam os dois de uma vez); a
  // segunda (Escape de novo) volta pra edicao.
  function solicitarFechamentoDetalhe() {
    if (salvandoDetalhe || alternandoStatusDetalhe) {
      return;
    }
    if (confirmandoDescarteDetalhe) {
      setConfirmandoDescarteDetalhe(false);
      return;
    }
    if (detalheTemAlteracaoPendente) {
      setConfirmandoDescarteDetalhe(true);
      return;
    }
    fecharDetalheSemPerguntar();
  }

  function atualizarCampoRascunho(evento) {
    const { name, value } = evento.target;
    setRascunhoDetalhe((atual) => ({ ...atual, [name]: value }));
    setConfirmandoDescarteDetalhe(false);
    if (mensagemDetalhe.message) {
      setMensagemDetalhe({ tone: "", message: "" });
    }
  }

  async function salvarAjustesDetalhe(evento) {
    evento?.preventDefault();
    if (!avaliacaoDetalhe || salvandoDetalhe) {
      return;
    }

    const validacao = validarRascunhoAjustes(rascunhoDetalhe);
    if (validacao.erro) {
      setMensagemDetalhe({ tone: "error", message: validacao.erro });
      return;
    }

    setSalvandoDetalhe(true);
    setMensagemDetalhe({ tone: "", message: "" });

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoDetalhe.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAvaliacao(avaliacaoDetalhe, validacao.valores))
      });
      const avaliacaoAtualizada = { ...avaliacaoDetalhe, ...validacao.valores };
      setAvaliacaoDetalhe(avaliacaoAtualizada);
      setRascunhoDetalhe(montarRascunhoAjustes(avaliacaoAtualizada));
      setConfirmandoDescarteDetalhe(false);
      mostrarToast("Avaliação atualizada.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setMensagemDetalhe({ tone: "error", message: err.message || "Não foi possível salvar a avaliação agora." });
    } finally {
      setSalvandoDetalhe(false);
    }
  }

  async function alternarStatusDetalhe() {
    if (!avaliacaoDetalhe || alternandoStatusDetalhe || salvandoDetalhe) {
      return;
    }

    if (detalheTemAlteracaoPendente) {
      setMensagemDetalhe({ tone: "warning", message: "Salve ou descarte as alterações antes de publicar ou arquivar." });
      return;
    }

    const statusAnterior = avaliacaoDetalhe.statusPublicacao;
    const proximoStatus = Number(statusAnterior) === STATUS_PUBLICADO ? STATUS_ARQUIVADO : STATUS_PUBLICADO;

    setAlternandoStatusDetalhe(true);
    setMensagemDetalhe({ tone: "", message: "" });
    setAvaliacaoDetalhe((atual) => ({ ...atual, statusPublicacao: proximoStatus }));

    try {
      await apiRequest(`/Avaliacoes/${avaliacaoDetalhe.id}`, {
        method: "PUT",
        body: JSON.stringify(montarPayloadAvaliacao(avaliacaoDetalhe, { statusPublicacao: proximoStatus }))
      });
      mostrarToast(proximoStatus === STATUS_PUBLICADO ? "Avaliação publicada." : "Avaliação arquivada.", "sucesso");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }

      setAvaliacaoDetalhe((atual) => ({ ...atual, statusPublicacao: statusAnterior }));
      setMensagemDetalhe({
        tone: "error",
        message: err.message || "Não foi possível alterar o status da avaliação agora."
      });
    } finally {
      setAlternandoStatusDetalhe(false);
    }
  }

  return (
    <div className="tela-avaliacoes tela-avaliacoes-professor">
      {!cursoAtivo ? (
        <GradeCursosProfessor
          cursos={cursosDoProfessor.map(({ curso, totalAvaliacoes, totalPublicadas }) => ({
            curso,
            resumo: `${totalAvaliacoes} avaliaca${totalAvaliacoes === 1 ? "o" : "oes"}`,
            rodapeEsquerda: `${totalPublicadas} publicada${totalPublicadas === 1 ? "" : "s"}`
          }))}
          mensagemVazia="Voce ainda nao esta vinculado a nenhum curso."
          onSelecionar={abrirCurso}
        />
      ) : (
        <>
          <BotaoVoltar destino="Avaliações" onClick={voltarParaCursos} />

          <header className="atividades-curso__cabecalho">
            <h2 className="atividades-curso__titulo">{cursoAtivo.curso.titulo}</h2>
            {!edicaoTravadaCursoAtivo ? (
              <Botao onClick={abrirEscolhaNovaAvaliacao} variante="primario">
                <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                  <TbPlus aria-hidden="true" size={18} />
                </motion.span>{" "}
                Nova avaliacao
              </Botao>
            ) : null}
          </header>

          {edicaoTravadaCursoAtivo ? (
            <InlineMessage tone="warning">
              {motivoTravaEdicao(cursoAtivo.curso)}
            </InlineMessage>
          ) : null}

          <SlideAvaliacoes
            avaliacoes={avaliacoesDoCursoAtivo}
            edicaoTravada={edicaoTravadaCursoAtivo}
            mediaNotaPorAvaliacaoId={mediaNotaPorAvaliacaoId}
            menuAbertoId={menuAbertoId}
            onEditar={abrirEdicaoAvaliacao}
            onExcluir={(avaliacao) => {
              setAvaliacaoParaExcluir(avaliacao);
              setMensagemExclusaoAvaliacao("");
              setMenuAbertoId(null);
            }}
            onToggleMenu={(id) => setMenuAbertoId((atual) => (atual === id ? null : id))}
            onVerDetalhes={abrirDetalheAvaliacao}
          />
        </>
      )}

      {avaliacaoDetalhe && rascunhoDetalhe ? (
        <ModalAjustesRapidos
          alternandoStatus={alternandoStatusDetalhe}
          avaliacao={avaliacaoDetalhe}
          camposAlterados={camposAlteradosNoRascunho(avaliacaoDetalhe, rascunhoDetalhe)}
          confirmandoDescarte={confirmandoDescarteDetalhe}
          mensagem={mensagemDetalhe}
          onAlterarCampo={atualizarCampoRascunho}
          onAlternarStatus={alternarStatusDetalhe}
          onContinuarEditando={() => setConfirmandoDescarteDetalhe(false)}
          onDescartar={fecharDetalheSemPerguntar}
          onEditarQuestoes={() => {
            const alvo = avaliacaoDetalhe;
            fecharDetalheSemPerguntar();
            abrirEdicaoAvaliacao(alvo);
          }}
          onExcluir={() => {
            setAvaliacaoParaExcluir(avaliacaoDetalhe);
            setMensagemExclusaoAvaliacao("");
            fecharDetalheSemPerguntar();
          }}
          onFechar={solicitarFechamentoDetalhe}
          onSalvar={salvarAjustesDetalhe}
          rascunho={rascunhoDetalhe}
          salvando={salvandoDetalhe}
        />
      ) : null}

      {avaliacaoParaExcluir ? (
        <Modal
          onFechar={() => setAvaliacaoParaExcluir(null)}
          titulo="Excluir avaliacao"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={() => setAvaliacaoParaExcluir(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} onClick={confirmarExclusaoAvaliacao} variante="sucesso">
                <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusao"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: mensagemExclusaoAvaliacao ? "var(--espaco-md)" : 0 }}>
            Deseja excluir a avaliacao <strong>{avaliacaoParaExcluir.titulo}</strong>? Esta acao nao pode ser desfeita.
          </p>
          {mensagemExclusaoAvaliacao ? <InlineMessage tone="error">{mensagemExclusaoAvaliacao}</InlineMessage> : null}
        </Modal>
      ) : null}

      {assistenteAberto ? (
        <AssistenteQuizAvaliacao
          avaliacaoParaEditar={avaliacaoParaEditar}
          conteudos={conteudos}
          cursoAtivo={cursoAtivo}
          modulosDisponiveis={modulosDoCursoAtivo}
          onFechar={fecharAssistente}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

      {escolhaNovaAvaliacaoAberta ? (
        <Modal onFechar={fecharEscolhaNovaAvaliacao} titulo="Nova avaliacao">
          <div className="gerar-ia__escolha">
            <button className="gerar-ia__escolha-cartao" onClick={escolherCriacaoManual} type="button">
              <span aria-hidden="true" className="gerar-ia__escolha-icone">
                <TbPencil size={22} />
              </span>
              <span className="gerar-ia__escolha-titulo">Criar manualmente</span>
              <span className="gerar-ia__escolha-descricao">Monte a avaliacao do zero, cadastrando cada questao voce mesmo.</span>
            </button>
            <button className="gerar-ia__escolha-cartao" onClick={escolherGeracaoIa} type="button">
              <span aria-hidden="true" className="gerar-ia__escolha-icone">
                <TbSparkles size={22} />
              </span>
              <span className="gerar-ia__escolha-titulo">Gerar com IA</span>
              <span className="gerar-ia__escolha-descricao">Envie um PDF ou DOCX e revise as questoes que a IA sugerir a partir dele.</span>
            </button>
          </div>
        </Modal>
      ) : null}

      {geracaoIaAberta ? (
        <AssistenteGeracaoIA cursoAtivo={cursoAtivo} onFechar={fecharGeracaoIa} onRefresh={onRefresh} onSessionExpired={onSessionExpired} />
      ) : null}

    </div>
  );
}

/* Avaliacoes pertencem diretamente ao curso (via CursoId) - avaliacoesDoCursoAtivo
   ja filtra por curso, sem passar por modulos/conteudos. O card do curso
   (GradeCursosProfessor) continua sendo a porta de entrada; isto so desenha o
   conteudo depois que um curso ja foi acessado. Cada avaliacao vira seu proprio
   accordion (mesmo padrao visual/interacao do cabecalho de modulo em
   SecaoConteudosProfessor.jsx), com so uma aberta por vez; o menu "..." (Ver
   detalhes/Editar/Excluir) fica ao lado do cabecalho, fora do botao de toggle. */
/* Modal "Ajustes rapidos da avaliacao" (Professor > Avaliacoes) - decisao
   E1 da auditoria de 26/11 (imagem docs/auditorias/bloco2-modal-ajustes-
   opcoes.png, opcao A): formulario com todos os campos editaveis, borda de
   aviso no que mudou e nao foi salvo, "Salvar" grava tudo num PUT so.
   Fechar/X nunca salvam: com alteracao pendente, o rodape vira a pergunta
   "Descartar alteracoes?". O toggle (decisao E2) age na hora, travado
   durante o envio. Estado e chamadas ficam em SecaoAvaliacoesProfessor -
   este componente so desenha. */
function ModalAjustesRapidos({
  alternandoStatus,
  avaliacao,
  camposAlterados,
  confirmandoDescarte,
  mensagem,
  onAlterarCampo,
  onAlternarStatus,
  onContinuarEditando,
  onDescartar,
  onEditarQuestoes,
  onExcluir,
  onFechar,
  onSalvar,
  rascunho,
  salvando
}) {
  const ocupado = salvando || alternandoStatus;
  const publicado = Number(avaliacao.statusPublicacao) === STATUS_PUBLICADO;
  const temAlteracaoPendente = camposAlterados.size > 0;

  function classeEntrada(campo) {
    return `campo__entrada${camposAlterados.has(campo) ? " campo__entrada--pendente" : ""}`;
  }

  const rodape = confirmandoDescarte ? (
    <footer className="modal-rodape modal-rodape--confirmacao">
      <p className="modal-rodape__pergunta" role="alert">
        Descartar as alterações não salvas?
      </p>
      <Botao onClick={onContinuarEditando} type="button" variante="secundario">
        Continuar editando
      </Botao>
      <Botao onClick={onDescartar} type="button" variante="perigo">
        Descartar
      </Botao>
    </footer>
  ) : (
    <footer className="modal-rodape">
      <Botao className="linha-icone-texto" disabled={ocupado} onClick={onFechar} style={{ marginRight: "auto" }} type="button" variante="secundario">
        <TbX aria-hidden="true" size={15} /> Fechar
      </Botao>
      <Botao className="linha-icone-texto" disabled={ocupado} onClick={onExcluir} type="button" variante="perigo">
        <MdDelete aria-hidden="true" size={19} /> Excluir
      </Botao>
      <Botao className="linha-icone-texto" disabled={ocupado || !temAlteracaoPendente} form="form-ajustes-avaliacao" type="submit" variante="primario">
        <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Salvar"}
      </Botao>
    </footer>
  );

  return (
    <Modal onFechar={onFechar} rodape={rodape} titulo="Ajustes rápidos da avaliação">
      <form className="formulario-modal ajustes-avaliacao" id="form-ajustes-avaliacao" noValidate onSubmit={onSalvar}>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="ajustes-avaliacao-titulo">Título</label>
          <input
            className={classeEntrada("titulo")}
            disabled={ocupado}
            id="ajustes-avaliacao-titulo"
            maxLength={180}
            name="titulo"
            onChange={onAlterarCampo}
            value={rascunho.titulo}
          />
        </div>

        <div className="ajustes-avaliacao__linha-fixa">
          <span className="campo__rotulo">Módulo</span>
          <span>{avaliacao.moduloTitulo || "Direto no curso"}</span>
        </div>

        <div className="ajustes-avaliacao__linha-fixa">
          <span className="campo__rotulo">Total de questões</span>
          <span className="ajustes-avaliacao__questoes">
            {avaliacao.totalQuestoes || 0}
            <button
              aria-label="Editar questões desta avaliação"
              className="btn-editar-questoes"
              data-tooltip="Editar questões"
              disabled={ocupado}
              onClick={onEditarQuestoes}
              type="button"
            >
              <motion.span style={{ display: "flex" }} transition={MOLA_ICONE} whileHover={{ scale: 1.25, rotate: -12 }}>
                <TbPencil aria-hidden="true" size={18} />
              </motion.span>
            </button>
          </span>
        </div>

        <div className="grade-2 ajustes-avaliacao__numeros">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="ajustes-avaliacao-tentativas">Tentativas permitidas</label>
            <input
              className={classeEntrada("tentativasPermitidas")}
              disabled={ocupado}
              id="ajustes-avaliacao-tentativas"
              inputMode="numeric"
              min="1"
              name="tentativasPermitidas"
              onChange={onAlterarCampo}
              step="1"
              type="number"
              value={rascunho.tentativasPermitidas}
            />
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="ajustes-avaliacao-tempo">Tempo limite (min)</label>
            <input
              className={classeEntrada("tempoLimiteMinutos")}
              disabled={ocupado}
              id="ajustes-avaliacao-tempo"
              inputMode="numeric"
              min="1"
              name="tempoLimiteMinutos"
              onChange={onAlterarCampo}
              placeholder="Sem limite"
              step="1"
              type="number"
              value={rascunho.tempoLimiteMinutos}
            />
          </div>
        </div>

        {temAlteracaoPendente && !confirmandoDescarte ? (
          <InlineMessage tone="warning">Alterações não salvas. Clique em Salvar para gravar.</InlineMessage>
        ) : null}

        {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
      </form>

      <div className="detalhe-status">
        <div>
          <strong className="detalhe-status__rotulo">Status da avaliação</strong>
          <span className="detalhe-status__descricao">
            {alternandoStatus ? "Salvando..." : publicado ? "Visível e disponível para os alunos" : "Oculta - não aparece para os alunos"}
          </span>
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: "var(--espaco-sm)" }}>
          <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
          <button
            aria-busy={alternandoStatus}
            aria-checked={publicado}
            aria-label={publicado ? "Publicado - clique para arquivar" : "Arquivado - clique para publicar"}
            className={`switch-ativo${publicado ? " switch-ativo--ativo" : ""}`}
            disabled={ocupado}
            onClick={onAlternarStatus}
            role="switch"
            type="button"
          >
            <TbX aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--esq" size={10} />
            <span aria-hidden="true" className="switch-ativo__thumb" />
            <TbCheck aria-hidden="true" className="switch-ativo__icone switch-ativo__icone--dir" size={10} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SlideAvaliacoes({ avaliacoes, edicaoTravada, mediaNotaPorAvaliacaoId, menuAbertoId, onEditar, onExcluir, onToggleMenu, onVerDetalhes }) {
  const [avaliacaoAbertaId, setAvaliacaoAbertaId] = useState(null);

  if (avaliacoes.length === 0) {
    return <p className="texto-vazio" role="status">Nenhuma avaliacao cadastrada para este curso ainda.</p>;
  }

  function alternarAvaliacao(avaliacaoId) {
    setAvaliacaoAbertaId((atual) => (atual === avaliacaoId ? null : avaliacaoId));
  }

  return (
    <div className="atividades-curso__lista-modulos">
      {avaliacoes.map((avaliacao, indice) => {
        const aberta = avaliacaoAbertaId === avaliacao.id;
        const idDetalhe = `avaliacao-detalhe-${avaliacao.id}`;

        return (
          <section className="conteudos-modulo conteudos-modulo--cartao" key={avaliacao.id}>
            <header className="conteudos-modulo__cabecalho">
              <h3 className="conteudos-modulo__cabecalho-wrapper">
                <button
                  aria-controls={idDetalhe}
                  aria-expanded={aberta}
                  className="conteudos-modulo__toggle"
                  onClick={() => alternarAvaliacao(avaliacao.id)}
                  type="button"
                >
                  <div className="conteudos-modulo__info">
                    <span aria-hidden="true" className="conteudos-modulo__icone">
                      <TbTrophy size="1.4rem" />
                    </span>
                    <span className="conteudos-modulo__eyebrow">Avaliacao {String(indice + 1).padStart(2, "0")}</span>
                    <span className="conteudos-modulo__titulo">{avaliacao.titulo}</span>
                    <span className="conteudos-modulo__contagem">
                      {avaliacao.totalQuestoes || 0} questa{avaliacao.totalQuestoes === 1 ? "o" : "oes"} · {normalizePublicationStatus(avaliacao.statusPublicacao)}
                    </span>
                  </div>
                  <TbChevronDown
                    aria-hidden="true"
                    className={`conteudos-modulo__chevron${aberta ? " conteudos-modulo__chevron--aberto" : ""}`}
                    size="1.1rem"
                  />
                </button>
              </h3>

              <div className="menu-contexto">
                <button
                  aria-expanded={menuAbertoId === avaliacao.id}
                  aria-haspopup="true"
                  aria-label={`Opcoes para ${avaliacao.titulo}`}
                  className="menu-contexto__botao"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMenu(avaliacao.id);
                  }}
                  type="button"
                >
                  <TbDotsVertical aria-hidden="true" size={18} />
                </button>
                {menuAbertoId === avaliacao.id ? (
                  <ul className="menu-contexto__lista">
                    <li>
                      <button disabled={edicaoTravada} onClick={() => onVerDetalhes(avaliacao)} type="button">
                        Ajustes rapidos
                      </button>
                    </li>
                    <li>
                      <button disabled={edicaoTravada} onClick={() => onEditar(avaliacao)} type="button">
                        Editar estrutura
                      </button>
                    </li>
                    <li>
                      <button className="menu-item--perigo" disabled={edicaoTravada} onClick={() => onExcluir(avaliacao)} type="button">
                        Excluir
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            </header>

            <AnimatePresence initial={false}>
              {aberta ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="conteudos-modulo__corpo"
                  exit={{ height: 0, opacity: 0 }}
                  id={idDetalhe}
                  initial={{ height: 0, opacity: 0 }}
                  key={`detalhe-avaliacao-${avaliacao.id}`}
                  style={{ overflow: "hidden" }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                >
                  <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline lista-detalhes--metricas">
                    {Number(avaliacao.tipoAvaliacao) === 1 ? (
                      <div className="lista-detalhes__item">
                        <dt><TbTrophy aria-hidden="true" size={15} /> Tipo</dt>
                        <dd>Quiz - formativo, sem nota</dd>
                      </div>
                    ) : (
                      <div className="lista-detalhes__item">
                        <dt><TbAward aria-hidden="true" size={15} /> Nota média</dt>
                        <dd>{formatGrade(mediaNotaPorAvaliacaoId.get(avaliacao.id))}</dd>
                      </div>
                    )}
                    <div className="lista-detalhes__item">
                      <dt><TbHelpCircle aria-hidden="true" size={15} /> Questões</dt>
                      <dd>{avaliacao.totalQuestoes || 0}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt><TbRepeat aria-hidden="true" size={15} /> Tentativas permitidas</dt>
                      <dd>{avaliacao.tentativasPermitidas}</dd>
                    </div>
                    <div className="lista-detalhes__item">
                      <dt><TbClock aria-hidden="true" size={15} /> Tempo limite</dt>
                      <dd>{avaliacao.tempoLimiteMinutos ? `${avaliacao.tempoLimiteMinutos} min` : "Sem limite"}</dd>
                    </div>
                    {Number(avaliacao.tipoAvaliacao) !== 1 ? (
                      <div className="lista-detalhes__item">
                        <dt><TbTarget aria-hidden="true" size={15} /> Nota</dt>
                        <dd>de 0 a 10</dd>
                      </div>
                    ) : null}
                  </dl>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
