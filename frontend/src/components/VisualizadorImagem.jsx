import { TbDownload } from "react-icons/tb";
import Modal from "./Modal.jsx";

export default function VisualizadorImagem({ onFechar, titulo, url }) {
  return (
    <Modal
      className="modal-caixa--preview"
      onFechar={onFechar}
      rodape={
        <div className="modal-rodape">
          <a className="botao botao--fantasma botao--pequeno" download href={url} rel="noreferrer" target="_blank">
            <TbDownload aria-hidden="true" size="1.1rem" />
            Baixar imagem
          </a>
        </div>
      }
      titulo={titulo}
    >
      <div className="visualizador-imagem">
        <img alt={titulo} className="visualizador-imagem__img" src={url} />
      </div>
    </Modal>
  );
}
