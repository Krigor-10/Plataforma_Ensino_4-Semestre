import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TbAlertTriangle, TbLock, TbPlus, TbSearch, TbTag, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import { InlineMessage } from "../../components/Primitives.jsx";
import Botao from "../../components/Botao.jsx";
import { useIndicadorRolagemHorizontal } from "../../hooks/useIndicadorRolagemHorizontal.js";
import { useToast } from "../../hooks/useToast.jsx";
import Insignia from "../../components/Insignia.jsx";
import Modal from "../../components/Modal.jsx";
import ModalPrepararVenda from "../../components/ModalPrepararVenda.jsx";
import { mapById } from "../../lib/dashboard.js";
import { ApiError, apiRequest, resolverUrlArquivo } from "../../lib/api.js";
import { formatGrade, normalizeStatus } from "../../lib/format.js";
import { getCourseCover } from "../../data/courseCovers.js";
import { resolverImagemCurso } from "../../lib/courseImage.js";
import PainelCursoGestao from "./PainelCursoGestao.jsx";

const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;
const MODELO_ACOMPANHADO = 3;
const ROTULO_MODELO_CURSO = { [MODELO_GRATUITO]: "Gratuito", [MODELO_PAGO_PACOTE]: "Pago", [MODELO_ACOMPANHADO]: "Acompanhado" };

