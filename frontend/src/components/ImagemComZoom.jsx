import { useRef, useState } from "react";
import { TbArrowsMaximize, TbMinus, TbPlus } from "react-icons/tb";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_PASSO = 0.25;

/* Imagem com zoom e arraste, usada dentro de JanelaPreviaItem.jsx (docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item 4)
   - comeca ajustada a area (100%), com uma barra de zoom (-/%/+/"Ajustar a
   tela", passos de 25%, limite 50%-400%). Acima de 100%, arrastar move a
   imagem e Ctrl + rodinha do mouse tambem muda o zoom. Deliberadamente sem
   Modal proprio (quem usa este componente ja esta dentro de uma janela/modal)
   - diferente de VisualizadorImagem.jsx, que continua sem zoom e e usado
   pelo aluno (SecoesAluno.jsx), sem mudanca nenhuma. */
export default function ImagemComZoom({ alt, url }) {
  const [escala, setEscala] = useState(1);
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });
  const arrastoRef = useRef(null);

  function aplicarEscala(novaEscala) {
    const escalaClamp = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +novaEscala.toFixed(2)));
    setEscala(escalaClamp);
    if (escalaClamp <= 1) {
      setPosicao({ x: 0, y: 0 });
    }
  }

  function ajustarATela() {
    setEscala(1);
    setPosicao({ x: 0, y: 0 });
  }

  function aoRodarRoda(evento) {
    if (!evento.ctrlKey) {
      return;
    }
    evento.preventDefault();
    aplicarEscala(escala + (evento.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO));
  }

  function aoIniciarArrasto(evento) {
    if (escala <= 1) {
      return;
    }
    arrastoRef.current = { inicioX: evento.clientX, inicioY: evento.clientY, posicaoInicial: posicao };
  }

  function aoMoverArrasto(evento) {
    if (!arrastoRef.current) {
      return;
    }
    const deltaX = evento.clientX - arrastoRef.current.inicioX;
    const deltaY = evento.clientY - arrastoRef.current.inicioY;
    setPosicao({ x: arrastoRef.current.posicaoInicial.x + deltaX, y: arrastoRef.current.posicaoInicial.y + deltaY });
  }

  function aoSoltarArrasto() {
    arrastoRef.current = null;
  }

  return (
    <div className="imagem-zoom">
      <div
        className={`imagem-zoom__area${escala > 1 ? " imagem-zoom__area--arrastavel" : ""}`}
        onMouseDown={aoIniciarArrasto}
        onMouseLeave={aoSoltarArrasto}
        onMouseMove={aoMoverArrasto}
        onMouseUp={aoSoltarArrasto}
        onWheel={aoRodarRoda}
      >
        <img
          alt={alt}
          className="imagem-zoom__img"
          draggable={false}
          src={url}
          style={{ transform: `translate(${posicao.x}px, ${posicao.y}px) scale(${escala})` }}
        />
        <p className="imagem-zoom__dica">Arraste para mover · Ctrl + rodinha para zoom</p>
      </div>
      <div className="imagem-zoom__controles">
        <button aria-label="Reduzir zoom" disabled={escala <= ZOOM_MIN} onClick={() => aplicarEscala(escala - ZOOM_PASSO)} type="button">
          <TbMinus aria-hidden="true" size={15} />
        </button>
        <span className="imagem-zoom__percentual">{Math.round(escala * 100)}%</span>
        <button aria-label="Ampliar zoom" disabled={escala >= ZOOM_MAX} onClick={() => aplicarEscala(escala + ZOOM_PASSO)} type="button">
          <TbPlus aria-hidden="true" size={15} />
        </button>
        <button onClick={ajustarATela} type="button">
          <TbArrowsMaximize aria-hidden="true" size={14} /> Ajustar à tela
        </button>
      </div>
    </div>
  );
}
