import { useEffect, useState } from "react";
import { TbAlertCircle, TbArrowRight, TbCircleCheck, TbCreditCard } from "react-icons/tb";
import Botao from "./Botao.jsx";
import Insignia from "./Insignia.jsx";
import Modal from "./Modal.jsx";
import { InlineMessage } from "./Primitives.jsx";
import { ApiError, apiRequest } from "../lib/api.js";
import { formatMoney } from "../lib/format.js";
import { getCourseCover } from "../data/courseCovers.js";
import { resolverImagemCurso } from "../lib/courseImage.js";

const MODELO_ACOMPANHADO = 3;

/* Confirmacao de compra (pendencia_compra_cursos) — modal equivalente ao
   ConfirmacaoCompraSheet.jsx do mobile, mesmas fases confirmar -> enviando
   -> sucesso. Usado tanto pelo Catalogo (curso pago sem matricula) quanto
   por Meus Cursos ("Concluir compra" de uma matricula com pagamento
   pendente) — os dois so precisam fornecer o curso e os callbacks de
   recarregar/navegar, a chamada POST /Matriculas/comprar e interna. */
export default function ConfirmacaoCompraModal({ curso, onCompraConfirmada, onFechar, onIrParaCurso, onSessionExpired }) {
  const [fase, setFase] = useState("confirmar");
  const [erro, setErro] = useState("");

  useEffect(() => {
    setFase("confirmar");
    setErro("");
  }, [curso?.id]);

  if (!curso) {
    return null;
  }

  const ehAcompanhado = Number(curso.modeloCurso) === MODELO_ACOMPANHADO;

  async function confirmar() {
    setFase("enviando");
    setErro("");

    try {
      await apiRequest("/Matriculas/comprar", { method: "POST", body: JSON.stringify({ cursoId: curso.id }) });
      await onCompraConfirmada?.();
      setFase("sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      setErro(err.message || "Nao foi possivel concluir a compra agora.");
      setFase("confirmar");
    }
  }

  if (fase === "sucesso") {
    return (
      <Modal
        className="modal-confirmacao-compra"
        onFechar={onFechar}
        titulo="Compra concluída!"
        rodape={
          <footer className="modal-rodape">
            <Botao onClick={() => onIrParaCurso?.(curso.id)} variante="primario">
              Ir para o curso <TbArrowRight aria-hidden="true" size={14} />
            </Botao>
          </footer>
        }
      >
        <div className="modal-confirmacao-compra__sucesso">
          <span aria-hidden="true" className="modal-confirmacao-compra__sucesso-icone">
            <TbCircleCheck size={32} />
          </span>
          <p>O curso já está liberado.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      className="modal-confirmacao-compra"
      onFechar={fase === "enviando" ? () => {} : onFechar}
      titulo="Confirmar compra"
      rodape={
        <footer className="modal-rodape">
          <Botao disabled={fase === "enviando"} onClick={onFechar} variante="secundario">
            Cancelar
          </Botao>
          <Botao disabled={fase === "enviando"} onClick={confirmar} variante="primario">
            <TbCreditCard aria-hidden="true" size={14} /> {fase === "enviando" ? "Confirmando..." : "Confirmar compra"}
          </Botao>
        </footer>
      }
    >
      <div className="modal-confirmacao-compra__cabecalho">
        <img
          alt=""
          className="modal-confirmacao-compra__capa"
          src={resolverImagemCurso(curso)}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getCourseCover(curso);
          }}
        />
        <div className="modal-confirmacao-compra__cabecalho-textos">
          <h3 className="modal-confirmacao-compra__titulo">{curso.titulo}</h3>
          <Insignia texto={ehAcompanhado ? "Com acompanhamento" : "Pago"} />
        </div>
      </div>

      <div className="modal-confirmacao-compra__total">
        <span>Total</span>
        <strong>{formatMoney(curso.preco)}</strong>
      </div>

      <p className="modal-confirmacao-compra__aviso">
        <TbAlertCircle aria-hidden="true" size={16} />
        Pagamento simulado — ambiente acadêmico, nenhuma cobrança real é feita.
      </p>

      {erro ? <InlineMessage tone="error">{erro}</InlineMessage> : null}
    </Modal>
  );
}
