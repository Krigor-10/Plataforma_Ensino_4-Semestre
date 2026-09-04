import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Toast from "../components/Toast.jsx";

const ToastContext = createContext(null);
const DURACAO_PADRAO_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const proximoId = useRef(0);

  const fecharToast = useCallback((id) => {
    setToasts((atual) => atual.filter((toast) => toast.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (mensagem, tipo = "info", duracaoMs = DURACAO_PADRAO_MS) => {
      const id = ++proximoId.current;
      setToasts((atual) => [...atual, { id, tipo, mensagem }]);

      if (duracaoMs) {
        window.setTimeout(() => fecharToast(id), duracaoMs);
      }

      return id;
    },
    [fecharToast]
  );

  const valorContexto = useMemo(() => ({ mostrarToast, fecharToast }), [mostrarToast, fecharToast]);

  return (
    <ToastContext.Provider value={valorContexto}>
      {children}
      <Toast toasts={toasts} onFechar={fecharToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);

  if (!contexto) {
    throw new Error("useToast precisa ser usado dentro de um ToastProvider");
  }

  return contexto;
}
