import { useState, useEffect, useRef } from "react";
import { TbChevronDown } from "react-icons/tb";

export default function SelectSimples({ id, value, opcoes, onChange, placeholder = "Selecione", required, erro }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const painelRef = useRef(null);

  /* opcoes: string[] | { valor, rotulo, desabilitado? }[] */
  const norm = opcoes.map((op) =>
    typeof op === "string" ? { valor: op, rotulo: op } : op
  );
  const selecionada = norm.find((op) => String(op.valor) === String(value)) ?? null;

  function calcularPos() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }

  function abrir() {
    calcularPos();
    setAberto((v) => !v);
  }

  useEffect(() => {
    if (!aberto) return;

    function fecharClique(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        painelRef.current && !painelRef.current.contains(e.target)
      ) setAberto(false);
    }
    function fecharEsc(e) {
      if (e.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", fecharClique);
    document.addEventListener("keydown", fecharEsc);
    window.addEventListener("scroll", calcularPos, true);
    window.addEventListener("resize", calcularPos);

    return () => {
      document.removeEventListener("mousedown", fecharClique);
      document.removeEventListener("keydown", fecharEsc);
      window.removeEventListener("scroll", calcularPos, true);
      window.removeEventListener("resize", calcularPos);
    };
  }, [aberto]);

  function selecionar(val) {
    if (!norm.find((op) => String(op.valor) === String(val))?.desabilitado) {
      onChange(val);
      setAberto(false);
    }
  }

  const classeGatilho = [
    "sel-simples__gatilho",
    !selecionada ? "sel-simples__gatilho--vazio" : "",
    erro ? "sel-simples__gatilho--erro" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="sel-simples">
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={classeGatilho}
        onClick={abrir}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-required={required}
        aria-invalid={!!erro}
      >
        <span className="sel-simples__texto">
          {selecionada ? selecionada.rotulo : placeholder}
        </span>
        <TbChevronDown
          size={14}
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: "var(--cor-texto-mudo)",
            transition: "transform 0.15s",
            transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {aberto && (
        <div
          ref={painelRef}
          className="sel-simples__painel"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 2000 }}
          role="listbox"
        >
          <ul>
            {norm.map((op) => (
              <li key={op.valor}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(value) === String(op.valor)}
                  aria-disabled={op.desabilitado}
                  disabled={op.desabilitado}
                  onClick={() => selecionar(op.valor)}
                  className={String(value) === String(op.valor) ? "sel-simples__opcao--ativa" : ""}
                >
                  {op.rotulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
