/* ============================================================
   BARRA TOPO — Cabeçalho global do workspace
   Adaptado do protótipo: navegação via onNavigate, busca global
   alimentada pelos dados reais (snapshot) em vez do db.js local.
   ============================================================ */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TbTrophy, TbChevronDown, TbMenu2,
  TbLayoutDashboard, TbUsers, TbChalkboard, TbUserShield,
  TbBooks, TbStack, TbSchool, TbClipboardList,
  TbFileCheck, TbFileText,
  TbUserCircle, TbX, TbSearch, TbUserFilled, TbBell, TbBellRinging,
} from "react-icons/tb";
import { MdLogout } from "react-icons/md";
import Insignia from "../../components/Insignia.jsx";
import NavGrupo, { temNavGrupo } from "./NavGrupo.jsx";
import { getSectionMeta } from "../../data/appConfig.js";
import { corPorTipo } from "./BarraLateral.jsx";
import { apiRequest } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";

const INTERVALO_POLL_NOTIFICACOES_MS = 30000;

const iconesPorSecao = {
  dashboard: TbLayoutDashboard,
  alunos: TbUsers,
  professores: TbChalkboard,
  coordenadores: TbUserShield,
  cursos: TbBooks,
  modulos: TbStack,
  turmas: TbSchool,
  matriculas: TbClipboardList,
  avaliacoes: TbFileCheck,
  conteudos: TbFileText,
  certificados: TbTrophy,
  "meus-cursos": TbBooks,
  "cursos-matriculados": TbBooks,
};

const variantePorTipo = { Aluno: "marca", Professor: "info", Coordenador: "aviso", Admin: "erro" };

