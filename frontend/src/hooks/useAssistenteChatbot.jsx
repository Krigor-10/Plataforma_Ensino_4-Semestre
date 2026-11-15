import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import BotaoAssistente from "../components/chatbot/BotaoAssistente.jsx";
import PainelAssistente from "../components/chatbot/PainelAssistente.jsx";

const AssistenteChatbotContext = createContext(null);

/**
 * Mesmo padrao do ToastProvider/useToast: o botao e o painel do Assistente
 * CodeRyse moram aqui, uma vez, no topo da arvore - telas como SecoesAluno,
 * SecaoCertificados e SecaoMatriculas (atalhos "Por quê?") chamam
 * useAssistenteChatbot() direto, sem precisar receber callback por prop
 * descendo por WorkspaceScreen/LayoutWorkspace.
 */
export function AssistenteChatbotProvider({
  children,
  ativo,
  contexto,
  onNavigate,
  usuarioId = null,
  chamadoInicialId = null,
  onChamadoInicialConsumido
}) {
  const [aberto, setAberto] = useState(false);
  const [perguntaInicial, setPerguntaInicial] = useState(null);

  const perguntarAoAssistente = useCallback((texto) => {
    setAberto(true);
    setPerguntaInicial({ texto, chave: Date.now() });
  }, []);

  // Notificacao de chamado ("/chamados/:id", ver App.jsx) chega aqui como
  // prop (fora da arvore de quem chama perguntarAoAssistente) - abre o
  // painel sozinha, sem precisar de um clique do aluno.
  useEffect(() => {
    if (chamadoInicialId) setAberto(true);
  }, [chamadoInicialId]);

  const valorContexto = useMemo(() => ({ perguntarAoAssistente }), [perguntarAoAssistente]);

  return (
    <AssistenteChatbotContext.Provider value={valorContexto}>
      {children}
      {ativo ? (
        <>
          <BotaoAssistente aberto={aberto} onClick={() => setAberto((atual) => !atual)} />
          <PainelAssistente
            aberto={aberto}
            onFechar={() => setAberto(false)}
            contexto={contexto}
            onNavigate={onNavigate}
            perguntaInicial={perguntaInicial}
            usuarioId={usuarioId}
            chamadoInicialId={chamadoInicialId}
            onChamadoInicialConsumido={onChamadoInicialConsumido}
          />
        </>
      ) : null}
    </AssistenteChatbotContext.Provider>
  );
}

export function useAssistenteChatbot() {
  const contexto = useContext(AssistenteChatbotContext);

  if (!contexto) {
    throw new Error("useAssistenteChatbot precisa ser usado dentro de um AssistenteChatbotProvider");
  }

  return contexto;
}
