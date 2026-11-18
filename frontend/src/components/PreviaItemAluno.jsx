import { useState } from "react";
import { Document, Page } from "react-pdf";
import { TbExternalLink, TbMaximize } from "react-icons/tb";
import GabaritoQuestoes from "./GabaritoQuestoes.jsx";
import Insignia from "./Insignia.jsx";
import { InlineMessage } from "./Primitives.jsx";
import VisualizadorImagem from "./VisualizadorImagem.jsx";
import VisualizadorPdf from "./VisualizadorPdf.jsx";
import { obterLinkArquivoConteudo } from "./PreviaTrilhaAluno.jsx";
import { normalizeContentType } from "../lib/format.js";

const TIPO_CONTEUDO_PDF = 2;
const TIPO_CONTEUDO_VIDEO = 3;
const TIPO_CONTEUDO_LINK = 4;
const TIPO_CONTEUDO_IMAGEM = 5;

const ALTURA_MIDIA_INLINE = 300;

const MENSAGEM_SEM_ARQUIVO = "Este item ainda não tem arquivo.";

function PreviaMaterial({ conteudo }) {
  const [visualizadorAberto, setVisualizadorAberto] = useState(false);
  const tipo = Number(conteudo.tipoConteudo);
  const linkArquivo = obterLinkArquivoConteudo(conteudo);

  if (tipo === TIPO_CONTEUDO_IMAGEM) {
    if (!linkArquivo) {
      return <p className="previa-item-aluno__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
    }

    return (
      <>
        <div className="previa-item-aluno__imagem">
          <img alt={conteudo.titulo} className="previa-item-aluno__imagem-img" src={linkArquivo} />
          <button aria-label="Ampliar imagem" className="previa-item-aluno__ampliar" onClick={() => setVisualizadorAberto(true)} type="button">
            <TbMaximize aria-hidden="true" size="1rem" /> Ampliar
          </button>
        </div>
        {visualizadorAberto ? (
          <VisualizadorImagem onFechar={() => setVisualizadorAberto(false)} titulo={conteudo.titulo} url={linkArquivo} />
        ) : null}
      </>
    );
  }

  if (tipo === TIPO_CONTEUDO_PDF) {
    if (!linkArquivo) {
      return <p className="previa-item-aluno__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
    }

    return (
      <>
        <div className="previa-item-aluno__pdf">
          <Document
            error={
              <div className="previa-item-aluno__pdf-indisponivel">
                <span>Não foi possível mostrar a prévia do PDF.</span>
              </div>
            }
            file={linkArquivo}
            loading="Carregando PDF…"
          >
            <Page height={ALTURA_MIDIA_INLINE} pageNumber={1} />
          </Document>
          <button aria-label="Ampliar PDF" className="previa-item-aluno__ampliar" onClick={() => setVisualizadorAberto(true)} type="button">
            <TbMaximize aria-hidden="true" size="1rem" /> Ampliar
          </button>
        </div>
        {visualizadorAberto ? (
          <VisualizadorPdf onFechar={() => setVisualizadorAberto(false)} titulo={conteudo.titulo} url={linkArquivo} />
        ) : null}
      </>
    );
  }

  if (tipo === TIPO_CONTEUDO_VIDEO) {
    if (!linkArquivo) {
      return <p className="previa-item-aluno__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
    }

    return (
      <video className="previa-item-aluno__video" controls preload="metadata" src={linkArquivo}>
        <track kind="captions" />
      </video>
    );
  }

  if (tipo === TIPO_CONTEUDO_LINK) {
    if (!linkArquivo) {
      return <p className="previa-item-aluno__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
    }

    return (
      <div className="previa-item-aluno__link-cartao">
        <TbExternalLink aria-hidden="true" size="1.3rem" />
        <span className="previa-item-aluno__link-endereco">{linkArquivo}</span>
        <a className="botao botao--secundario botao--pequeno" href={linkArquivo} rel="noreferrer" target="_blank">
          Abrir link
        </a>
      </div>
    );
  }

  const texto = conteudo.corpoTexto || conteudo.descricao;
  if (!texto) {
    return <p className="previa-item-aluno__vazio">{MENSAGEM_SEM_ARQUIVO}</p>;
  }

  return <p className="previa-item-aluno__texto">{texto}</p>;
}

function PreviaQuiz({ questoes }) {
  if (!questoes || questoes.length === 0) {
    return <p className="previa-item-aluno__vazio">Este quiz ainda não tem questões.</p>;
  }

  return <GabaritoQuestoes questoes={questoes} />;
}

/* Previa de UM item (material ou quiz) EXATAMENTE como o aluno ve -
   docs/TelaConteudosProfessor/PROMPT-agente-fluxo-professor-igual-
   coordenador.md, etapa 1. Substitui LeituraItemConteudo.jsx (que so
   mostrava tipo+descricao+"Abrir arquivo") no painel da tela do modulo:
   agora imagem/PDF/video/link renderizam inline, igual SecoesAluno.jsx
   (obterAcaoConteudoAluno). Reaproveitada pelo Coordenador/Admin
   (TelaModuloGestao.jsx, selo "Somente leitura", sem rodape) e pelo
   Professor (tela do modulo do professor, selo Publicado/Rascunho, com
   aviso de rascunho e rodape de acoes) - a UNICA diferenca entre as duas
   e o que cada chamador passa nessas props. */
export default function PreviaItemAluno({ aviso, item, questoes, rodape, selo }) {
  const varianteSelo = selo === "Somente leitura" ? "info" : undefined;

  return (
    <div className="previa-item-aluno">
      <div className="previa-item-aluno__cabecalho">
        <div className="previa-item-aluno__cabecalho-texto">
          <h3 className="previa-item-aluno__titulo">{item.titulo}</h3>
          <p className="previa-item-aluno__tipo">
            {item.tipo === "quiz" ? "QUIZ" : normalizeContentType(item.conteudo.tipoConteudo).toUpperCase()}
          </p>
        </div>
        {selo ? <Insignia texto={selo} variante={varianteSelo} /> : null}
      </div>

      {aviso ? <InlineMessage tone="warning">{aviso}</InlineMessage> : null}

      <div className="previa-item-aluno__corpo">
        {item.tipo === "quiz" ? <PreviaQuiz questoes={questoes} /> : <PreviaMaterial conteudo={item.conteudo} />}
      </div>

      {rodape ? <div className="previa-item-aluno__rodape">{rodape}</div> : null}
    </div>
  );
}
