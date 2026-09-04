import { TbCircleCheck, TbCreditCard } from "react-icons/tb";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";

/* Popup de resultado de acoes de matricula/pagamento — usado tanto ao
   solicitar matricula no Catalogo quanto ao confirmar pagamento em Meus
   Cursos. "Pagamento pendente" nao usa tom de erro (vermelho): pendente
   nao significa que algo deu errado, so que o acesso ainda depende da
   confirmacao financeira. */
export default function PopupResultadoMatricula({
  acessoLiberado,
  mensagem,
  onAcaoPrimaria,
  onFechar,
  rotuloAcaoPrimaria
}) {
  return (
    <Modal
      className="popup-resultado-matricula"
      onFechar={onFechar}
      titulo={acessoLiberado ? "Matricula aprovada!" : "Pagamento pendente"}
      rodape={
        <footer className="modal-rodape">
          {!acessoLiberado ? (
            <Botao onClick={onFechar} variante="secundario">
              Fechar
            </Botao>
          ) : null}
          <Botao onClick={onAcaoPrimaria} variante={acessoLiberado ? "primario" : "sucesso"}>
            {rotuloAcaoPrimaria}
          </Botao>
        </footer>
      }
    >
      <div className="popup-resultado-matricula__corpo">
        <span
          aria-hidden="true"
          className={`popup-resultado-matricula__icone popup-resultado-matricula__icone--${acessoLiberado ? "sucesso" : "aviso"}`}
        >
          {acessoLiberado ? <TbCircleCheck size={28} /> : <TbCreditCard size={28} />}
        </span>
        <p>{mensagem}</p>
      </div>
    </Modal>
  );
}
