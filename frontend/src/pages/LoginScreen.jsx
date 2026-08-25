import { useState } from "react";
import { TbUserFilled } from "react-icons/tb";
import { InlineMessage } from "../components/Primitives.jsx";
import Botao from "../components/Botao.jsx";
import { apiRequest } from "../lib/api.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/demoMode.js";

export default function LoginScreen({
  canDisableDemoMode,
  isDemoMode,
  onDemoModeExit,
  onDemoSessionStart,
  onNavigate,
  onSessionStart
}) {
  const [form, setForm] = useState({ email: "", senha: "" });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("pending");
    setTone("info");
    setMessage("Validando suas credenciais...");

    try {
      const response = await apiRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          senha: form.senha
        })
      });

      setTone("success");
      setMessage("Login concluido. Abrindo o painel...");
      onSessionStart({
        token: response.token,
        user: response.usuario
      });
    } catch (err) {
      setStatus("idle");
      setTone("error");
      setMessage(err.message || "Nao foi possivel entrar agora.");
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
            <li>Acompanhe seu progresso academico em tempo real</li>
            <li>Solicite matricula e acompanhe o status em poucos cliques</li>
            <li>Conteudos, avaliacoes e certificados em um so lugar</li>
          </ul>
        </div>
      </aside>

      <main className="tela-login__formulario">
        <header className="tela-login__cabecalho">
          <button className="cadastro-voltar" type="button" onClick={() => onNavigate("/")}>
            ← Voltar para a home
          </button>
        </header>

        <div className="tela-login__corpo">
          <h1 className="tela-login__titulo">Entrar na EdTech</h1>
          <p className="tela-login__subtitulo">Use seu e-mail e senha para abrir o ambiente conectado a API.</p>

          {isDemoMode ? (
            <InlineMessage tone="info">
              Modo apresentacao ativo: este login usa dados locais e nao depende do backend.
            </InlineMessage>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--espaco-lg)" }}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="login-email">E-mail</label>
              <input
                autoComplete="email"
                className="campo__entrada"
                id="login-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="login-senha">Senha</label>
              <input
                autoComplete="current-password"
                className="campo__entrada"
                id="login-senha"
                name="senha"
                type="password"
                value={form.senha}
                onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
                required
              />
            </div>

            <Botao variante="primario" tamanho="grande" className="botao--bloco" disabled={status === "pending"} type="submit">
              {status === "pending" ? "Entrando..." : "Abrir painel"}
            </Botao>
          </form>

          {message ? <InlineMessage tone={tone}>{message}</InlineMessage> : null}

          <div className="tela-login__divisor">
            <span>ou entre com um perfil demo</span>
          </div>

          <fieldset className="tela-login__perfis">
            <legend className="visualmente-oculto">Perfis de demonstracao</legend>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                className="cartao-perfil"
                key={account.key}
                onClick={() => onDemoSessionStart(account.key)}
                type="button"
              >
                <span className="cartao-perfil__icone" aria-hidden="true">
                  <TbUserFilled size={22} />
                </span>
                <span className="cartao-perfil__info">
                  <span className="cartao-perfil__rotulo">{account.label}</span>
                  <span className="cartao-perfil__descricao">{account.description}</span>
                </span>
              </button>
            ))}
          </fieldset>

          <p className="tela-login__rodape-texto">
            Contas demo: {DEMO_ACCOUNTS.map((account) => account.email).join(" | ")}. Senha unica: {DEMO_PASSWORD}
          </p>

          {isDemoMode && canDisableDemoMode ? (
            <div className="tela-login__acoes-rodape">
              <Botao variante="fantasma" tamanho="pequeno" onClick={() => onDemoModeExit("/login")}>
                Voltar ao modo real
              </Botao>
            </div>
          ) : null}

          <p className="tela-login__rodape-texto">
            Ainda nao tem conta?{" "}
            <button className="link-botao" type="button" onClick={() => onNavigate("/cadastro")}>
              Solicitar matricula
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