function normalizarBusca(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/* Particao exaustiva dos cursos nas 4 abas do Admin (plano fluxo-venda-
   cursos, Round 5) - ciclo de vida (Encerrado/Em andamento) e venda (A
   venda/Fora da venda) sao eixos independentes (um pacote vindo do fluxo
   Gratuito->pacote pode estar Encerrado E a venda ao mesmo tempo), entao a
   prioridade abaixo decide em qual aba UNICA cada curso cai: "a venda" vem
   primeiro (e o estado que mais importa pro Admin acompanhar), depois
   "encerrados" (precisa de acao - preparar pra venda), depois "fora da
   venda" (pacote existente mas indisponivel), e por fim "andamento"
   (Acompanhado/Gratuito rodando normalmente). */
function categoriaCicloCurso(curso) {
  const modeloCurso = Number(curso.modeloCurso);
  const ehPagoPacote = modeloCurso === MODELO_PAGO_PACOTE;
  const ehAcompanhadoOuGratuito = modeloCurso === MODELO_ACOMPANHADO || modeloCurso === MODELO_GRATUITO;

  if (ehPagoPacote && curso.publicadoParaVendaEm) {
    return "a-venda";
  }

  if ((ehAcompanhadoOuGratuito || ehPagoPacote) && curso.encerradoEm) {
    return "encerrados";
  }

  if (ehPagoPacote) {
    return "fora-da-venda";
  }

  return "andamento";
}

// Situacao do Coordenador (docs/fluxo-coordenador/partes/PARTE-1), eixo
// independente da categorizacao de 4 abas do Admin acima - so dois estados,
// e "encerrados" inclui o que ja virou pacote (so olha encerradoEm).
function categoriaSituacaoCoordenador(curso) {
  return curso.encerradoEm ? "encerrados" : "ativos";
}

function estaAguardandoEncerramento(curso) {
  return Boolean(curso.concluidoPeloProfessorEm) && !curso.encerradoEm;
}

// Dentro da aba Ativos do Coordenador, quem esta aguardando encerramento
// (professor ja concluiu) vem primeiro - e o que precisa de acao dele.
function compararCursos(left, right, priorizarAguardando) {
  if (priorizarAguardando) {
    const prioridadeLeft = estaAguardandoEncerramento(left) ? 0 : 1;
    const prioridadeRight = estaAguardandoEncerramento(right) ? 0 : 1;
    if (prioridadeLeft !== prioridadeRight) {
      return prioridadeLeft - prioridadeRight;
    }
  }

  return String(left.titulo || "").localeCompare(String(right.titulo || ""), "pt-BR");
}

/* CURSOS — grade de cards (mesmo padrao catalogo-card/catalogo-grade usado em
   Progresso/Conteudos/Avaliacoes). Clicar num card abre a visao gerencial do
   curso (alunos matriculados, media geral, estrutura, acoes administrativas)
   em vez de um menu de contexto solto no card. */
export function SecaoCursos({
  coordenadores = [],
  cursoIdSelecionado = null,
  cursos,
  ehAdmin,
  ehCoordenador,
  matriculas = [],
  moduloIdSelecionado = null,
  modulos = [],
  onNavigate,
  onRefresh,
  onSessionExpired,
  professores = []
}) {
  const { mostrarToast } = useToast();
  const [filtroCoordenador, setFiltroCoordenador] = useState("todos");
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [abaCurso, setAbaCurso] = useState("andamento");
  const [abaCursoCoordenador, setAbaCursoCoordenador] = useState("ativos");
  const refAbasCursos = useRef(null);
  const abasCursosTemConteudoEscondido = useIndicadorRolagemHorizontal(refAbasCursos);
  const [cursoParaPrepararVenda, setCursoParaPrepararVenda] = useState(null);
  const [buscaCurso, setBuscaCurso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [cursoParaCoordenador, setCursoParaCoordenador] = useState(null);
  const [coordenadorIdParaCurso, setCoordenadorIdParaCurso] = useState("");
  const [mensagemCoordenadorCurso, setMensagemCoordenadorCurso] = useState({ tone: "", message: "" });
  const [salvandoCoordenadorCurso, setSalvandoCoordenadorCurso] = useState(false);
  const [cursoParaImagem, setCursoParaImagem] = useState(null);
  const [arquivoImagemSelecionado, setArquivoImagemSelecionado] = useState(null);
  const [previewImagem, setPreviewImagem] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [mensagemImagem, setMensagemImagem] = useState({ tone: "", message: "" });
  const [cursoParaEditar, setCursoParaEditar] = useState(null);
  const [dadosEdicaoCurso, setDadosEdicaoCurso] = useState({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
  const [mensagemEdicao, setMensagemEdicao] = useState({ tone: "", message: "" });
  const [formularioCriacaoAberto, setFormularioCriacaoAberto] = useState(false);
  const [dadosCriacaoCurso, setDadosCriacaoCurso] = useState({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
  const [mensagemCriacao, setMensagemCriacao] = useState({ tone: "", message: "" });
  const [salvandoCriacao, setSalvandoCriacao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const coordenadoresOrdenados = useMemo(
    () => [...coordenadores].sort((left, right) => String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR")),
    [coordenadores]
  );
  const coordenadorPorId = useMemo(() => mapById(coordenadoresOrdenados), [coordenadoresOrdenados]);

  const resumoPorCursoId = useMemo(() => {
    const resumoInicial = new Map(
      cursos.map((curso) => [curso.id, { modulos: 0, matriculas: 0, alunosMatriculados: 0, somaNotas: 0, notasContadas: 0 }])
    );

    modulos.forEach((modulo) => {
      const resumo = resumoInicial.get(modulo.cursoId);

      if (resumo) {
        resumo.modulos += 1;
      }
    });

    matriculas.forEach((matricula) => {
      const resumo = resumoInicial.get(matricula.cursoId);

      if (!resumo) {
        return;
      }

      resumo.matriculas += 1;

      if (normalizeStatus(matricula.status) === "Aprovada") {
        resumo.alunosMatriculados += 1;

        if (Number(matricula.notaFinal) > 0) {
          resumo.somaNotas += Number(matricula.notaFinal);
          resumo.notasContadas += 1;
        }
      }
    });

    return resumoInicial;
  }, [cursos, matriculas, modulos]);

  function mediaDoCurso(resumo) {
    return resumo.notasContadas > 0 ? resumo.somaNotas / resumo.notasContadas : 0;
  }

  const termoBusca = useMemo(() => normalizarBusca(buscaCurso), [buscaCurso]);

  const contagemPorAbaCurso = useMemo(() => {
    const contagem = { andamento: 0, encerrados: 0, "a-venda": 0, "fora-da-venda": 0 };
    cursos.forEach((curso) => {
      contagem[categoriaCicloCurso(curso)] += 1;
    });
    return contagem;
  }, [cursos]);

  const contagemPorAbaCoordenador = useMemo(() => {
    const contagem = { ativos: 0, encerrados: 0 };
    cursos.forEach((curso) => {
      contagem[categoriaSituacaoCoordenador(curso)] += 1;
    });
    return contagem;
  }, [cursos]);

  // Atalho "N sem coordenador" (docs/bugs/PROMPT-agente-filtros-cursos-
  // admin.md): conta so dentro da aba aberta, independente dos filtros de
  // coordenador/modelo/busca - mesmo criterio do "N sem curso" ja usado em
  // SecaoCoordenadores.jsx.
  const totalSemCoordenadorNaAba = useMemo(
    () => cursos.filter((curso) => categoriaCicloCurso(curso) === abaCurso && !curso.coordenadorId).length,
    [abaCurso, cursos]
  );
  const mostrarFiltroModelo = abaCurso === "andamento" || abaCurso === "encerrados";

  const cursosFiltrados = useMemo(() => {
    let proximosCursos = cursos;

    if (ehAdmin) {
      proximosCursos = proximosCursos.filter((curso) => categoriaCicloCurso(curso) === abaCurso);

      if (filtroModelo !== "todos") {
        const modeloCurso = Number(filtroModelo);
        proximosCursos = proximosCursos.filter((curso) => Number(curso.modeloCurso) === modeloCurso);
      }
    }

    if (ehCoordenador) {
      proximosCursos = proximosCursos.filter((curso) => categoriaSituacaoCoordenador(curso) === abaCursoCoordenador);
    }

    if (ehAdmin && filtroCoordenador === "aguardando") {
      proximosCursos = proximosCursos.filter((curso) => !curso.coordenadorId);
    } else if (ehAdmin && filtroCoordenador !== "todos") {
      const coordenadorId = Number(filtroCoordenador);
      proximosCursos = proximosCursos.filter((curso) => Number(curso.coordenadorId) === coordenadorId);
    }

    if (!termoBusca) {
      return [...proximosCursos].sort((left, right) => compararCursos(left, right, ehCoordenador));
    }

    return proximosCursos.filter((curso) => {
      const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;
      const coordenacao = coordenador?.nome || (curso.coordenadorId ? `Usuario #${curso.coordenadorId}` : "Nao atribuida");
      const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, matriculas: 0 };
      const campos = [
        curso.codigoRegistro,
        curso.titulo,
        curso.descricao,
        coordenacao,
        `${resumo.modulos} modulos`,
        `${resumo.matriculas} matriculas`
      ];

      return campos.some((campo) => normalizarBusca(campo).includes(termoBusca));
    }).sort((left, right) => compararCursos(left, right, ehCoordenador));
  }, [abaCurso, abaCursoCoordenador, coordenadorPorId, cursos, ehAdmin, ehCoordenador, filtroCoordenador, filtroModelo, resumoPorCursoId, termoBusca]);
  const temFiltroAtivo = Boolean(termoBusca || (ehAdmin && (filtroCoordenador !== "todos" || filtroModelo !== "todos")));

  const cursoSelecionado = useMemo(
    () => cursos.find((curso) => curso.id === cursoIdSelecionado) || null,
    [cursoIdSelecionado, cursos]
  );

  // O curso aberto e controlado pela rota (/app/cursos/:id), pra Admin e pra
  // Coordenador - se o id nao bate com nenhum curso visivel depois dos dados
  // carregarem, volta pra lista.
  useEffect(() => {
    if (!cursoIdSelecionado) {
      return;
    }

    if (cursos.some((curso) => curso.id === cursoIdSelecionado)) {
      return;
    }

    onNavigate?.("/app/cursos", { replace: true });
  }, [cursoIdSelecionado, cursos, onNavigate]);

  function abrirDetalheCurso(curso) {
    onNavigate?.(`/app/cursos/${curso.id}`);
  }

  function voltarParaListaCursos() {
    onNavigate?.("/app/cursos");
  }

  // stopPropagation (plano Round 5) evita que o clique tambem dispare a
  // abertura do card por algum listener futuro no <li>/<ul> - o botao em si
  // ja fica fora do <button> do card (nao aninhado, ver JSX abaixo).
  function prepararCursoParaVenda(curso, event) {
    event.stopPropagation();
    setCursoParaPrepararVenda(curso);
  }

  function limparFiltros() {
    setBuscaCurso("");
    setFiltroCoordenador("todos");
    setFiltroModelo("todos");
  }

  function selecionarAbaCurso(aba) {
    setAbaCurso(aba);

    // A-venda/fora-da-venda so tem curso Pago - o filtro de modelo nao
    // aparece nessas abas, entao reseta pra nao ficar aplicado escondido.
    if (aba === "a-venda" || aba === "fora-da-venda") {
      setFiltroModelo("todos");
    }
  }

  function alternarFiltroSemCoordenador() {
    setFiltroCoordenador((atual) => (atual === "aguardando" ? "todos" : "aguardando"));
  }

  function abrirModalCoordenadorCurso(curso) {
    setCursoParaCoordenador(curso);
    setCoordenadorIdParaCurso(curso.coordenadorId ? String(curso.coordenadorId) : "0");
    setMensagemCoordenadorCurso({ tone: "", message: "" });
  }

  function fecharModalCoordenadorCurso() {
    if (salvandoCoordenadorCurso) {
      return;
    }

    setCursoParaCoordenador(null);
  }

  async function salvarCoordenadorCurso() {
    const coordenadorId = Number(coordenadorIdParaCurso);

    setSalvandoCoordenadorCurso(true);
    setMensagemCoordenadorCurso({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaCoordenador.id}/coordenador`, {
        method: "PUT",
        body: JSON.stringify(coordenadorId)
      });

      const coordenador = coordenadorId ? coordenadorPorId.get(coordenadorId) : null;
      mostrarToast(
        coordenador ? `${coordenador.nome} atribuido como coordenador do curso.` : "Curso marcado como aguardando coordenador.",
        "sucesso"
      );
      setCursoParaCoordenador(null);
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemCoordenadorCurso({ tone: "error", message: err.message || "Nao foi possivel atribuir o coordenador agora." });
    } finally {
      setSalvandoCoordenadorCurso(false);
    }
  }

  async function executarAcaoCurso(curso, acao, mensagemSucesso, mensagemErroPadrao) {
    setSalvando(true);
    try {
      await apiRequest(`/Cursos/${curso.id}/${acao}`, { method: "POST" });
      mostrarToast(mensagemSucesso, "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || mensagemErroPadrao, "erro");
    } finally {
      setSalvando(false);
    }
  }

  const encerrarCurso = (curso) =>
    executarAcaoCurso(curso, "encerrar", "Curso encerrado com sucesso.", "Nao foi possivel encerrar o curso agora.");

  const reabrirCurso = (curso) =>
    executarAcaoCurso(curso, "reabrir", "Curso reaberto com sucesso.", "Nao foi possivel reabrir o curso agora.");

  function abrirModalEdicao(curso) {
    setCursoParaEditar(curso);
    setDadosEdicaoCurso({
      titulo: curso.titulo || "",
      descricao: curso.descricao || "",
      preco: String(curso.preco ?? ""),
      modeloCurso: Number(curso.modeloCurso) || 2
    });
    setMensagemEdicao({ tone: "", message: "" });
  }

  function fecharModalEdicao() {
    if (salvandoEdicao) {
      return;
    }

    setCursoParaEditar(null);
  }

  function atualizarCampoEdicao(event) {
    const { name, value } = event.target;
    setDadosEdicaoCurso((atual) => ({ ...atual, [name]: value }));
  }

  async function salvarEdicaoCurso(event) {
    event.preventDefault();

    const preco = Number(dadosEdicaoCurso.preco);

    if (!dadosEdicaoCurso.titulo.trim()) {
      setMensagemEdicao({ tone: "error", message: "Informe o titulo do curso." });
      return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
      setMensagemEdicao({ tone: "error", message: "Informe um preco valido." });
      return;
    }

    setSalvandoEdicao(true);
    setMensagemEdicao({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaEditar.id}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: dadosEdicaoCurso.titulo.trim(),
          descricao: dadosEdicaoCurso.descricao.trim(),
          preco,
          modeloCurso: Number(dadosEdicaoCurso.modeloCurso)
        })
      });

      setCursoParaEditar(null);
      mostrarToast("Curso salvo com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemEdicao({ tone: "error", message: err.message || "Nao foi possivel salvar o curso agora." });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirFormularioCriacaoCurso() {
    setDadosCriacaoCurso({ titulo: "", descricao: "", preco: "", modeloCurso: 2 });
    setMensagemCriacao({ tone: "", message: "" });
    setFormularioCriacaoAberto(true);
  }

  function fecharFormularioCriacaoCurso() {
    if (salvandoCriacao) {
      return;
    }

    setFormularioCriacaoAberto(false);
  }

  function atualizarCampoCriacaoCurso(event) {
    const { name, value } = event.target;
    setDadosCriacaoCurso((atual) => ({ ...atual, [name]: value }));
  }

  async function salvarNovoCurso(event) {
    event.preventDefault();

    const preco = Number(dadosCriacaoCurso.preco || 0);

    if (!dadosCriacaoCurso.titulo.trim()) {
      setMensagemCriacao({ tone: "error", message: "Informe o titulo do curso." });
      return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
      setMensagemCriacao({ tone: "error", message: "Informe um preco valido." });
      return;
    }

    setSalvandoCriacao(true);
    setMensagemCriacao({ tone: "", message: "" });

    try {
      await apiRequest("/Cursos", {
        method: "POST",
        body: JSON.stringify({
          titulo: dadosCriacaoCurso.titulo.trim(),
          descricao: dadosCriacaoCurso.descricao.trim(),
          preco,
          modeloCurso: Number(dadosCriacaoCurso.modeloCurso)
        })
      });

      setFormularioCriacaoAberto(false);
      mostrarToast("Curso criado com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemCriacao({ tone: "error", message: err.message || "Nao foi possivel criar o curso agora." });
    } finally {
      setSalvandoCriacao(false);
    }
  }

  function abrirModalImagem(curso) {
    setCursoParaImagem(curso);
    setArquivoImagemSelecionado(null);
    setPreviewImagem(curso.imagemUrl || "");
    setMensagemImagem({ tone: "", message: "" });
  }

  function fecharModalImagem() {
    if (enviandoImagem) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setCursoParaImagem(null);
    setArquivoImagemSelecionado(null);
    setPreviewImagem("");
  }

  function selecionarArquivoImagem(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setArquivoImagemSelecionado(arquivo);
    setPreviewImagem(URL.createObjectURL(arquivo));
  }

  async function enviarImagemCurso() {
    if (!cursoParaImagem || !arquivoImagemSelecionado) {
      setMensagemImagem({ tone: "error", message: "Selecione uma imagem antes de salvar." });
      return;
    }

    const formData = new FormData();
    formData.append("imagem", arquivoImagemSelecionado);

    setEnviandoImagem(true);
    setMensagemImagem({ tone: "", message: "" });

    try {
      await apiRequest(`/Cursos/${cursoParaImagem.id}/imagem`, { method: "POST", body: formData });
      fecharModalImagem();
      mostrarToast("Imagem do curso atualizada com sucesso.", "sucesso");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemImagem({ tone: "error", message: err.message || "Nao foi possivel enviar a imagem agora." });
    } finally {
      setEnviandoImagem(false);
    }
  }

  const modaisComuns = (
    <>
      {cursoParaPrepararVenda ? (
        <ModalPrepararVenda
          curso={cursoParaPrepararVenda}
          onFechar={() => setCursoParaPrepararVenda(null)}
          onSalvo={() => {
            mostrarToast("Curso preparado para venda com sucesso.", "sucesso");
            onRefresh?.();
          }}
          onSessionExpired={onSessionExpired}
        />
      ) : null}

      {formularioCriacaoAberto ? (
        <Modal
          onFechar={fecharFormularioCriacaoCurso}
          titulo="Novo curso"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoCriacao} onClick={fecharFormularioCriacaoCurso} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoCriacao} form="form-novo-curso" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoCriacao ? "Salvando..." : "Criar curso"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-novo-curso" onSubmit={salvarNovoCurso}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-titulo">Titulo *</label>
              <input autoComplete="off" className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-titulo" maxLength={150} name="titulo" onChange={atualizarCampoCriacaoCurso} value={dadosCriacaoCurso.titulo} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-descricao">Descricao</label>
              <textarea className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-descricao" maxLength={1000} name="descricao" onChange={atualizarCampoCriacaoCurso} rows={4} value={dadosCriacaoCurso.descricao} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-preco">Preco (R$) *</label>
              <input className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-preco" inputMode="decimal" min={0} name="preco" onChange={atualizarCampoCriacaoCurso} step="0.01" type="number" value={dadosCriacaoCurso.preco} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="novo-curso-modelo">Modelo de curso *</label>
              <select className="campo__entrada" disabled={salvandoCriacao} id="novo-curso-modelo" name="modeloCurso" onChange={atualizarCampoCriacaoCurso} value={dadosCriacaoCurso.modeloCurso}>
                <option value={1}>Gratuito (conteudo pronto)</option>
                <option value={2}>Pago (pacote pronto)</option>
                <option value={3}>Acompanhado (professor libera aos poucos)</option>
              </select>
              <p className="campo__ajuda">Acompanhado precisa ser concluido pelo professor e encerrado pelo coordenador antes de liberar certificados.</p>
            </div>

            {mensagemCriacao.message ? <InlineMessage tone={mensagemCriacao.tone}>{mensagemCriacao.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}

      {cursoParaEditar ? (
        <Modal
          onFechar={fecharModalEdicao}
          titulo={`Editar curso - ${cursoParaEditar.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoEdicao} onClick={fecharModalEdicao} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoEdicao} form="form-editar-curso" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoEdicao ? "Salvando..." : "Salvar alteracoes"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-editar-curso" onSubmit={salvarEdicaoCurso}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-titulo">Titulo *</label>
              <input className="campo__entrada" disabled={salvandoEdicao} id="curso-titulo" maxLength={150} name="titulo" onChange={atualizarCampoEdicao} value={dadosEdicaoCurso.titulo} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-descricao">Descricao</label>
              <textarea className="campo__entrada" disabled={salvandoEdicao} id="curso-descricao" maxLength={1000} name="descricao" onChange={atualizarCampoEdicao} rows={4} value={dadosEdicaoCurso.descricao} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-preco">Preco (R$) *</label>
              <input className="campo__entrada" disabled={salvandoEdicao} id="curso-preco" inputMode="decimal" min={0} name="preco" onChange={atualizarCampoEdicao} step="0.01" type="number" value={dadosEdicaoCurso.preco} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="curso-modelo">Modelo de curso *</label>
              <select className="campo__entrada" disabled={salvandoEdicao} id="curso-modelo" name="modeloCurso" onChange={atualizarCampoEdicao} value={dadosEdicaoCurso.modeloCurso}>
                <option value={1}>Gratuito (conteudo pronto)</option>
                <option value={2}>Pago (pacote pronto)</option>
                <option value={3}>Acompanhado (professor libera aos poucos)</option>
              </select>
            </div>

            {mensagemEdicao.message ? <InlineMessage tone={mensagemEdicao.tone}>{mensagemEdicao.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}

      {cursoParaImagem ? (
        <Modal
          onFechar={fecharModalImagem}
          titulo={`Foto de capa - ${cursoParaImagem.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={enviandoImagem} onClick={fecharModalImagem} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={enviandoImagem || !arquivoImagemSelecionado} onClick={enviarImagemCurso} type="button" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {enviandoImagem ? "Enviando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <div className="campo">
            <label className="campo__rotulo" htmlFor="curso-imagem">Imagem *</label>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="campo__entrada"
              disabled={enviandoImagem}
              id="curso-imagem"
              onChange={selecionarArquivoImagem}
              type="file"
            />
          </div>

          {previewImagem ? (
            <img alt="" className="novo-cont__miniatura" src={resolverUrlArquivo(previewImagem)} style={{ marginTop: "var(--espaco-md)" }} />
          ) : null}

          {mensagemImagem.message ? <InlineMessage tone={mensagemImagem.tone}>{mensagemImagem.message}</InlineMessage> : null}
        </Modal>
      ) : null}

      {cursoParaCoordenador ? (
        <Modal
          onFechar={fecharModalCoordenadorCurso}
          titulo={`Coordenador de ${cursoParaCoordenador.titulo}`}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvandoCoordenadorCurso} onClick={fecharModalCoordenadorCurso} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvandoCoordenadorCurso} onClick={salvarCoordenadorCurso} type="button" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvandoCoordenadorCurso ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <div className="campo">
            <label className="campo__rotulo" htmlFor="curso-coordenador-select">Coordenador</label>
            <select
              className="campo__entrada"
              disabled={salvandoCoordenadorCurso}
              id="curso-coordenador-select"
              onChange={(event) => setCoordenadorIdParaCurso(event.target.value)}
              value={coordenadorIdParaCurso}
            >
              <option value="0">Aguardando coordenador</option>
              {coordenadoresOrdenados.map((coordenador) => (
                <option key={coordenador.id} value={coordenador.id}>
                  {coordenador.nome}
                </option>
              ))}
            </select>
          </div>
          {mensagemCoordenadorCurso.message ? <InlineMessage tone={mensagemCoordenadorCurso.tone}>{mensagemCoordenadorCurso.message}</InlineMessage> : null}
        </Modal>
      ) : null}
    </>
  );

  if (cursoSelecionado) {
    return (
      <div className="tela-cursos">
        <PainelCursoGestao
          coordenadores={coordenadoresOrdenados}
          curso={cursoSelecionado}
          moduloIdSelecionado={moduloIdSelecionado}
          modulos={modulos}
          onAlterarFotoCurso={() => abrirModalImagem(cursoSelecionado)}
          onAtribuirCoordenador={() => abrirModalCoordenadorCurso(cursoSelecionado)}
          onEditarCurso={() => abrirModalEdicao(cursoSelecionado)}
          onEncerrarCurso={() => encerrarCurso(cursoSelecionado)}
          onNavigate={onNavigate}
          onReabrirCurso={() => reabrirCurso(cursoSelecionado)}
          onRefresh={onRefresh}
          onSessionExpired={onSessionExpired}
          onVoltar={voltarParaListaCursos}
          perfil={ehAdmin ? "Admin" : "Coordenador"}
          professores={professores}
          salvandoCurso={salvando}
        />
        {modaisComuns}
      </div>
    );
  }

  return (
    <div className="tela-cursos">
      <header className="cabecalho-pagina cabecalho-pagina--centralizado">
        <div>
          <h2 className="cabecalho-pagina__titulo">Cursos</h2>
          <p className="cabecalho-pagina__subtitulo">
            {ehCoordenador
              ? abaCursoCoordenador === "encerrados"
                ? "Cursos que você encerrou."
                : "Cursos ativos da sua coordenação."
              : ehAdmin
                ? "Todos os cursos cadastrados na plataforma."
                : "Catalogo academico reutilizado na home publica e no ambiente autenticado."}
          </p>
        </div>

        <div className="barra-filtros">
          <label className="visualmente-oculto" htmlFor="busca-cursos">Buscar curso</label>
          <div className="campo-busca">
            <TbSearch aria-hidden="true" className="campo-busca__icone" size={15} />
            <input
              className="campo__entrada"
              id="busca-cursos"
              onChange={(event) => setBuscaCurso(event.target.value)}
              placeholder="Pesquisar cursos"
              type="search"
              value={buscaCurso}
            />
          </div>

          {ehAdmin ? (
            <Botao onClick={abrirFormularioCriacaoCurso} tamanho="pequeno" variante="primario">
              <motion.span whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} style={{ display: "flex" }}>
                <TbPlus aria-hidden="true" size={16} />
              </motion.span>{" "}
              Novo curso
            </Botao>
          ) : null}
        </div>
      </header>

      {ehAdmin ? (
        <div className="linha-abas-status">
          <nav
            aria-label="Status dos cursos"
            className={`abas-matriculas${abasCursosTemConteudoEscondido ? " abas-matriculas--mais-a-direita" : ""}`}
            ref={refAbasCursos}
            role="tablist"
          >
            <button
              aria-selected={abaCurso === "andamento"}
              className={`abas-matriculas__aba${abaCurso === "andamento" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => selecionarAbaCurso("andamento")}
              role="tab"
              type="button"
            >
              Em andamento <span className="abas-matriculas__contagem">{contagemPorAbaCurso.andamento}</span>
            </button>
            <button
              aria-selected={abaCurso === "encerrados"}
              className={`abas-matriculas__aba${abaCurso === "encerrados" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => selecionarAbaCurso("encerrados")}
              role="tab"
              type="button"
            >
              Encerrados <span className="abas-matriculas__contagem">{contagemPorAbaCurso.encerrados}</span>
            </button>
            <button
              aria-selected={abaCurso === "a-venda"}
              className={`abas-matriculas__aba${abaCurso === "a-venda" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => selecionarAbaCurso("a-venda")}
              role="tab"
              type="button"
            >
              À venda <span className="abas-matriculas__contagem">{contagemPorAbaCurso["a-venda"]}</span>
            </button>
            <button
              aria-selected={abaCurso === "fora-da-venda"}
              className={`abas-matriculas__aba${abaCurso === "fora-da-venda" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => selecionarAbaCurso("fora-da-venda")}
              role="tab"
              type="button"
            >
              Fora da venda <span className="abas-matriculas__contagem">{contagemPorAbaCurso["fora-da-venda"]}</span>
            </button>
          </nav>

          <div className="cursos-admin-filtros">
            {totalSemCoordenadorNaAba > 0 ? (
              <button
                aria-pressed={filtroCoordenador === "aguardando"}
                className="indicador-filtro"
                onClick={alternarFiltroSemCoordenador}
                type="button"
              >
                <Insignia
                  style={filtroCoordenador === "aguardando" ? { borderColor: "var(--cor-borda-forte)" } : undefined}
                  texto={`${totalSemCoordenadorNaAba} sem coordenador`}
                  variante="aviso"
                />
              </button>
            ) : null}

            <div className="filtro-inline">
              <label className="campo__rotulo" htmlFor="filtro-coordenador">Coordenador:</label>
              <select
                className="campo__entrada"
                id="filtro-coordenador"
                onChange={(event) => setFiltroCoordenador(event.target.value)}
                value={filtroCoordenador}
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Sem coordenador</option>
                {coordenadoresOrdenados.map((coordenador) => (
                  <option key={coordenador.id} value={coordenador.id}>
                    {coordenador.nome}
                  </option>
                ))}
              </select>
            </div>

            {mostrarFiltroModelo ? (
              <div className="filtro-inline">
                <label className="campo__rotulo" htmlFor="filtro-modelo-curso">Modelo:</label>
                <select
                  className="campo__entrada"
                  id="filtro-modelo-curso"
                  onChange={(event) => setFiltroModelo(event.target.value)}
                  value={filtroModelo}
                >
                  <option value="todos">Todos</option>
                  <option value={MODELO_GRATUITO}>Grátis</option>
                  <option value={MODELO_ACOMPANHADO}>Acompanhado</option>
                </select>
              </div>
            ) : null}

            {temFiltroAtivo ? (
              <Botao onClick={limparFiltros} tamanho="pequeno" variante="fantasma">
                Limpar filtros
              </Botao>
            ) : null}
          </div>
        </div>
      ) : null}

      {ehCoordenador ? (
        <div className="linha-abas-status">
          <nav
            aria-label="Situacao dos cursos"
            className={`abas-matriculas${abasCursosTemConteudoEscondido ? " abas-matriculas--mais-a-direita" : ""}`}
            ref={refAbasCursos}
            role="tablist"
          >
            <button
              aria-selected={abaCursoCoordenador === "ativos"}
              className={`abas-matriculas__aba${abaCursoCoordenador === "ativos" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => setAbaCursoCoordenador("ativos")}
              role="tab"
              type="button"
            >
              Ativos <span className="abas-matriculas__contagem">{contagemPorAbaCoordenador.ativos}</span>
            </button>
            <button
              aria-selected={abaCursoCoordenador === "encerrados"}
              className={`abas-matriculas__aba${abaCursoCoordenador === "encerrados" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => setAbaCursoCoordenador("encerrados")}
              role="tab"
              type="button"
            >
              Encerrados <span className="abas-matriculas__contagem">{contagemPorAbaCoordenador.encerrados}</span>
            </button>
          </nav>
        </div>
      ) : null}

      {cursosFiltrados.length === 0 ? (
        <p className="texto-vazio texto-vazio--central" role="status">
          {temFiltroAtivo ? "Nenhum curso encontrado com os filtros aplicados." : ehCoordenador ? "Nenhum curso ativo sob sua coordenacao." : "Nenhum curso encontrado."}
        </p>
      ) : (
        <ul aria-label="Cursos" className={`catalogo-grade${ehCoordenador ? " catalogo-grade--relevo" : ""}`} role="list">
          {cursosFiltrados.map((curso) => {
            const resumo = resumoPorCursoId.get(curso.id) || { modulos: 0, alunosMatriculados: 0, notasContadas: 0 };
            const media = mediaDoCurso(resumo);
            const coordenador = curso.coordenadorId ? coordenadorPorId.get(curso.coordenadorId) : null;

            const mostrarBotaoPrepararVenda = ehAdmin && abaCurso === "encerrados" && Number(curso.modeloCurso) === MODELO_GRATUITO;
            const situacaoCoordenador = !ehCoordenador
              ? null
              : estaAguardandoEncerramento(curso)
                ? "aguardando"
                : curso.encerradoEm
                  ? "encerrado"
                  : null;

            return (
              <li key={curso.id}>
                <button
                  className={`catalogo-card catalogo-card--acionavel${situacaoCoordenador === "aguardando" ? " catalogo-card--aguardando" : ""}`}
                  onClick={() => abrirDetalheCurso(curso)}
                  type="button"
                >
                  <img
                    alt=""
                    className="catalogo-card__imagem"
                    loading="lazy"
                    src={resolverImagemCurso(curso)}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getCourseCover(curso);
                    }}
                  />
                  <div className="catalogo-card__corpo">
                    <div className="meus-cursos__titulo-linha">
                      <strong className="catalogo-card__titulo">{curso.titulo}</strong>
                      {ehAdmin ? (
                        <Insignia
                          texto={coordenador || curso.coordenadorId ? "Coordenado" : "Sem coordenador"}
                          variante={coordenador || curso.coordenadorId ? undefined : "aviso"}
                        />
                      ) : null}
                    </div>
                    {ehAdmin ? (
                      <p className="catalogo-card__data">{ROTULO_MODELO_CURSO[Number(curso.modeloCurso)] || "—"}</p>
                    ) : null}
                    <p className="catalogo-card__data">
                      {resumo.alunosMatriculados} aluno{resumo.alunosMatriculados === 1 ? "" : "s"} · {resumo.modulos} modulo{resumo.modulos === 1 ? "" : "s"}
                    </p>
                    <footer className="catalogo-card__rodape-aluno">
                      <span className="catalogo-card__codigo">{curso.codigoRegistro || "Sem codigo"}</span>
                      {ehAdmin ? (
                        <Insignia texto={`Media ${formatGrade(media)}`} />
                      ) : situacaoCoordenador === "aguardando" ? (
                        <Insignia
                          texto={
                            <>
                              <TbAlertTriangle aria-hidden="true" size={12} /> Aguardando você
                            </>
                          }
                          variante="aviso"
                        />
                      ) : situacaoCoordenador === "encerrado" ? (
                        <Insignia
                          texto={
                            <>
                              <TbLock aria-hidden="true" size={12} /> Encerrado
                            </>
                          }
                          variante="neutro"
                        />
                      ) : null}
                    </footer>
                  </div>
                </button>
                {mostrarBotaoPrepararVenda ? (
                  // Fora do <button> do card de proposito - <button> dentro de
                  // <button> e HTML invalido. stopPropagation (plano Round 5,
                  // mesma tecnica do MenuAcoes.jsx) protege contra o clique
                  // tambem abrir o card por algum listener futuro no <li>/<ul>.
                  <Botao
                    onClick={(event) => prepararCursoParaVenda(curso, event)}
                    style={{ marginTop: "var(--espaco-xs)", width: "100%" }}
                    tamanho="pequeno"
                    variante="primario"
                  >
                    <TbTag aria-hidden="true" size={15} /> Preparar para venda
                  </Botao>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {modaisComuns}
    </div>
  );
}