export default function BarraTopo({
  usuario,
  secaoAtual,
  sections,
  cursos = [],
  modulos = [],
  onNavigate,
  onAbrirSidebar,
  onAbrirPerfil,
  onLogoutClick,
}) {
  const [popupAberto, setPopupAberto] = useState(false);
  const refWrapper = useRef(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [indiceBusca, setIndiceBusca] = useState(-1);
  const refInputBusca = useRef(null);

  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const refNotificacoes = useRef(null);

  const role = usuario.tipoUsuario;
  const meta = getSectionMeta(secaoAtual, role);
  const IconeSecao = iconesPorSecao[secaoAtual] || TbLayoutDashboard;
  const temSecaoCursos = sections.some((s) => s.key === "cursos");
  const temSecaoModulos = sections.some((s) => s.key === "modulos");

  useEffect(() => {
    function fecharAoClicarFora(e) {
      if (refWrapper.current && !refWrapper.current.contains(e.target)) {
        setPopupAberto(false);
      }
    }
    if (popupAberto) document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, [popupAberto]);

  useEffect(() => {
    function fecharAoClicarFora(e) {
      if (refNotificacoes.current && !refNotificacoes.current.contains(e.target)) {
        setNotificacoesAbertas(false);
      }
    }
    if (notificacoesAbertas) document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, [notificacoesAbertas]);

  useEffect(() => {
    let cancelado = false;

    async function buscarContagem() {
      try {
        const resposta = await apiRequest("/Notificacoes/nao-lidas/contagem");
        if (!cancelado) {
          setNotificacoesNaoLidas(resposta.total || 0);
        }
      } catch {
        // silencioso: badge de notificacao nao e critico o suficiente pra interromper a navegacao
      }
    }

    buscarContagem();
    const intervalo = setInterval(buscarContagem, INTERVALO_POLL_NOTIFICACOES_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  async function abrirNotificacoes() {
    const vaiAbrir = !notificacoesAbertas;
    setNotificacoesAbertas(vaiAbrir);

    if (vaiAbrir) {
      setCarregandoNotificacoes(true);
      try {
        const resposta = await apiRequest("/Notificacoes");
        setNotificacoes(resposta);
      } catch {
        setNotificacoes([]);
      } finally {
        setCarregandoNotificacoes(false);
      }
    }
  }

  async function marcarNotificacaoComoLida(notificacao) {
    setNotificacoes((atuais) =>
      atuais.map((item) => (item.id === notificacao.id ? { ...item, lida: true } : item))
    );
    if (!notificacao.lida) {
      setNotificacoesNaoLidas((atual) => Math.max(0, atual - 1));
    }

    try {
      await apiRequest(`/Notificacoes/${notificacao.id}/lida`, { method: "PUT" });
    } catch {
      // ignora falha silenciosamente; proxima abertura do dropdown resincroniza
    }

    setNotificacoesAbertas(false);
    if (notificacao.link) {
      onNavigate(notificacao.link);
    }
  }

  async function marcarTodasNotificacoesComoLidas() {
    setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida: true })));
    setNotificacoesNaoLidas(0);

    try {
      await apiRequest("/Notificacoes/lidas", { method: "PUT" });
    } catch {
      // ignora falha silenciosamente; proxima abertura do dropdown resincroniza
    }
  }

  function calcularGruposBusca(termo) {
    if (!termo.trim()) return [];
    const t = termo.toLowerCase();
    const grupos = [];

    const secoesFiltradas = sections
      .filter((s) => s.label.toLowerCase().includes(t) || s.key.toLowerCase().includes(t))
      .slice(0, 3)
      .map((s) => ({
        id: `sec-${s.key}`,
        titulo: s.label,
        descricao: getSectionMeta(s.key, role).description,
        Icone: iconesPorSecao[s.key] || TbLayoutDashboard,
        navegar: () => onNavigate(s.key === "dashboard" ? "/app" : `/app/${s.key}`),
      }));
    if (secoesFiltradas.length) grupos.push({ categoria: "Seções", itens: secoesFiltradas });

    if (temSecaoCursos) {
      const cursosFiltrados = cursos
        .filter((c) => c.titulo?.toLowerCase().includes(t) || c.descricao?.toLowerCase().includes(t))
        .slice(0, 3)
        .map((c) => ({
          id: `crs-${c.id}`,
          titulo: c.titulo,
          descricao: "Curso",
          Icone: TbBooks,
          navegar: () => onNavigate("/app/cursos"),
        }));
      if (cursosFiltrados.length) grupos.push({ categoria: "Cursos", itens: cursosFiltrados });
    }

    if (temSecaoModulos) {
      const modulosFiltrados = modulos
        .filter((m) => m.titulo?.toLowerCase().includes(t))
        .slice(0, 3)
        .map((m) => ({
          id: `mod-${m.id}`,
          titulo: m.titulo,
          descricao: "Módulo",
          Icone: TbStack,
          navegar: () => onNavigate("/app/modulos"),
        }));
      if (modulosFiltrados.length) grupos.push({ categoria: "Módulos", itens: modulosFiltrados });
    }

    return grupos;
  }

  const gruposBusca = calcularGruposBusca(termoBusca);
  const itensBusca = gruposBusca.flatMap((g) => g.itens);

  function handleKeyDownBusca(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceBusca((i) => Math.min(i + 1, itensBusca.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceBusca((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && indiceBusca >= 0 && itensBusca[indiceBusca]) {
      e.preventDefault();
      selecionarResultado(itensBusca[indiceBusca]);
    } else if (e.key === "Escape") {
      setTermoBusca("");
      setBuscaFocada(false);
      setIndiceBusca(-1);
      refInputBusca.current?.blur();
    }
  }

  function selecionarResultado(item) {
    item.navegar();
    setTermoBusca("");
    setBuscaFocada(false);
    setIndiceBusca(-1);
  }

  const comTabs = temNavGrupo(sections, secaoAtual);
  const ehAluno = role === "Aluno";

  return (
    <header className={`topbar${comTabs ? " topbar--com-tabs" : ""}`}>
      <div className="topbar__principal">
        <div className="topbar__esquerda">
          <button
            className="topbar__menu-mobile topbar__hamburger"
            onClick={onAbrirSidebar}
            aria-label="Abrir menu de navegação"
            type="button"
          >
            <TbMenu2 size={22} aria-hidden="true" />
          </button>

          <div className="topbar__contexto">
            <nav className="topbar__breadcrumb" aria-label="Localização atual">
              <span className="topbar__breadcrumb-raiz" style={{ color: "var(--cor-marca-clara)" }}>CodeRyse Academy</span>
              <span className="topbar__breadcrumb-sep" aria-hidden="true" style={{ color: "var(--cor-marca-clara)", fontSize: "1rem" }}>›</span>
              <span className="topbar__breadcrumb-secao">
                <IconeSecao size={16} aria-hidden="true" />
                {meta.title}
              </span>
            </nav>
          </div>
        </div>

        <div className="topbar__busca">
          <TbSearch size={15} aria-hidden="true" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--cor-texto-mudo)", pointerEvents: "none", zIndex: 1 }} />
          <input
            ref={refInputBusca}
            type="search"
            className="campo__entrada"
            placeholder="Buscar seções, cursos..."
            value={termoBusca}
            onChange={(e) => { setTermoBusca(e.target.value); setIndiceBusca(-1); }}
            onKeyDown={handleKeyDownBusca}
            onFocus={() => setBuscaFocada(true)}
            onBlur={() => setTimeout(() => setBuscaFocada(false), 150)}
            aria-label="Busca global"
            aria-autocomplete="list"
            style={{ width: "100%", paddingLeft: "32px", paddingRight: termoBusca ? "32px" : undefined, fontSize: "0.85rem", padding: "0.45rem 1rem 0.45rem 32px" }}
          />
          {termoBusca && (
            <button
              className="topbar__busca-limpar"
              type="button"
              aria-label="Limpar busca"
              onMouseDown={(e) => { e.preventDefault(); setTermoBusca(""); setIndiceBusca(-1); refInputBusca.current?.focus(); }}
            >
              <TbX size={13} aria-hidden="true" />
            </button>
          )}
          {buscaFocada && termoBusca && (
            <div className="busca-dropdown" role="listbox" aria-label="Resultados da busca">
              {gruposBusca.length > 0 ? gruposBusca.map((grupo) => (
                <div key={grupo.categoria} className="busca-dropdown__grupo">
                  <div className="busca-dropdown__categoria">{grupo.categoria}</div>
                  {grupo.itens.map((item) => {
                    const flatIdx = itensBusca.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        className={`busca-dropdown__item${flatIdx === indiceBusca ? " busca-dropdown__item--ativo" : ""}`}
                        type="button"
                        role="option"
                        aria-selected={flatIdx === indiceBusca}
                        onMouseDown={() => selecionarResultado(item)}
                      >
                        <item.Icone size={16} className="busca-dropdown__item-icone" aria-hidden="true" />
                        <div className="busca-dropdown__item-texto">
                          <span className="busca-dropdown__item-titulo">{item.titulo}</span>
                          <span className="busca-dropdown__item-descricao">{item.descricao}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )) : (
                <div className="busca-dropdown__vazio">Nenhum resultado para "{termoBusca}"</div>
              )}
            </div>
          )}
        </div>

        <div className="topbar__acoes">
          {ehAluno && (
            <>
              <motion.button
                className={`topbar__atalho-certificados${secaoAtual === "cursos-matriculados" ? " topbar__atalho-certificados--ativo" : ""}`}
                onClick={() => onNavigate("/app/cursos-matriculados")}
                aria-label="Ir para Meus Cursos"
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                <TbBooks size={18} aria-hidden="true" />
                <span className="topbar__atalho-certificados-label">Meus Cursos</span>
              </motion.button>
              <span className="topbar__separador" aria-hidden="true" />
              <motion.button
                className={`topbar__atalho-certificados${secaoAtual === "matriculas" ? " topbar__atalho-certificados--ativo" : ""}`}
                onClick={() => onNavigate("/app/matriculas")}
                aria-label="Ir para Catálogo de Cursos"
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                <TbClipboardList size={18} aria-hidden="true" />
                <span className="topbar__atalho-certificados-label">Catálogo de Cursos</span>
              </motion.button>
              <span className="topbar__separador" aria-hidden="true" />
              <motion.button
                className={`topbar__atalho-certificados${secaoAtual === "certificados" ? " topbar__atalho-certificados--ativo" : ""}`}
                onClick={() => onNavigate("/app/certificados")}
                aria-label="Ir para Meus Certificados"
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                <TbTrophy size={18} aria-hidden="true" />
                <span className="topbar__atalho-certificados-label">Certificados</span>
              </motion.button>
              <span className="topbar__separador" aria-hidden="true" />
            </>
          )}

          <div className="topbar__notificacoes-wrapper" ref={refNotificacoes}>
            <button
              className="topbar__botao-notificacoes"
              onClick={abrirNotificacoes}
              aria-haspopup="dialog"
              aria-expanded={notificacoesAbertas}
              aria-label={notificacoesNaoLidas > 0 ? `Notificacoes, ${notificacoesNaoLidas} nao lidas` : "Notificacoes"}
              type="button"
            >
              {notificacoesNaoLidas > 0 ? (
                <TbBellRinging size={19} aria-hidden="true" />
              ) : (
                <TbBell size={19} aria-hidden="true" />
              )}
              {notificacoesNaoLidas > 0 ? (
                <span className="topbar__notificacoes-badge" aria-hidden="true">
                  {notificacoesNaoLidas > 9 ? "9+" : notificacoesNaoLidas}
                </span>
              ) : null}
            </button>

            <AnimatePresence>
              {notificacoesAbertas && (
                <motion.div
                  className="painel-notificacoes"
                  role="dialog"
                  aria-label="Notificacoes"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <header className="painel-notificacoes__cabecalho">
                    <h2 className="painel-notificacoes__titulo">Notificacoes</h2>
                    {notificacoesNaoLidas > 0 ? (
                      <button
                        className="link-botao painel-notificacoes__marcar-todas"
                        onClick={marcarTodasNotificacoesComoLidas}
                        type="button"
                      >
                        Marcar todas como lidas
                      </button>
                    ) : null}
                  </header>

                  <ul className="painel-notificacoes__lista" role="list">
                    {carregandoNotificacoes ? (
                      <li className="painel-notificacoes__vazio">Carregando...</li>
                    ) : notificacoes.length === 0 ? (
                      <li className="painel-notificacoes__vazio">Nenhuma notificacao por aqui.</li>
                    ) : (
                      notificacoes.map((notificacao) => (
                        <li key={notificacao.id}>
                          <button
                            className={`painel-notificacoes__item${notificacao.lida ? "" : " painel-notificacoes__item--nao-lida"}`}
                            onClick={() => marcarNotificacaoComoLida(notificacao)}
                            type="button"
                          >
                            <span className="painel-notificacoes__item-titulo">{notificacao.titulo}</span>
                            <span className="painel-notificacoes__item-mensagem">{notificacao.mensagem}</span>
                            <span className="painel-notificacoes__item-data">{formatDate(notificacao.criadoEm)}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="topbar__perfil-wrapper" ref={refWrapper}>
            <button
              className="topbar__perfil"
              onClick={() => setPopupAberto((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={popupAberto}
              aria-label="Abrir perfil do usuário"
              type="button"
              style={{ "--cor-perfil": corPorTipo[role] ?? "#7b2ff7" }}
            >
              <div className="topbar__avatar" aria-hidden="true">
                <TbUserFilled size={18} style={{ color: "#fff" }} />
              </div>
              <div className="topbar__info">
                <span className="topbar__nome">{(usuario.nome ?? "").split(" ")[0]}</span>
                <span className="topbar__cargo">{role}</span>
              </div>
              <TbChevronDown
                size={14}
                className={`topbar__perfil-chevron${popupAberto ? " topbar__perfil-chevron--aberto" : ""}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {popupAberto && (
                <motion.div
                  className="popup-perfil"
                  role="dialog"
                  aria-label="Dados do perfil"
                  aria-modal="false"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <div className="popup-perfil__cabecalho">
                    <div className="popup-perfil__avatar" aria-hidden="true">
                      <TbUserFilled size={28} style={{ color: "#fff" }} />
                    </div>
                    <div className="popup-perfil__identidade">
                      <h2 className="popup-perfil__nome">{usuario.nome}</h2>
                      <span className="popup-perfil__email">{usuario.email}</span>
                      <div><Insignia texto={role} variante={variantePorTipo[role] ?? "neutro"} style={role === "Admin" ? { color: "#fff" } : undefined} /></div>
                    </div>
                  </div>

                  <div className="popup-perfil__rodape">
                    <button
                      className="botao botao--fantasma popup-perfil__editar"
                      onClick={() => { setPopupAberto(false); onAbrirPerfil(); }}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      type="button"
                    >
                      <TbUserCircle size={15} aria-hidden="true" />
                      Meu Perfil
                    </button>
                    <hr style={{ border: "none", borderTop: "1px solid var(--cor-borda)", margin: "4px 0" }} />
                    <button
                      className="botao botao--perigo popup-perfil__sair"
                      onClick={() => { setPopupAberto(false); onLogoutClick(); }}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      type="button"
                    >
                      <MdLogout size={15} aria-hidden="true" />
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {comTabs && <NavGrupo sections={sections} secaoAtual={secaoAtual} onNavigate={onNavigate} />}
    </header>
  );
}
