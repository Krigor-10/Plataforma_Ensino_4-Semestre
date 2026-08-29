import { useState } from "react";
import { InlineMessage } from "../components/Primitives.jsx";
import Botao from "../components/Botao.jsx";
import { apiRequest } from "../lib/api.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function EsqueciSenhaScreen({ onNavigate }) {
  useDocumentTitle("Recuperar senha | EdTech Academy");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("pending");
    setTone("info");
    setMessage("Enviando instrucoes...");

    try {
      const resposta = await apiRequest("/Auth/esqueci-senha", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });

      setStatus("enviado");
      setTone("success");
      setMessage(resposta.mensagem || "Se o e-mail informado estiver cadastrado, enviaremos as instrucoes de recuperacao.");
    } catch (err) {
      setStatus("idle");
      setTone("error");
      setMessage(err.message || "Nao foi possivel processar a solicitacao agora.");
    }
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
          <ul className="login-aluno__destaques">
            <li>Recupere o acesso a sua conta em poucos passos</li>
            <li>Enviamos um link seguro e temporario para o seu e-mail</li>
          </ul>
        </div>
      </aside>

      <main className="tela-login__formulario">
        <header className="tela-login__cabecalho">
          <button className="cadastro-voltar" type="button" onClick={() => onNavigate("/login")}>
            ← Voltar para o login
          </button>
        </header>

        <div className="tela-login__corpo">
          <h1 className="tela-login__titulo">Esqueceu sua senha?</h1>
          <p className="tela-login__subtitulo">
            Informe o e-mail cadastrado. Se ele existir na base, enviaremos um link para redefinir sua senha.
          </p>

          {status === "enviado" ? (
            <InlineMessage tone={tone}>{message}</InlineMessage>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--espaco-lg)" }}>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="esqueci-email">E-mail</label>
                <input
                  autoComplete="email"
                  className="campo__entrada"
                  id="esqueci-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <Botao variante="primario" tamanho="grande" className="botao--bloco" disabled={status === "pending"} type="submit">
                {status === "pending" ? "Enviando..." : "Enviar instrucoes"}
              </Botao>

              {message ? <InlineMessage tone={tone}>{message}</InlineMessage> : null}
            </form>
          )}

          <p className="tela-login__rodape-texto">
            Lembrou a senha?{" "}
            <button className="link-botao" type="button" onClick={() => onNavigate("/login")}>
              Voltar para o login
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
