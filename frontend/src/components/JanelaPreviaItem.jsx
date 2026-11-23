import { useEffect, useState } from "react";
import { TbArrowLeft, TbArrowRight, TbExternalLink } from "react-icons/tb";
import Botao from "./Botao.jsx";
import GabaritoQuestoes from "./GabaritoQuestoes.jsx";
import ImagemComZoom from "./ImagemComZoom.jsx";
import Insignia from "./Insignia.jsx";
import MenuAcoes from "./MenuAcoes.jsx";
import Modal from "./Modal.jsx";
import VisualizadorPdfConteudo from "./VisualizadorPdfConteudo.jsx";
import { InlineMessage } from "./Primitives.jsx";
import { obterLinkArquivoConteudo } from "./PreviaTrilhaAluno.jsx";
import { normalizeContentType } from "../lib/format.js";

const TIPO_CONTEUDO_PDF = 2;
const TIPO_CONTEUDO_VIDEO = 3;
const TIPO_CONTEUDO_LINK = 4;
const TIPO_CONTEUDO_IMAGEM = 5;

const MENSAGEM_SEM_ARQUIVO = "Este item ainda não tem arquivo.";

function CorpoMaterial({ conteudo }) {
  const tipo = Number(conteudo.tipoConteudo);
  const linkArquivo = obterLinkArquivoConteudo(conteudo);

  if (!linkArquivo && tipo !== 1) {
    return <p className="janela-previa-item__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
  }

  if (tipo === TIPO_CONTEUDO_IMAGEM) {
    return <ImagemComZoom alt={conteudo.titulo} url={linkArquivo} />;
  }

  if (tipo === TIPO_CONTEUDO_PDF) {
    return <VisualizadorPdfConteudo url={linkArquivo} />;
  }

  if (tipo === TIPO_CONTEUDO_VIDEO) {
    return (
      <video className="janela-previa-item__video" controls preload="metadata" src={linkArquivo}>
        <track kind="captions" />
      </video>
    );
  }

  if (tipo === TIPO_CONTEUDO_LINK) {
    return (
      <div className="janela-previa-item__link-cartao">
        <TbExternalLink aria-hidden="true" size="1.3rem" />
        <span className="janela-previa-item__link-endereco">{linkArquivo}</span>
        <a className="botao botao--secundario botao--pequeno" href={linkArquivo} rel="noreferrer" target="_blank">
          Abrir link
        </a>
      </div>
    );
  }

  const texto = conteudo.corpoTexto || conteudo.descricao;
  return texto ? <p className="janela-previa-item__texto">{texto}</p> : <p className="janela-previa-item__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
}

function CorpoQuiz({ carregando, erro, indiceQuestao, mostrarGabarito, onMudarMostrarGabarito, onSelecionarQuestao, onTentarNovamente, questoes }) {
  if (carregando) {
    return (
      <p className="texto-vazio" role="status">
        Carregando questões…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="janela-previa-item__erro">
        <p className="janela-previa-item__vazio" role="alert">
          Não foi possível carregar as questões.
        </p>
        <Botao onClick={onTentarNovamente} tamanho="pequeno" variante="secundario">
          Tentar de novo
        </Botao>
      </div>
    );
  }

  if (!questoes || questoes.length === 0) {
    return <p className="janela-previa-item__vazio">Este quiz ainda não tem questões.</p>;
  }

  const questaoAtual = questoes[indiceQuestao] || questoes[0];

  return (
    <div className="janela-previa-item__quiz">
      <nav aria-label="Questões" className="janela-previa-item__quiz-lista">
        {questoes.map((questao, indice) => (
          <button
            aria-current={indice === indiceQuestao ? "true" : undefined}
            className="janela-previa-item__quiz-item-lista"
            key={questao.id}
            onClick={() => onSelecionarQuestao(indice)}
            type="button"
          >
            <span className="janela-previa-item__quiz-numero">{indice + 1}</span> Questão {indice + 1}
          </button>
        ))}
      </nav>

      <div className="janela-previa-item__quiz-corpo">
        <label className="janela-previa-item__quiz-toggle">
          <input
            checked={mostrarGabarito}
            onChange={(evento) => onMudarMostrarGabarito(evento.target.checked)}
            type="checkbox"
          />
          Mostrar gabarito
        </label>

        <GabaritoQuestoes mostrarFicha mostrarGabarito={mostrarGabarito} numeroInicial={indiceQuestao} questoes={[questaoAtual]} />
      </div>
    </div>
  );
}

/* Janela grande de previa de UM item do modulo (material ou quiz), docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item 4
   - substitui o bloco "aberto" do roteiro da aula (RoteiroModulo/
   PreviaItemAluno, removidos) nas duas telas do modulo (Professor e
   Coordenador/Admin). Construida em cima de Modal.jsx (foco preso, Esc,
   aria-modal ja prontos) com `fecharAoClicarFora` (unica tela do app com
   esse comportamento) e a classe `modal-caixa--janela-item` (~1080px/90dvh,
   tela cheia abaixo de 768px).

   Quiz tem navegacao PROPRIA entre questoes (indiceQuestao, estado local,
   zera a cada item novo) - o rodape da janela e UNICO e compartilhado entre
   todos os tipos: pra quiz, "Anterior/Proximo" andam entre questoes
   primeiro, e so viram "item anterior/proximo" (onAnterior/onProximo, que
   fecham perguntas e trocam de item) quando a questao aberta e a 1a/ultima -
   o contador "Item X de N" sempre conta ITENS do modulo (nunca questoes),
   igual pros outros tipos. */
