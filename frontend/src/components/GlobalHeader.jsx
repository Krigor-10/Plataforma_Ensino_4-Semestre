import { motion } from "framer-motion";
import { MdLogin, MdMenuBook, MdPersonAdd, MdSpaceDashboard } from "react-icons/md";
import { PUBLIC_NAV_LINKS } from "../data/appConfig.js";
import Botao from "./Botao.jsx";
import Insignia from "./Insignia.jsx";

const MOLA = { type: "spring", stiffness: 400, damping: 18 };

function NavMotionLink({ children, onNavigate, to, ...rest }) {
  return (
    <motion.a
      className="cabecalho-publico__link"
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }

        event.preventDefault();
        onNavigate(to);
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={MOLA}
      {...rest}
    >
      {children}
    </motion.a>
  );
}

export default function GlobalHeader({ hasSession, isDemoMode, onNavigate }) {
  return (
    <header className="cabecalho-publico" role="banner">
      <div className="cabecalho-publico__inner">
        <NavMotionLink className="cabecalho-publico__logo" onNavigate={onNavigate} to="/" data-tooltip="Inicio">
          <span className="cabecalho-publico__logo-marca" aria-hidden="true">
            <span>Code</span>
            <span>Ryse</span>
          </span>
          <span className="cabecalho-publico__logo-subtitulo">Academy</span>
        </NavMotionLink>

        <nav className="cabecalho-publico__nav" aria-label="Navegacao principal">
          {PUBLIC_NAV_LINKS.map((item) => (
            <motion.a
              className="cabecalho-publico__link"
              href={item.href}
              key={item.href}
              data-tooltip={item.label}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={MOLA}
            >
              <MdMenuBook size={18} aria-hidden="true" /> <span className="nav-texto">{item.label}</span>
            </motion.a>
          ))}
          <span className="topbar__separador" aria-hidden="true" />

          {isDemoMode ? (
            <>
              <Insignia texto="Modo demo" variante="aviso" />
              <span className="topbar__separador" aria-hidden="true" />
            </>
          ) : null}

          {hasSession ? (
            <NavMotionLink onNavigate={onNavigate} to="/app" data-tooltip="Abrir painel">
              <MdSpaceDashboard size={20} aria-hidden="true" /> <span className="nav-texto">Abrir painel</span>
            </NavMotionLink>
          ) : (
            <>
              <NavMotionLink onNavigate={onNavigate} to="/login" data-tooltip="Entrar">
                <MdLogin size={20} aria-hidden="true" /> <span className="nav-texto">Entrar</span>
              </NavMotionLink>
              <span className="topbar__separador" aria-hidden="true" />
              <Botao
                variante="sucesso"
                tamanho="pequeno"
                onClick={() => onNavigate("/cadastro")}
                data-tooltip="Criar conta"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                transition={MOLA}
              >
                <MdPersonAdd size={20} aria-hidden="true" /> <span className="nav-texto">Criar conta</span>
              </Botao>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
