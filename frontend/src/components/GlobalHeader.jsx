import { PUBLIC_NAV_LINKS } from "../data/appConfig.js";
import { RouteLink } from "./Primitives.jsx";
import Insignia from "./Insignia.jsx";

export default function GlobalHeader({ hasSession, isDemoMode, onNavigate }) {
  return (
    <header className="cabecalho-publico" role="banner">
      <div className="cabecalho-publico__inner">
        <RouteLink className="cabecalho-publico__logo" onNavigate={onNavigate} to="/">
          <span className="cabecalho-publico__logo-marca" aria-hidden="true">
            <span>Ed</span>
            <span>Tech</span>
          </span>
          <span className="cabecalho-publico__logo-subtitulo">Academy</span>
        </RouteLink>

        <nav className="cabecalho-publico__nav" aria-label="Navegacao principal">
          {PUBLIC_NAV_LINKS.map((item) => (
            <a className="cabecalho-publico__link" href={item.href} key={item.href}>
              <span className="nav-texto">{item.label}</span>
            </a>
          ))}
          <span className="topbar__separador" aria-hidden="true" />

          {isDemoMode ? (
            <>
              <Insignia texto="Modo demo" variante="aviso" />
              <span className="topbar__separador" aria-hidden="true" />
            </>
          ) : null}

          {hasSession ? (
            <RouteLink className="cabecalho-publico__link" onNavigate={onNavigate} to="/app">
              <span className="nav-texto">Abrir painel</span>
            </RouteLink>
          ) : (
            <>
              <RouteLink className="cabecalho-publico__link" onNavigate={onNavigate} to="/login">
                <span className="nav-texto">Entrar</span>
              </RouteLink>
              <span className="topbar__separador" aria-hidden="true" />
              <RouteLink className="botao botao--sucesso botao--pequeno" onNavigate={onNavigate} to="/cadastro">
                <span className="nav-texto">Criar conta</span>
              </RouteLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
