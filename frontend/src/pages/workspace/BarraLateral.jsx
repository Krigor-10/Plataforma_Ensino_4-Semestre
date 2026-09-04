/* ============================================================
   BARRA LATERAL — Navegação principal por seção
   Adaptado do protótipo CodeRyse Academy: mesma marcação/CSS,
   navegação via onNavigate (roteador próprio do app) em vez de
   react-router, e grupos derivados de APP_SECTIONS em vez do
   conjunto fixo de seções do protótipo.
   ============================================================ */
import { useState, useEffect } from "react";
import { TbUserFilled } from "react-icons/tb";
import {
  MdDashboard,
  MdSchool,
  MdCastForEducation,
  MdManageAccounts,
  MdMenuBook,
  MdLayers,
  MdGroups,
  MdAssignment,
  MdAssignmentTurnedIn,
  MdDescription,
  MdTrendingUp,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
  MdChevronRight,
  MdLogout,
} from "react-icons/md";
import { TbTrophy } from "react-icons/tb";

export const corPorTipo = {
  Aluno: "#7b2ff7",
  Professor: "#3b82f6",
  Coordenador: "#f59e0b",
  Admin: "#ef4444",
};

const ICONES_SECAO = {
  dashboard: <MdDashboard size={18} />,
  alunos: <MdSchool size={18} />,
  professores: <MdCastForEducation size={18} />,
  coordenadores: <MdManageAccounts size={18} />,
  cursos: <MdMenuBook size={18} />,
  modulos: <MdLayers size={18} />,
  turmas: <MdGroups size={18} />,
  matriculas: <MdAssignment size={18} />,
  avaliacoes: <MdAssignmentTurnedIn size={18} />,
  conteudos: <MdDescription size={18} />,
  certificados: <TbTrophy size={18} />,
  "meus-cursos": <MdTrendingUp size={18} />,
};

/* Definição dos grupos accordion — adaptada às seções que existem hoje no app real */
export const GRUPOS_DEF = {
  pessoas: {
    rotulo: "Gestão",
    Icone: MdGroups,
    filhos: ["alunos", "professores", "coordenadores"],
  },
  academico: {
    rotulo: "Acadêmico",
    Icone: MdMenuBook,
    filhos: ["cursos", "modulos", "conteudos", "avaliacoes", "turmas"],
  },
};

export const FILHO_PARA_GRUPO = Object.entries(GRUPOS_DEF).reduce((mapa, [chave, def]) => {
  def.filhos.forEach((filho) => { mapa[filho] = chave; });
  return mapa;
}, {});

