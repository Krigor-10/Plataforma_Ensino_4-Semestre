import { PUBLIC_NAV_LINKS } from "../data/appConfig.js";
import { RouteLink, StatusPill } from "./Primitives.jsx";

export default function GlobalHeader({ hasSession, isDemoMode, onNavigate }) {
  return (
    <header className="global-header">
      <div className="global-header__inner">
        <RouteLink className="marketing-brand global-header__brand" onNavigate={onNavigate} to="/">
          <span className="marketing-brand__copy">
            <span className="marketing-brand__wordmark" aria-label="CodeRyse">
              <span className="marketing-brand__wordmark-code">Code</span>
              <span className="marketing-brand__wordmark-rise">Ryse</span>
            </span>
            <span className="marketing-brand__subtitle">Academy</span>
          </span>
        </RouteLink>

        <nav className="global-header__nav" aria-label="Navegacao global">
          {PUBLIC_NAV_LINKS.map((item) => (
            <a className="button button--secondary global-header__nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="global-header__actions">
          {hasSession ? (
            <>
              <div className="global-header__session">
                <StatusPill tone={isDemoMode ? "warning" : "success"}>
                  {isDemoMode ? "Modo demo" : "Sessao ativa"}
                </StatusPill>
                <span className="global-header__session-copy">
                  {isDemoMode
                    ? "Navegacao e dados estao simulados localmente para apresentacao."
                    : "Continue do ponto onde voce parou."}
                </span>
              </div>
              <RouteLink className="button button--secondary global-header__action" onNavigate={onNavigate} to="/app">
                Abrir painel
              </RouteLink>
            </>
          ) : (
            <>
              {isDemoMode ? <StatusPill tone="warning">Modo demo</StatusPill> : null}
              <RouteLink className="button button--secondary global-header__action global-header__action--admin" onNavigate={onNavigate} to="/login">
                Acesso administrativo
              </RouteLink>
              <RouteLink className="button button--secondary global-header__action" onNavigate={onNavigate} to="/login">
                Entrar
              </RouteLink>
              <RouteLink className="solid-button global-header__action global-header__action--wide" onNavigate={onNavigate} to="/cadastro">
                Criar conta
              </RouteLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
