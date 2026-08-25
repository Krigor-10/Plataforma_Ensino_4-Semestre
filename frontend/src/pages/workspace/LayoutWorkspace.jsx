/* ============================================================
   LAYOUT WORKSPACE — Shell autenticado (visual do protótipo)
   Envolve o conteúdo já renderizado por WorkspaceScreen (children)
   com a sidebar/topbar/nav mobile no estilo CodeRyse Academy.
   ============================================================ */
import { useState } from "react";
import BarraLateral from "./BarraLateral.jsx";
import BarraTopo from "./BarraTopo.jsx";
import BarraNavMobile from "./BarraNavMobile.jsx";
import { temNavGrupo } from "./NavGrupo.jsx";

export default function LayoutWorkspace({
  usuario,
  secaoAtual,
  sections,
  cursos,
  modulos,
  contadorMatriculasPendentes,
  onNavigate,
  onAbrirPerfil,
  onLogoutClick,
  children,
}) {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div className="layout-workspace">
      <a href="#conteudo-principal" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>

      <BarraLateral
        usuario={usuario}
        secaoAtual={secaoAtual}
        sections={sections}
        aberta={sidebarAberta}
        onFechar={() => setSidebarAberta(false)}
        onNavigate={onNavigate}
        onAbrirPerfil={onAbrirPerfil}
        onLogoutClick={onLogoutClick}
        contadorMatriculasPendentes={contadorMatriculasPendentes}
      />

      <div className="layout-conteudo">
        <BarraTopo
          usuario={usuario}
          secaoAtual={secaoAtual}
          sections={sections}
          cursos={cursos}
          modulos={modulos}
          onNavigate={onNavigate}
          onAbrirSidebar={() => setSidebarAberta(true)}
          onAbrirPerfil={onAbrirPerfil}
          onLogoutClick={onLogoutClick}
        />

        <main
          className={`layout-principal${temNavGrupo(sections, secaoAtual) ? " layout-principal--com-tabs" : ""}`}
          id="conteudo-principal"
          tabIndex={-1}
        >
          <div key={secaoAtual} className="tela-animada">
            {children}
          </div>
        </main>
      </div>

      <BarraNavMobile sections={sections} secaoAtual={secaoAtual} onNavigate={onNavigate} />
    </div>
  );
}