export default function JanelaPreviaItem({
  carregandoQuestoes,
  erroQuestoes,
  indiceAtual,
  item,
  itemAnterior,
  itemProximo,
  menuItens,
  numeroModuloTexto,
  onAnterior,
  onFechar,
  onProximo,
  onTentarNovamenteQuestoes,
  publicado,
  somenteLeitura,
  totalItens
}) {
  const [indiceQuestao, setIndiceQuestao] = useState(0);
  const [mostrarGabarito, setMostrarGabarito] = useState(true);

  useEffect(() => {
    setIndiceQuestao(0);
    setMostrarGabarito(true);
  }, [item.id]);

  const ehQuiz = item.tipo === "quiz";
  const questoes = ehQuiz ? item.questoes : undefined;
  const totalQuestoes = questoes?.length || 0;
  const temQuestaoAnterior = ehQuiz && indiceQuestao > 0;
  const temQuestaoProxima = ehQuiz && indiceQuestao < totalQuestoes - 1;

  function aoClicarAnterior() {
    if (temQuestaoAnterior) {
      setIndiceQuestao((atual) => atual - 1);
      return;
    }
    onAnterior?.();
  }

  function aoClicarProximo() {
    if (temQuestaoProxima) {
      setIndiceQuestao((atual) => atual + 1);
      return;
    }
    onProximo?.();
  }

  const tituloTipo = ehQuiz ? "Quiz" : normalizeContentType(item.conteudo.tipoConteudo);
  // O rotulo/aria-label reflete o que o clique VAI fazer, nao o tipo do item:
  // num quiz de 1 questao so, "anterior"/"proximo" ja pulam de item direto
  // (fica "Item anterior"/"Proximo item", igual a material) - so vira
  // "Questao anterior"/"Proxima questao" quando sobra questao pra navegar.
  const anteriorEhQuestao = ehQuiz && temQuestaoAnterior;
  const proximoEhQuestao = ehQuiz && temQuestaoProxima;
  const anteriorDesabilitado = anteriorEhQuestao ? false : !itemAnterior;
  const proximoDesabilitado = proximoEhQuestao ? false : !itemProximo;

  return (
    <Modal
      acoes={
        <div className="janela-previa-item__acoes-cabecalho">
          <Insignia texto={somenteLeitura ? "Somente leitura" : publicado ? "Publicado" : "Rascunho"} />
          {!somenteLeitura && menuItens ? <MenuAcoes itens={menuItens} rotulo={`Opções de ${item.titulo}`} /> : null}
        </div>
      }
      className="modal-caixa--janela-item"
      fecharAoClicarFora
      onFechar={onFechar}
      subtitulo={`${tituloTipo} · ${numeroModuloTexto}`}
      titulo={item.titulo}
      rodape={
        <footer className="modal-rodape janela-previa-item__rodape">
          <Botao
            aria-label={anteriorEhQuestao ? "Questão anterior" : "Item anterior"}
            disabled={anteriorDesabilitado}
            onClick={aoClicarAnterior}
            title={!anteriorEhQuestao ? itemAnterior?.titulo : undefined}
            type="button"
            variante="secundario"
          >
            <TbArrowLeft aria-hidden="true" size={16} /> {anteriorEhQuestao ? "Questão anterior" : "Anterior"}
          </Botao>
          <span className="janela-previa-item__rodape-contador">
            Item {indiceAtual} de {totalItens}
          </span>
          <Botao
            aria-label={proximoEhQuestao ? "Próxima questão" : "Próximo item"}
            disabled={proximoDesabilitado}
            onClick={aoClicarProximo}
            title={!proximoEhQuestao ? itemProximo?.titulo : undefined}
            type="button"
            variante="primario"
          >
            {proximoEhQuestao ? "Próxima questão" : "Próximo"} <TbArrowRight aria-hidden="true" size={16} />
          </Botao>
        </footer>
      }
    >
      {!somenteLeitura && !publicado ? (
        <InlineMessage tone="warning">Rascunho — os alunos ainda não veem este item.</InlineMessage>
      ) : null}

      {ehQuiz ? (
        <CorpoQuiz
          carregando={Boolean(carregandoQuestoes)}
          erro={Boolean(erroQuestoes)}
          indiceQuestao={indiceQuestao}
          mostrarGabarito={mostrarGabarito}
          onMudarMostrarGabarito={setMostrarGabarito}
          onSelecionarQuestao={setIndiceQuestao}
          onTentarNovamente={onTentarNovamenteQuestoes}
          questoes={questoes}
        />
      ) : (
        <CorpoMaterial conteudo={item.conteudo} />
      )}
    </Modal>
  );
}
