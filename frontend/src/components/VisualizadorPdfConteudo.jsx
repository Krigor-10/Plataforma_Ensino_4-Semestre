import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { TbChevronLeft, TbChevronRight, TbZoomIn, TbZoomOut } from "react-icons/tb";
import { InlineMessage } from "./Primitives.jsx";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ESCALA_MIN = 0.6;
const ESCALA_MAX = 2.2;
const ESCALA_PASSO = 0.2;

/* Paginas + barra de navegacao/zoom de um PDF, extraido de VisualizadorPdf.jsx
   (que virou so a casca com Modal + "Baixar") pra ser reaproveitado tambem
   dentro de JanelaPreviaItem.jsx (docs/TelaConteudosProfessor/PROMPT-agente-
   tela-modulo-lista-e-janela.md, item 4: "PDF: as paginas grandes, com
   rolagem dentro da janela, usando o mesmo visualizador do VisualizadorPdf"),
   que ja tem seu proprio dialogo/rodape de navegacao entre ITENS e nao pode
   aninhar outro Modal dentro. Sem Modal proprio - quem usa decide o layout
   ao redor. */
export default function VisualizadorPdfConteudo({ url }) {
  const [totalPaginas, setTotalPaginas] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [escala, setEscala] = useState(1);
  const [erro, setErro] = useState(null);

  function aoCarregar({ numPages }) {
    setTotalPaginas(numPages);
    setErro(null);
  }

  function aoFalharCarregar() {
    setErro("Não foi possível carregar este PDF. Tente baixar o arquivo.");
  }

  return (
    <div className="visualizador-pdf-conteudo">
      <div className="visualizador-pdf">
        {erro ? (
          <InlineMessage tone="error">{erro}</InlineMessage>
        ) : (
          <Document file={url} loading="Carregando PDF…" onLoadError={aoFalharCarregar} onLoadSuccess={aoCarregar}>
            <Page pageNumber={paginaAtual} scale={escala} />
          </Document>
        )}
      </div>
      {totalPaginas ? (
        <div className="visualizador-pdf-conteudo__barra">
          <div className="visualizador-pdf__navegacao">
            <button
              aria-label="Página anterior"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((atual) => Math.max(1, atual - 1))}
              type="button"
            >
              <TbChevronLeft aria-hidden="true" size="1.2rem" />
            </button>
            <span>Página {paginaAtual} de {totalPaginas}</span>
            <button
              aria-label="Próxima página"
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
      ) : null}
    </div>
  );
}
