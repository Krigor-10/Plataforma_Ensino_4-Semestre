import { useEffect, useMemo, useRef, useState } from "react";
import {
  TbCircleCheck,
  TbCircleDot,
  TbEye,
  TbListDetails,
  TbPlus,
  TbSparkles,
  TbTrophy
} from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import BotaoVoltar from "../../components/BotaoVoltar.jsx";
import CartaoCursoModulo from "../../components/CartaoCursoModulo.jsx";
import JanelaPreviaItem from "../../components/JanelaPreviaItem.jsx";
import MenuAcoes from "../../components/MenuAcoes.jsx";
import Modal from "../../components/Modal.jsx";
import PainelItensModulo from "../../components/PainelItensModulo.jsx";
import { InlineMessage } from "../../components/Primitives.jsx";
import { obterIconeTipoConteudo } from "../../components/PreviaTrilhaAluno.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { normalizeContentType } from "../../lib/format.js";
import {
  montarNomesExibicaoQuizzesVinculados,
  montarPayloadAvaliacao,
  montarPayloadConteudo,
  STATUS_ARQUIVADO,
  STATUS_PUBLICADO,
  STATUS_RASCUNHO,
  TITULO_LOTE_POR_ACAO
} from "../../lib/trilhaConteudos.js";

const TIPO_AVALIACAO_QUIZ = 1;

function chaveItem(tipo, id) {
  return `${tipo}:${id}`;
}

// Materiais + quizzes (vinculados a um material ou soltos) do modulo, ja sem
// arquivados - mesma regra de ListaModulosProfessor (SecaoConteudosProfessor.jsx).
function montarDadosDoModulo(moduloId, conteudos, avaliacoes) {
  const conteudosDoModulo = conteudos
    .filter((conteudo) => conteudo.moduloId === moduloId && Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO)
    .slice()
    .sort((left, right) => (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0) || (left.titulo || "").localeCompare(right.titulo || "", "pt-BR"));

  const quizzesDoModulo = avaliacoes.filter(
    (avaliacao) =>
      avaliacao.moduloId === moduloId &&
      Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ &&
      Number(avaliacao.statusPublicacao) !== STATUS_ARQUIVADO
  );

  const quizzesPorConteudoId = new Map();
  const quizzesSoltos = [];
  quizzesDoModulo.forEach((quiz) => {
    if (quiz.conteudoDidaticoId) {
      const atuais = quizzesPorConteudoId.get(quiz.conteudoDidaticoId) || [];
      atuais.push(quiz);
      quizzesPorConteudoId.set(quiz.conteudoDidaticoId, atuais);
    } else {
      quizzesSoltos.push(quiz);
    }
  });

  return { conteudosDoModulo, quizzesDoModulo, quizzesPorConteudoId, quizzesSoltos };
}

// Lista plana (material, quiz vinculado logo depois, quizzes soltos no fim) -
// usada tanto pra "Selecionar tudo"/menus quanto pro Anterior/Proximo da janela.
function montarItensOrdenados(conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos) {
  const itens = [];
  conteudosDoModulo.forEach((conteudo) => {
    itens.push({ id: chaveItem("material", conteudo.id), tipo: "material", titulo: conteudo.titulo, conteudo });
    (quizzesPorConteudoId.get(conteudo.id) || []).forEach((quiz) => {
      itens.push({ id: chaveItem("quiz", quiz.id), tipo: "quiz", titulo: quiz.titulo, quiz, conteudoVinculado: conteudo });
    });
  });
  quizzesSoltos.forEach((quiz) => {
    itens.push({ id: chaveItem("quiz", quiz.id), tipo: "quiz", titulo: quiz.titulo, quiz });
  });
  return itens;
}