export default function BarraLateral({
  usuario,
  secaoAtual,
  sections,
  aberta,
  onFechar,
  onNavigate,
  onAbrirPerfil,
  onLogoutClick,
  contadorMatriculasPendentes = 0,
}) {
  function irPara(chave) {
    onNavigate(chave === "dashboard" ? "/app" : `/app/${chave}`);
  }

  const [recolhida, setRecolhida] = useState(
    () => localStorage.getItem("coderyse-sidebar") === "recolhida"
  );
  const [hovering, setHovering] = useState(false);
  const [expandidos, setExpandidos] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("coderyse-sidebar-grupos") ?? '["pessoas","academico"]'));
    } catch {
      return new Set(["pessoas"]);
    }
  });

  useEffect(() => {
    const largura = recolhida ? "4rem" : "17rem";
    document.documentElement.style.setProperty("--largura-sidebar", largura);
    localStorage.setItem("coderyse-sidebar", recolhida ? "recolhida" : "expandida");
  }, [recolhida]);

  useEffect(() => {
    localStorage.setItem("coderyse-sidebar-grupos", JSON.stringify([...expandidos]));
  }, [expandidos]);

  // Mesmo padrao de scroll-lock ja usado em Modal.jsx: sem isso, com o menu
  // mobile aberto (drawer sobre overlay) a pagina de fundo ainda rola junto,
  // quebrando a sensacao de overlay.
  useEffect(() => {
    if (!aberta) {
      return;
    }

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberta]);

  function alternarGrupo(chave) {
    setExpandidos((prev) => {
      const prox = new Set(prev);
      prox.has(chave) ? prox.delete(chave) : prox.add(chave);
      return prox;
    });
  }

  const itensMenu = sections;

  /* Monta a lista de renderização com grupos injetados (vira grupo com 1+ filho visivel,
     entao "Gestao" continua aparecendo mesmo quando o papel so tem acesso a Professores) */
  const renderItens = (() => {
    const gruposVisiveis = {};
    for (const [chave, def] of Object.entries(GRUPOS_DEF)) {
      const filhosVisiveis = def.filhos
        .map((f) => itensMenu.find((i) => i.key === f))
        .filter(Boolean);
      if (filhosVisiveis.length >= 1) {
        gruposVisiveis[chave] = { ...def, filhosVisiveis };
      }
    }

    const emGrupo = new Set(
      Object.values(gruposVisiveis).flatMap((g) => g.filhosVisiveis.map((f) => f.key))
    );

    const lista = [];
    const gruposInjetados = new Set();

    for (const item of itensMenu) {
      const grupoKey = FILHO_PARA_GRUPO[item.key];
      if (grupoKey && emGrupo.has(item.key) && gruposVisiveis[grupoKey]) {
        if (!gruposInjetados.has(grupoKey)) {
          gruposInjetados.add(grupoKey);
          lista.push({ tipo: "grupo", chave: grupoKey, ...gruposVisiveis[grupoKey] });
        }
      } else {
        lista.push({ tipo: "item", ...item });
      }
    }
    return lista;
  })();

  function renderBadge(chave) {
    if (chave === "matriculas" && contadorMatriculasPendentes > 0) {
      return (
        <span className="sidebar__badge" aria-label={`${contadorMatriculasPendentes} matrículas pendentes`}>
          {contadorMatriculasPendentes}
        </span>
      );
    }
    return null;
  }

  return (
    <>
      {aberta && (
        <div className="sidebar-overlay" onClick={onFechar} aria-hidden="true" />
      )}

      <aside
        className={`sidebar${aberta ? " sidebar--aberta" : ""}${recolhida && !hovering ? " sidebar--recolhida" : ""}${recolhida && hovering ? " sidebar--peek" : ""}`}
        aria-label="Menu de navegação principal"
        onMouseEnter={() => recolhida && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <a
          href="#conteudo-principal"
          className="sidebar__logo"
          aria-label="CodeRyse — ir para o painel"
        >
          <span className="sidebar__logo-marca" aria-hidden="true">
            <span>Code</span>
            <span>Ryse</span>
          </span>
          <span className="sidebar__logo-subtitulo">Academy</span>
        </a>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          <ul className="sidebar__lista" role="list">
            {renderItens.map((item) => {
              if (item.tipo === "grupo") {
                const { Icone, chave, rotulo, filhosVisiveis } = item;
                const aberto = expandidos.has(chave);
                return (
                  <li key={chave}>
                    <button
                      className="sidebar__item sidebar__grupo-btn"
                      onClick={() => alternarGrupo(chave)}
                      aria-expanded={aberto}
                      aria-controls={`sidebar-grupo-${chave}`}
                      title={rotulo}
                      type="button"
                    >
                      <span className="sidebar__item-icone" aria-hidden="true">
                        <Icone size={18} />
                      </span>
                      <span className="sidebar__item-rotulo">{rotulo}</span>
                      <MdChevronRight
                        size={16}
                        aria-hidden="true"
                        className={`sidebar__grupo-chevron${aberto ? " sidebar__grupo-chevron--aberto" : ""}`}
                      />
                    </button>

                    {aberto && (
                      <ul id={`sidebar-grupo-${chave}`} className="sidebar__subitens" role="list">
                        {filhosVisiveis.map((filho) => (
                          <li key={filho.key}>
                            <button
                              className={`sidebar__item sidebar__item--filho${secaoAtual === filho.key ? " sidebar__item--ativo" : ""}`}
                              onClick={() => { irPara(filho.key); onFechar?.(); }}
                              aria-current={secaoAtual === filho.key ? "page" : undefined}
                              title={filho.label}
                              type="button"
                            >
                              <span className="sidebar__item-icone" aria-hidden="true">
                                {ICONES_SECAO[filho.key]}
                                {renderBadge(filho.key)}
                              </span>
                              <span className="sidebar__item-rotulo">{filho.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <button
                    className={`sidebar__item${secaoAtual === item.key ? " sidebar__item--ativo" : ""}`}
                    onClick={() => { irPara(item.key); onFechar?.(); }}
                    aria-current={secaoAtual === item.key ? "page" : undefined}
                    title={item.label}
                    type="button"
                  >
                    <span className="sidebar__item-icone" aria-hidden="true">
                      {ICONES_SECAO[item.key]}
                      {renderBadge(item.key)}
                    </span>
                    <span className="sidebar__item-rotulo">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="sidebar__rodape">
          <button
            type="button"
            className="sidebar__mini-usuario"
            onClick={onAbrirPerfil}
            title={usuario.nome}
            aria-label={`Meu perfil — ${usuario.nome}`}
          >
            <span
              className="sidebar__mini-usuario__avatar"
              style={{ "--cor-perfil": corPorTipo[usuario.tipoUsuario] ?? "#7b2ff7" }}
              aria-hidden="true"
            >
              <TbUserFilled size={15} style={{ color: "#fff" }} />
            </span>
            <span className="sidebar__mini-usuario__info">
              <span className="sidebar__mini-usuario__nome">{usuario.nome}</span>
              <span className="sidebar__mini-usuario__tipo">{usuario.tipoUsuario}</span>
            </span>
          </button>

          <button
            className="sidebar__item sidebar__item--sair"
            onClick={onLogoutClick}
            title="Sair da conta"
            type="button"
            aria-label="Sair da conta"
          >
            <span className="sidebar__item-icone" aria-hidden="true">
              <MdLogout size={18} />
            </span>
            <span className="sidebar__item-rotulo">Sair</span>
          </button>

          <button
            className="sidebar__toggle"
            onClick={() => setRecolhida((v) => !v)}
            aria-label={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            type="button"
          >
            {recolhida
              ? <MdKeyboardDoubleArrowRight size={18} aria-hidden="true" />
              : <MdKeyboardDoubleArrowLeft size={18} aria-hidden="true" />
            }
          </button>
        </footer>
      </aside>
    </>
  );
}
