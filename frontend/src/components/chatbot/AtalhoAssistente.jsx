import { useAssistenteChatbot } from "../../hooks/useAssistenteChatbot.jsx";

/**
 * Link discreto "Por quê? Pergunte ao assistente" usado nas 3 telas onde o
 * aluno pode travar (avaliacao bloqueada, certificado com pendencia,
 * pagamento pendente) - abre o painel do Assistente CodeRyse com a pergunta
 * ja pronta e ja envia.
 */
export default function AtalhoAssistente({ pergunta, className = "" }) {
  const { perguntarAoAssistente } = useAssistenteChatbot();

  return (
    <button
      type="button"
      className={`atalho-assistente${className ? ` ${className}` : ""}`}
      onClick={() => perguntarAoAssistente(pergunta)}
    >
      Por quê? <span className="atalho-assistente__cta">Pergunte ao assistente</span>
    </button>
  );
}