// Selo + barra do cartao do curso (professor): % publicado = publicados /
// (publicados + rascunhos) de TODOS os modulos do curso, nao so do aberto.
function montarResumoCurso(modulosOrdenados, conteudos, avaliacoes) {
  const idsModulos = new Set(modulosOrdenados.map((modulo) => modulo.id));
  const materiais = conteudos.filter((conteudo) => idsModulos.has(conteudo.moduloId) && Number(conteudo.statusPublicacao) !== STATUS_ARQUIVADO);
  const quizzes = avaliacoes.filter(
    (avaliacao) =>
      idsModulos.has(avaliacao.moduloId) &&
      Number(avaliacao.tipoAvaliacao) === TIPO_AVALIACAO_QUIZ &&
      Number(avaliacao.statusPublicacao) !== STATUS_ARQUIVADO
  );
  const todos = [...materiais, ...quizzes];
  const totalRascunhos = todos.filter((item) => Number(item.statusPublicacao) === STATUS_RASCUNHO).length;
  const percentualPublicado = todos.length ? Math.round(((todos.length - totalRascunhos) / todos.length) * 100) : 0;
  return { percentualPublicado, totalRascunhos };
}

/* Tela do modulo do professor (docs/TelaConteudosProfessor/PROMPT-agente-
   tela-modulo-lista-e-janela.md + correcoes-1.md, itens 7-8): cartao do
   curso em linha compacta + painel do modulo com linhas grandes, ocupando a
   largura toda (sem coluna de modulos nem seletor) - clicar numa linha abre
   JanelaPreviaItem.jsx (janela grande, com zoom/paginacao/quiz formatado),
   em vez de expandir a linha no lugar como a versao "roteiro da aula" fazia
   (RoteiroModulo/PreviaItemAluno, removidos). A unica forma de trocar de
   modulo e o "← Voltar" (BotaoVoltar), que leva pra lista de modulos do
   curso - ListaModulosCartoes.jsx (coluna lateral) e "Modulo anterior/
   Próximo módulo" foram removidos. Os handlers (onAbrirEdicao,
   onAlternarPublicacao etc.) e os modais que eles abrem (criar/editar
   conteudo, excluir, assistente de quiz/IA) continuam todos em
   SecaoConteudosProfessor.jsx, compartilhados com ListaModulosProfessor -
   esta tela so os aciona. */
