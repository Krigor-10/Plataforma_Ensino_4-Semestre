import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { TbChevronLeft, TbChevronRight, TbDownload, TbZoomIn, TbZoomOut } from "react-icons/tb";
import { InlineMessage } from "./Primitives.jsx";
import Modal from "./Modal.jsx";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ESCALA_MIN = 0.6;
const ESCALA_MAX = 2.2;
const ESCALA_PASSO = 0.2;

export default function VisualizadorPdf({ onFechar, titulo, url }) {
  const [totalPaginas, setTotalPaginas] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [escala, setEscala] = useState(1);
  const [erro, setErro] = useState(null);

  function aoCarregar({ numPages }) {
    setTotalPaginas(numPages);
    setErro(null);
  }

  function aoFalharCarregar() {
    setErro("Nao foi possivel carregar este PDF. Tente baixar o arquivo.");
  }

  return (
    <Modal
      acoes={
        <a className="botao botao--fantasma botao--pequeno" download href={url} rel="noreferrer" target="_blank">
          <TbDownload aria-hidden="true" size="1.1rem" />
          Baixar
        </a>
      }
      className="modal-caixa--preview"
      onFechar={onFechar}
      rodape={
        totalPaginas ? (
          <div className="modal-rodape visualizador-pdf__rodape">
            <div className="visualizador-pdf__navegacao">
              <button
                aria-label="Pagina anterior"
                disabled={paginaAtual <= 1}
                onClick={() => setPaginaAtual((atual) => Math.max(1, atual - 1))}
                type="button"
              >
                <TbChevronLeft aria-hidden="true" size="1.2rem" />
              </button>
              <span>Pagina {paginaAtual} de {totalPaginas}</span>
              <button
                aria-label="Proxima pagina"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPaginaAtual((atual) => Math.min(totalPaginas, atual + 1))}
                type="button"
              >
                <TbChevronRight aria-hidden="true" size="1.2rem" />
              </button>
            </div>
            <div className="visualizador-pdf__zoom">
              <button
                aria-label="Reduzir zoom"
                disabled={escala <= ESCALA_MIN}
                onClick={() => setEscala((atual) => Math.max(ESCALA_MIN, +(atual - ESCALA_PASSO).toFixed(2)))}
                type="button"
              >
                <TbZoomOut aria-hidden="true" size="1.2rem" />
              </button>
              <button
                aria-label="Ampliar zoom"
                disabled={escala >= ESCALA_MAX}
                onClick={() => setEscala((atual) => Math.min(ESCALA_MAX, +(atual + ESCALA_PASSO).toFixed(2)))}
                type="button"
              >
                <TbZoomIn aria-hidden="true" size="1.2rem" />
              </button>
            </div>
          </div>
        ) : null
      }
      titulo={titulo}
    >
      <div className="visualizador-pdf">
        {erro ? (
          <InlineMessage tone="error">{erro}</InlineMessage>
        ) : (
          <Document file={url} loading="Carregando PDF..." onLoadError={aoFalharCarregar} onLoadSuccess={aoCarregar}>
            <Page pageNumber={paginaAtual} scale={escala} />
          </Document>
        )}
      </div>
    </Modal>
  );
}
