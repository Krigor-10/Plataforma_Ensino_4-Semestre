import { TbDownload } from "react-icons/tb";
import Modal from "./Modal.jsx";
import VisualizadorPdfConteudo from "./VisualizadorPdfConteudo.jsx";

export default function VisualizadorPdf({ onFechar, titulo, url }) {
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
      titulo={titulo}
    >
      <VisualizadorPdfConteudo url={url} />
    </Modal>
  );
}
