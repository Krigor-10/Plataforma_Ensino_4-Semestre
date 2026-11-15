import { TbMessageChatbot, TbX } from "react-icons/tb";

export default function BotaoAssistente({ aberto, onClick }) {
  return (
    <button
      type="button"
      className="assistente-botao"
      onClick={onClick}
      aria-label={aberto ? "Fechar Assistente CodeRyse" : "Abrir Assistente CodeRyse"}
      aria-expanded={aberto}
    >
      {aberto ? <TbX aria-hidden="true" size={26} /> : <TbMessageChatbot aria-hidden="true" size={26} />}
    </button>
  );
}
