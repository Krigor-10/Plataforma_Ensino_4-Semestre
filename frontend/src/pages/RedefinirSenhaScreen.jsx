import { useState } from "react";
import { InlineMessage } from "../components/Primitives.jsx";
import Botao from "../components/Botao.jsx";
import { apiRequest } from "../lib/api.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function RedefinirSenhaScreen({ token, onNavigate }) {
  useDocumentTitle("Redefinir senha | EdTech Academy");

  const [form, setForm] = useState({ novaSenha: "", confirmarSenha: "" });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.novaSenha.length < 6) {
      setTone("error");
      setMessage("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }

    if (form.novaSenha !== form.confirmarSenha) {
      setTone("error");
      setMessage("As senhas informadas nao coincidem.");
      return;
    }

    setStatus("pending");
    setTone("info");
    setMessage("Redefinindo sua senha...");

    try {
      const resposta = await apiRequest("/Auth/redefinir-senha", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha: form.novaSenha })
      });

      setStatus("concluido");
      setTone("success");
      setMessage(resposta.mensagem || "Senha redefinida com sucesso.");
    } catch (err) {
      setStatus("idle");
      setTone("error");
      setMessage(err.message || "Nao foi possivel redefinir a senha agora.");
    }
  }

  if (!token) {
    return (
      <div className="tela-login tela-login--aluno">
        <main className="tela-login__formulario" style={{ margin: "0 auto" }}>
          <div className="tela-login__corpo">
            <h1 className="tela-login__titulo">Link invalido</h1>
            <InlineMessage tone="error">
              Este link de redefinicao de senha esta incompleto. Solicite um novo link.
            </InlineMessage>
            <p className="tela-login__rodape-texto">
              <button className="link-botao" type="button" onClick={() => onNavigate("/esqueci-senha")}>
                Solicitar novo link
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="tela-login tela-login--aluno">
      <aside className="tela-login__visual">
        <div className="tela-login__visual-conteudo">
          <div className="visual-logo">
            <span className="visual-logo__marca" aria-hidden="true">
              <span>Ed</span>
              <span>Tech</span>
            </span>
            <span className="visual-logo__subtitulo">Academy</span>
          </div>
        </div>
      </aside>

      <main className="tela-login__formulario">
        <div className="tela-login__corpo">
          <h1 className="tela-login__titulo">Defina uma nova senha</h1>
          <p className="tela-login__subtitulo">Escolha uma nova senha para acessar sua conta.</p>

          {status === "concluido" ? (
            <>
              <InlineMessage tone={tone}>{message}</InlineMessage>
              <Botao variante="primario" tamanho="grande" className="botao--bloco" onClick={() => onNavigate("/login")}>
                Ir para o login
              </Botao>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--espaco-lg)" }}>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="redefinir-nova-senha">Nova senha</label>
                <input
                  autoComplete="new-password"
                  className="campo__entrada"
                  id="redefinir-nova-senha"
                  name="novaSenha"
                  type="password"
                  value={form.novaSenha}
                  onChange={(event) => setForm((current) => ({ ...current, novaSenha: event.target.value }))}
                  required
                />
              </div>

              <div className="campo">
                <label className="campo__rotulo" htmlFor="redefinir-confirmar-senha">Confirmar nova senha</label>
                <input
                  autoComplete="new-password"
                  className="campo__entrada"
                  id="redefinir-confirmar-senha"
                  name="confirmarSenha"
                  type="password"
                  value={form.confirmarSenha}
                  onChange={(event) => setForm((current) => ({ ...current, confirmarSenha: event.target.value }))}
                  required
                />
              </div>

              <Botao variante="primario" tamanho="grande" className="botao--bloco" disabled={status === "pending"} type="submit">
                {status === "pending" ? "Redefinindo..." : "Redefinir senha"}
              </Botao>

              {message ? <InlineMessage tone={tone}>{message}</InlineMessage> : null}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