export default function TelaModuloGestaoProfessor({
  acaoEmAndamentoId,
  avaliacoes,
  conteudos,
  cursoAtivo,
  edicaoTravada,
  moduloId,
  modulosOrdenados,
  onAbrirEdicao,
  onAlternarPublicacao,
  onAlternarPublicacaoQuiz,
  onArquivarQuiz,
  onExcluir,
  onExcluirQuiz,
  onGerarQuizComIaModulo,
  onGerenciarQuizModulo,
  onNavigate,
  onNovoConteudo,
  onReordenar,
  onSessionExpired,
  onVisualizarComoAluno
}) {
  const { mostrarToast } = useToast();

  const [itemAbertoId, setItemAbertoId] = useState(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState(() => new Set());
  const [loteConfirmacao, setLoteConfirmacao] = useState(null);
  const [loteExecutando, setLoteExecutando] = useState(false);
  const [loteFalhas, setLoteFalhas] = useState([]);
  const [questoesPorAvaliacaoId, setQuestoesPorAvaliacaoId] = useState(() => new Map());
  const [carregandoQuestoesId, setCarregandoQuestoesId] = useState(null);
  const [erroQuestoesId, setErroQuestoesId] = useState(null);
  const [tentativaQuestoesId, setTentativaQuestoesId] = useState(0);
  const quizzesEmAndamentoRef = useRef(new Set());
  const montadoRef = useRef(true);

  const indiceModuloAtual = modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  const moduloAtual = indiceModuloAtual >= 0 ? modulosOrdenados[indiceModuloAtual] : null;

  const { conteudosDoModulo, quizzesDoModulo, quizzesPorConteudoId, quizzesSoltos } = useMemo(
    () => montarDadosDoModulo(moduloId, conteudos, avaliacoes),
    [moduloId, conteudos, avaliacoes]
  );
  const itensOrdenados = useMemo(
    () => montarItensOrdenados(conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos),
    [conteudosDoModulo, quizzesPorConteudoId, quizzesSoltos]
  );
  const resumoCurso = useMemo(() => montarResumoCurso(modulosOrdenados, conteudos, avaliacoes), [modulosOrdenados, conteudos, avaliacoes]);

  useEffect(() => {
    setItemAbertoId(null);
    setModoSelecao(false);
    setItensSelecionados(new Set());
    setLoteFalhas([]);
  }, [moduloId]);

  const indiceItemAberto = itensOrdenados.findIndex((item) => item.id === itemAbertoId);
  const itemAberto = indiceItemAberto >= 0 ? itensOrdenados[indiceItemAberto] : null;
  const itemAnterior = indiceItemAberto > 0 ? itensOrdenados[indiceItemAberto - 1] : null;
  const itemProximo =
    indiceItemAberto >= 0 && indiceItemAberto < itensOrdenados.length - 1 ? itensOrdenados[indiceItemAberto + 1] : null;

  useEffect(() => {
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // Questoes do quiz aberto, carregadas sob demanda pelo mesmo endpoint que o
  // assistente de edicao de quiz ja usa - sem endpoint novo. O "ja estou
  // buscando este quiz" fica num ref (Set), NAO em estado/dependencia do
  // efeito: colocar `carregandoQuestoesId` nas dependencias fazia o proprio
  // `setCarregandoQuestoesId` disparar o efeito de novo, cuja limpeza
  // cancelava (`ativo = false`) a requisicao que tinha acabado de comecar -
  // a resposta chegava depois mas era descartada, e o "Carregando..." ficava
  // preso pra sempre (docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-
  // correcoes-1.md, item 1). A resposta agora e sempre gravada quando chega
  // (o item aberto pode ja ter mudado - tudo bem, o Map guarda por quizId),
  // so nao mexe em estado se o COMPONENTE foi desmontado.
  useEffect(() => {
    if (!itemAberto || itemAberto.tipo !== "quiz") {
      return;
    }

    const quizId = itemAberto.quiz.id;
    if (questoesPorAvaliacaoId.has(quizId) || quizzesEmAndamentoRef.current.has(quizId)) {
      return;
    }

    quizzesEmAndamentoRef.current.add(quizId);
    setCarregandoQuestoesId(quizId);
    setErroQuestoesId((atual) => (atual === quizId ? null : atual));

    apiRequest(`/Avaliacoes/${quizId}/questoes`)
      .then((questoes) => {
        setQuestoesPorAvaliacaoId((atual) => new Map(atual).set(quizId, questoes));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired();
          return;
        }
        mostrarToast(err.message || "Não foi possível carregar as questões agora.", "erro", 6000);
        if (montadoRef.current) {
          setErroQuestoesId(quizId);
        }
      })
      .finally(() => {
        quizzesEmAndamentoRef.current.delete(quizId);
        if (montadoRef.current) {
          setCarregandoQuestoesId((atual) => (atual === quizId ? null : atual));
        }
      });
  }, [itemAberto, questoesPorAvaliacaoId, onSessionExpired, mostrarToast, tentativaQuestoesId]);

  function voltarParaModulos() {
    onNavigate?.(`/app/conteudos/${cursoAtivo.curso.id}`);
  }

  function sairDoModoSelecao() {
    setModoSelecao(false);
    setItensSelecionados(new Set());
  }

  function alternarSelecaoItem(id) {
    setItensSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function alternarSelecaoTudo(chaves) {
    setItensSelecionados((atual) => {
      const todasJaMarcadas = chaves.length > 0 && chaves.every((chave) => atual.has(chave));
      const novo = new Set(atual);
      if (todasJaMarcadas) {
        chaves.forEach((chave) => novo.delete(chave));
      } else {
        chaves.forEach((chave) => novo.add(chave));
      }
      return novo;
    });
  }

  function abrirConfirmacaoLote(acao) {
    if (itensSelecionados.size === 0) {
      return;
    }
    setLoteFalhas([]);
    setLoteConfirmacao({ acao, chaves: Array.from(itensSelecionados) });
  }

  function fecharConfirmacaoLote() {
    if (loteExecutando) {
      return;
    }
    setLoteConfirmacao(null);
  }

  function resolverItemPorChave(chave) {
    const [tipo, idTexto] = chave.split(":");
    const id = Number(idTexto);
    const dado =
      tipo === "material"
        ? conteudosDoModulo.find((item) => item.id === id)
        : quizzesDoModulo.find((item) => item.id === id);
    return { tipo, id, dado };
  }

  async function executarAcaoLote() {
    if (!loteConfirmacao) {
      return;
    }

    const itens = loteConfirmacao.chaves.map(resolverItemPorChave).filter((item) => item.dado);
    // Exclusao recusa conteudo com quiz vinculado (ConteudoDidaticoService),
    // entao os quizzes do lote precisam sair primeiro.
    const ordem = loteConfirmacao.acao === "excluir" ? [...itens].sort((a) => (a.tipo === "quiz" ? -1 : 1)) : itens;
    const statusAlvoPorAcao = { publicar: STATUS_PUBLICADO, rascunho: STATUS_RASCUNHO, arquivar: STATUS_ARQUIVADO };
    const statusAlvo = statusAlvoPorAcao[loteConfirmacao.acao];

    setLoteExecutando(true);

    const contagem = { excluidos: 0, arquivados: 0, publicados: 0, rascunhos: 0, ignorados: 0 };
    const falhas = [];
    const falharam = new Set();

    for (const item of ordem) {
      try {
        if (loteConfirmacao.acao === "excluir") {
          const endpoint = item.tipo === "material" ? `/ConteudosDidaticos/${item.id}` : `/Avaliacoes/${item.id}`;
          const resultado = await apiRequest(endpoint, { method: "DELETE" });
          if (resultado?.arquivado) {
            contagem.arquivados += 1;
          } else {
            contagem.excluidos += 1;
          }
        } else if (Number(item.dado.statusPublicacao) === statusAlvo) {
          contagem.ignorados += 1;
        } else if (item.tipo === "material") {
          await apiRequest(`/ConteudosDidaticos/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(montarPayloadConteudo(item.dado, { statusPublicacao: statusAlvo }))
          });
          if (statusAlvo === STATUS_PUBLICADO) contagem.publicados += 1;
          else if (statusAlvo === STATUS_RASCUNHO) contagem.rascunhos += 1;
          else contagem.arquivados += 1;
        } else {
          await apiRequest(`/Avaliacoes/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(montarPayloadAvaliacao(item.dado, { statusPublicacao: statusAlvo }))
          });
          if (statusAlvo === STATUS_PUBLICADO) contagem.publicados += 1;
          else if (statusAlvo === STATUS_RASCUNHO) contagem.rascunhos += 1;
          else contagem.arquivados += 1;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setLoteExecutando(false);
          setLoteConfirmacao(null);
          onSessionExpired();
          return;
        }

        falharam.add(chaveItem(item.tipo, item.id));
        falhas.push({ titulo: item.dado.titulo, motivo: err.message || "Não foi possível concluir esta ação." });
      }
    }

    setLoteExecutando(false);
    setLoteConfirmacao(null);
    setLoteFalhas(falhas);
    setItensSelecionados(falharam);

    const partes = [];
    if (contagem.excluidos > 0) partes.push(`${contagem.excluidos} excluído${contagem.excluidos === 1 ? "" : "s"}`);
    if (contagem.arquivados > 0) partes.push(`${contagem.arquivados} arquivado${contagem.arquivados === 1 ? "" : "s"}`);
    if (contagem.publicados > 0) partes.push(`${contagem.publicados} publicado${contagem.publicados === 1 ? "" : "s"}`);
    if (contagem.rascunhos > 0) partes.push(`${contagem.rascunhos} voltou pra rascunho`);
    if (contagem.ignorados > 0) partes.push(`${contagem.ignorados} já estava nesse status`);
    if (falhas.length > 0) partes.push(`${falhas.length} falhou`);
    mostrarToast(partes.length > 0 ? partes.join(", ") : "Nada para fazer.", falhas.length > 0 ? "aviso" : "sucesso");
  }

  if (!moduloAtual) {
    return null;
  }

  const moduloVazio = itensOrdenados.length === 0;
  const totalConteudos = conteudosDoModulo.length;
  const totalQuizzes = quizzesDoModulo.length;
  const totalItensModulo = totalConteudos + totalQuizzes;
  const totalRascunhosModulo = [...conteudosDoModulo, ...quizzesDoModulo].filter(
    (item) => Number(item.statusPublicacao) === STATUS_RASCUNHO
  ).length;
  const resumoModulo = `${totalConteudos} conteúdo${totalConteudos === 1 ? "" : "s"} · ${totalQuizzes} quiz${totalQuizzes === 1 ? "" : "zes"}`;

  const chavesSelecionaveis = [
    ...conteudosDoModulo.map((item) => chaveItem("material", item.id)),
    ...quizzesDoModulo.map((item) => chaveItem("quiz", item.id))
  ];
  const totalSelecionado = chavesSelecionaveis.filter((chave) => itensSelecionados.has(chave)).length;
  const todosSelecionados = chavesSelecionaveis.length > 0 && totalSelecionado === chavesSelecionaveis.length;
  const algunsSelecionados = totalSelecionado > 0 && !todosSelecionados;

  const itensMaisAcoes = [
    {
      chave: "publicar",
      rotulo: "Publicar selecionados",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("publicar")
    },
    {
      chave: "rascunho",
      rotulo: "Voltar para rascunho",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("rascunho")
    },
    {
      chave: "arquivar",
      rotulo: "Arquivar selecionados",
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("arquivar")
    },
    {
      chave: "excluir",
      rotulo: "Excluir selecionados",
      perigo: true,
      desabilitado: edicaoTravada || totalSelecionado === 0,
      onSelecionar: () => abrirConfirmacaoLote("excluir")
    }
  ];

  // Base das acoes do material, sem "Visualizar" - usada tanto pela linha
  // (que acrescenta "Visualizar" na frente) quanto pelo ⋮ da janela de
  // previa (que ja esta com o item aberto, entao nao precisa do atalho).
  function itensMenuMaterial(conteudo, indiceConteudo) {
    const publicado = Number(conteudo.statusPublicacao) === STATUS_PUBLICADO;
    const processando = acaoEmAndamentoId === conteudo.id;
    return [
      { chave: "editar", rotulo: "Editar", desabilitado: edicaoTravada || processando, onSelecionar: () => onAbrirEdicao(conteudo) },
      {
        chave: "alternar-status",
        rotulo: publicado ? "Voltar para rascunho" : "Publicar",
        desabilitado: edicaoTravada,
        onSelecionar: () => onAlternarPublicacao(conteudo)
      },
      {
        chave: "mover-cima",
        rotulo: "Mover para cima",
        desabilitado: edicaoTravada || processando || indiceConteudo === 0,
        onSelecionar: () => onReordenar(conteudo, conteudosDoModulo, -1)
      },
      {
        chave: "mover-baixo",
        rotulo: "Mover para baixo",
        desabilitado: edicaoTravada || processando || indiceConteudo === conteudosDoModulo.length - 1,
        onSelecionar: () => onReordenar(conteudo, conteudosDoModulo, 1)
      },
      { chave: "excluir", rotulo: "Excluir", perigo: true, desabilitado: edicaoTravada, onSelecionar: () => onExcluir(conteudo) }
    ];
  }

  // Idem acima, sem "Visualizar" na base.
  function itensMenuQuiz(quiz) {
    const publicado = Number(quiz.statusPublicacao) === STATUS_PUBLICADO;
    const processando = acaoEmAndamentoId === quiz.id;
    return [
      {
        chave: "editar",
        rotulo: "Editar",
        desabilitado: edicaoTravada || processando,
        onSelecionar: () => onGerenciarQuizModulo(moduloAtual, quiz)
      },
      {
        chave: "alternar-status",
        rotulo: publicado ? "Voltar para rascunho" : "Publicar",
        desabilitado: edicaoTravada,
        onSelecionar: () => onAlternarPublicacaoQuiz(quiz)
      },
      { chave: "arquivar", rotulo: "Arquivar", desabilitado: edicaoTravada, onSelecionar: () => onArquivarQuiz(quiz) },
      { chave: "excluir", rotulo: "Excluir", perigo: true, desabilitado: edicaoTravada, onSelecionar: () => onExcluirQuiz(quiz) }
    ];
  }

  const nomesQuizzesSoltos = montarNomesExibicaoQuizzesVinculados(quizzesSoltos, moduloAtual.titulo);
  const nomesQuizzesPorConteudoId = new Map(
    conteudosDoModulo.map((conteudo) => [
      conteudo.id,
      montarNomesExibicaoQuizzesVinculados(quizzesPorConteudoId.get(conteudo.id) || [], conteudo.titulo)
    ])
  );

  function tituloExibicaoItem(item) {
    if (item.tipo === "material") {
      return item.conteudo.titulo;
    }
    if (item.conteudoVinculado) {
      return nomesQuizzesPorConteudoId.get(item.conteudoVinculado.id)?.get(item.quiz.id) || item.quiz.titulo;
    }
    return nomesQuizzesSoltos.get(item.quiz.id) || item.quiz.titulo;
  }

  const linhas = itensOrdenados.map((item) => {
    const dado = item.tipo === "material" ? item.conteudo : item.quiz;
    const publicado = Number(dado.statusPublicacao) === STATUS_PUBLICADO;
    const tituloReal = item.tipo === "material" ? item.conteudo.titulo : item.quiz.titulo;
    const tituloExibicao = tituloExibicaoItem(item);

    if (item.tipo === "material") {
      const tipoTexto = normalizeContentType(item.conteudo.tipoConteudo);
      return {
        id: item.id,
        tituloReal,
        tituloExibicao,
        descricao: item.conteudo.descricao || "",
        corIcone: "verde",
        iconeTipo: obterIconeTipoConteudo(item.conteudo.tipoConteudo, "1.6rem"),
        dadosLinha: (
          <>
            <span className="painel-itens-modulo__item-dados-parte">
              {obterIconeTipoConteudo(item.conteudo.tipoConteudo, "0.85rem")} {tipoTexto}
            </span>
            <span aria-hidden="true">|</span>
            <span className="painel-itens-modulo__item-dados-parte">
              {publicado ? <TbCircleCheck aria-hidden="true" size="0.85rem" /> : <TbCircleDot aria-hidden="true" size="0.85rem" />}{" "}
              {publicado ? "Publicado" : "Rascunho"}
            </span>
          </>
        ),
        seloTipo: { icone: obterIconeTipoConteudo(item.conteudo.tipoConteudo, "0.85rem"), texto: tipoTexto },
        menuItens: [
          { chave: "visualizar", rotulo: "Visualizar", onSelecionar: () => setItemAbertoId(item.id) },
          ...itensMenuMaterial(item.conteudo, conteudosDoModulo.indexOf(item.conteudo))
        ],
        onAbrir: () => setItemAbertoId(item.id)
      };
    }

    const totalQuestoesQuiz = item.quiz.totalQuestoes || 0;
    return {
      id: item.id,
      tituloReal,
      tituloExibicao,
      descricao: "",
      corIcone: publicado ? "verde" : "roxo",
      iconeTipo: <TbTrophy aria-hidden="true" size="1.6rem" />,
      dadosLinha: (
        <>
          <span className="painel-itens-modulo__item-dados-parte">
            <TbListDetails aria-hidden="true" size="0.85rem" /> {totalQuestoesQuiz} {totalQuestoesQuiz === 1 ? "questão" : "questões"}
          </span>
          <span aria-hidden="true">|</span>
          <span className="painel-itens-modulo__item-dados-parte">
            {publicado ? <TbCircleCheck aria-hidden="true" size="0.85rem" /> : <TbCircleDot aria-hidden="true" size="0.85rem" />}{" "}
            {publicado ? "Publicado" : "Rascunho"}
          </span>
        </>
      ),
      seloTipo: { icone: <TbTrophy aria-hidden="true" size="0.85rem" />, texto: "Quiz" },
      menuItens: [
        { chave: "visualizar", rotulo: "Visualizar", onSelecionar: () => setItemAbertoId(item.id) },
        ...itensMenuQuiz(item.quiz)
      ],
      onAbrir: () => setItemAbertoId(item.id)
    };
  });

  const numeroModuloTexto = `Módulo ${String(indiceModuloAtual + 1).padStart(2, "0")}`;
  const itemAbertoPublicado = itemAberto ? Number((itemAberto.tipo === "material" ? itemAberto.conteudo : itemAberto.quiz).statusPublicacao) === STATUS_PUBLICADO : false;

  return (
    <div className="modulo-gestao modulo-lista-janela">
      <div className="modulo-lista-janela__caminho">
        <div className="modulo-lista-janela__caminho-navegacao">
          <BotaoVoltar destino="Conteúdos" onClick={voltarParaModulos} />
          <span className="modulo-lista-janela__caminho-texto">Acadêmico › Conteúdos › {moduloAtual.titulo}</span>
        </div>

        {!edicaoTravada ? (
          <div className="atividades-curso__cabecalho-acoes">
            <Botao onClick={() => onVisualizarComoAluno?.()} tamanho="pequeno" variante="secundario">
              <TbEye aria-hidden="true" size={15} /> Visualizar como aluno
            </Botao>
            {conteudosDoModulo.some((conteudo) => [1, 2].includes(Number(conteudo.tipoConteudo))) ? (
              <Botao className="atividades-curso__adicionar--ia" onClick={() => onGerarQuizComIaModulo(moduloAtual)} tamanho="pequeno">
                <TbSparkles aria-hidden="true" size={13} /> Gerar quiz com IA
              </Botao>
            ) : null}
            <Botao className="atividades-curso__adicionar--quiz" onClick={() => onGerenciarQuizModulo(moduloAtual)} tamanho="pequeno">
              <TbPlus aria-hidden="true" size={13} /> Adicionar Quiz
            </Botao>
            <Botao onClick={() => onNovoConteudo(moduloAtual.id)} tamanho="pequeno" variante="primario">
              <TbPlus aria-hidden="true" size={13} /> Novo conteúdo
            </Botao>
          </div>
        ) : null}
      </div>

      {edicaoTravada ? (
        <InlineMessage tone="warning">A edição deste curso está travada. A prévia continua funcionando.</InlineMessage>
      ) : null}

      <CartaoCursoModulo
        curso={cursoAtivo.curso}
        legendaProgresso={`${resumoCurso.percentualPublicado}% publicado`}
        percentual={resumoCurso.percentualPublicado}
        selo={resumoCurso.totalRascunhos > 0 ? `${resumoCurso.totalRascunhos} rascunho${resumoCurso.totalRascunhos === 1 ? "" : "s"}` : null}
        seloVariante="aviso"
        variante="medio"
      />

      <div className="modulo-lista-janela__painel">
        <PainelItensModulo
          barraSelecao={
            modoSelecao || loteFalhas.length > 0 ? (
              <>
                {modoSelecao ? (
                  <div className="atividades-curso__barra-selecao">
                    <label className="atividades-curso__selecionar-tudo">
                      <span className="atividades-curso__checkbox-alvo">
                        <input
                          checked={todosSelecionados}
                          className="tabela-checkbox"
                          onChange={() => alternarSelecaoTudo(chavesSelecionaveis)}
                          ref={(elemento) => {
                            if (elemento) {
                              elemento.indeterminate = algunsSelecionados;
                            }
                          }}
                          type="checkbox"
                        />
                      </span>
                      Selecionar tudo
                    </label>
                    <span aria-hidden="true" className="atividades-curso__barra-divisoria" />
                    <span aria-live="polite" className="atividades-curso__contagem-selecao">
                      {totalSelecionado} selecionado{totalSelecionado === 1 ? "" : "s"}
                    </span>
                    <MenuAcoes itens={itensMaisAcoes} rotulo="Mais ações" textoBotao="Mais ações" varianteBotao="fantasma" />
                    <Botao onClick={sairDoModoSelecao} tamanho="pequeno" variante="fantasma">
                      Cancelar
                    </Botao>
                  </div>
                ) : null}
                {loteFalhas.length > 0 ? (
                  <InlineMessage tone="error">
                    <strong>{loteFalhas.length} {loteFalhas.length === 1 ? "item não foi processado" : "itens não foram processados"}:</strong>
                    <ul className="atividades-curso__lote-falhas-lista">
                      {loteFalhas.map((falha, indiceFalha) => (
                        <li key={indiceFalha}>{falha.titulo} — {falha.motivo}</li>
                      ))}
                    </ul>
                  </InlineMessage>
                ) : null}
              </>
            ) : null
          }
          itensSelecionados={itensSelecionados}
          linhas={linhas}
          mensagemVazia="Este módulo ainda não tem conteúdo. Use os botões no topo para criar o primeiro."
          modoSelecao={modoSelecao}
          moduloTitulo={moduloAtual.titulo}
          moduloVazio={moduloVazio}
          mostrarSelecionar={!edicaoTravada}
          moduloIndice={indiceModuloAtual}
          onEntrarSelecao={() => setModoSelecao(true)}
          onSelecionarItem={alternarSelecaoItem}
          resumoModulo={resumoModulo}
          totalItens={totalItensModulo}
          totalRascunhosModulo={totalRascunhosModulo}
        />
      </div>

      {itemAberto ? (
        <JanelaPreviaItem
          carregandoQuestoes={itemAberto.tipo === "quiz" && carregandoQuestoesId === itemAberto.quiz.id}
          erroQuestoes={itemAberto.tipo === "quiz" && erroQuestoesId === itemAberto.quiz.id}
          indiceAtual={indiceItemAberto + 1}
          item={{
            id: itemAberto.id,
            tipo: itemAberto.tipo,
            titulo: tituloExibicaoItem(itemAberto),
            conteudo: itemAberto.conteudo,
            questoes: itemAberto.tipo === "quiz" ? questoesPorAvaliacaoId.get(itemAberto.quiz.id) : undefined
          }}
          itemAnterior={itemAnterior}
          itemProximo={itemProximo}
          menuItens={
            itemAberto.tipo === "material"
              ? itensMenuMaterial(itemAberto.conteudo, conteudosDoModulo.indexOf(itemAberto.conteudo))
              : itensMenuQuiz(itemAberto.quiz)
          }
          numeroModuloTexto={numeroModuloTexto}
          onAnterior={() => itemAnterior && setItemAbertoId(itemAnterior.id)}
          onFechar={() => setItemAbertoId(null)}
          onProximo={() => itemProximo && setItemAbertoId(itemProximo.id)}
          onTentarNovamenteQuestoes={() => setTentativaQuestoesId((atual) => atual + 1)}
          publicado={itemAbertoPublicado}
          somenteLeitura={false}
          totalItens={itensOrdenados.length}
        />
      ) : null}

      {loteConfirmacao ? (
        <Modal
          onFechar={fecharConfirmacaoLote}
          titulo={TITULO_LOTE_POR_ACAO[loteConfirmacao.acao]}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={loteExecutando} onClick={fecharConfirmacaoLote} type="button" variante="perigo">
                Cancelar
              </Botao>
              <Botao disabled={loteExecutando} onClick={executarAcaoLote} type="button" variante="sucesso">
                {loteExecutando ? "Processando..." : "Confirmar"}
              </Botao>
            </footer>
          }
        >
          <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0 }}>
            {loteConfirmacao.acao === "excluir" ? "Excluir" : loteConfirmacao.acao === "publicar" ? "Publicar" : loteConfirmacao.acao === "arquivar" ? "Arquivar" : "Voltar para rascunho"}{" "}
            {loteConfirmacao.chaves.length} item{loteConfirmacao.chaves.length === 1 ? "" : "s"} selecionado{loteConfirmacao.chaves.length === 1 ? "" : "s"}?
            {loteConfirmacao.acao === "publicar" ? " Os alunos serão notificados de cada conteúdo publicado." : ""}
            {loteConfirmacao.acao === "excluir" ? " Itens com progresso ou tentativa de aluno são arquivados em vez de excluídos definitivamente." : ""}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
