import { useState, useEffect, useRef } from "react";
import { TbChevronDown } from "react-icons/tb";

function iniciais(nome) {
  return (nome ?? "").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function SelectUsuario({ id, value, opcoes, onChange, placeholder = "Nenhum" }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const painelRef = useRef(null);

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

  const selecionado = opcoes.find((o) => o.id === value) ?? null;

  function selecionar(novoId) {
    onChange(novoId);
    setAberto(false);
  }

  return (
    <div className="sel-usr">
      <button
        ref={btnRef}
        id={id}
        type="button"
        className="sel-usr__gatilho"
        onClick={abrir}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        {selecionado ? (
          <>
            <span className="sel-usr__avatar" aria-hidden="true">{iniciais(selecionado.nome)}</span>
            <span className="sel-usr__nome">{selecionado.nome}</span>
          </>
        ) : (
          <span className="sel-usr__placeholder">{placeholder}</span>
        )}
        <TbChevronDown
          size={14}
          aria-hidden="true"
          style={{
            marginLeft: "auto",
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
          className="sel-usr__painel"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 2000 }}
          role="listbox"
        >
          <ul>
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => selecionar(null)}
                className={value === null ? "sel-usr__opcao--ativa" : ""}
              >
                <span className="sel-usr__avatar sel-usr__avatar--vazio" aria-hidden="true">—</span>
                {placeholder}
              </button>
            </li>
            {opcoes.map((op) => (
              <li key={op.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === op.id}
                  onClick={() => selecionar(op.id)}
                  className={value === op.id ? "sel-usr__opcao--ativa" : ""}
                >
                  <span className="sel-usr__avatar" aria-hidden="true">{iniciais(op.nome)}</span>
                  {op.nome}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
