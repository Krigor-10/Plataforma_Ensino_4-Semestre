/* Switch pill+thumb reutilizavel - extraido de ModalPerfilWorkspace.jsx
   (nasceu ali so pro toggle de tema) pra tambem ser usado pelo "Ligado" do
   Assistente CodeRyse em Meu perfil > Configuracoes (docs/chatbot/PROMPT-
   agente-assistente-config-no-perfil.md). `variante="tema"` preserva o
   amarelo + sol/lua de hoje; a variante padrao usa o roxo da marca, sem
   icones, pra qualquer liga/desliga generico. `children` desenha o miolo do
   switch (icones ao redor do thumb, ou so o thumb) - cada chamador decide. */
export default function Switch({ ativo, children, desabilitado, onAlternar, rotulo, variante = "padrao" }) {
  const modificador = variante === "tema" ? "claro" : "ativo";

  return (
    <button
      aria-checked={ativo}
      aria-label={rotulo}
      className={`switch-tema${ativo ? ` switch-tema--${modificador}` : ""}`}
      disabled={desabilitado}
      onClick={onAlternar}
      role="switch"
      type="button"
    >
      {children}
    </button>
  );
}
