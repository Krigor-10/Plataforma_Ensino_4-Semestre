import { useEffect, useState } from "react";
import { RouteGate } from "./components/Primitives.jsx";
import TooltipGlobal from "./components/TooltipGlobal.jsx";
import CadastroScreen from "./pages/CadastroScreen.jsx";
import EsqueciSenhaScreen from "./pages/EsqueciSenhaScreen.jsx";
import LoginScreen from "./pages/LoginScreen.jsx";
import RedefinirSenhaScreen from "./pages/RedefinirSenhaScreen.jsx";
import NotFoundScreen from "./pages/NotFoundScreen.jsx";
import PublicHome from "./pages/PublicHome.jsx";
import VerificarCertificadoScreen from "./pages/VerificarCertificadoScreen.jsx";
import WorkspaceScreen from "./pages/WorkspaceScreen.jsx";
import { createDemoSession, disableDemoMode, enableDemoMode, isDemoModeLocked, readDemoMode } from "./lib/demoMode.js";
import { apiRequest } from "./lib/api.js";
import { navigate, readRoute } from "./lib/router.js";
import { clearSession, persistSession, readSession } from "./lib/session.js";

export default function App() {
  const [route, setRoute] = useState(() => readRoute());
  const [session, setSession] = useState({ token: "", refreshToken: "", user: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => readDemoMode());
  const canDisableDemoMode = !isDemoModeLocked();

  useEffect(() => {
    readSession().then((sessaoSalva) => {
      setSession(sessaoSalva);
      setSessionReady(true);
    });
  }, []);

  useEffect(() => {
    function syncRoute() {
      setRoute(readRoute());
    }

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (sessionReady && route.kind === "app" && !session.user) {
      navigate("/login", setRoute, { replace: true });
    }
  }, [sessionReady, route.kind, session.user]);

  useEffect(() => {
    if (
      sessionReady &&
      session.user &&
      (route.kind === "login" || route.kind === "cadastro" || route.kind === "esqueci-senha" || route.kind === "redefinir-senha")
    ) {
      navigate("/app", setRoute, { replace: true });
    }
  }, [sessionReady, route.kind, session.user]);

  function handleNavigate(path, options) {
    navigate(path, setRoute, options);
  }

  function handleSessionStart(nextSession) {
    persistSession(nextSession);
    setSession(nextSession);
    handleNavigate("/app", { replace: true });
  }

  function handleDemoSessionStart(accountKey) {
    enableDemoMode();
    setIsDemoMode(true);
    handleSessionStart(createDemoSession(accountKey));
  }

  function handleDemoModeExit(nextPath = "/login") {
    clearSession();
    setSession({ token: "", user: null });
    setIsDemoMode(disableDemoMode());
    handleNavigate(nextPath, { replace: true });
  }

  function handleLogout(nextPath = "/") {
    if (!isDemoMode && session.refreshToken) {
      apiRequest("/Auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken })
      }).catch(() => {});
    }

    clearSession();
    setSession({ token: "", user: null });
    handleNavigate(nextPath, { replace: true });
  }

  let content;

  if (!sessionReady && route.kind === "app") {
    content = <RouteGate title="Preparando o acesso" text="Verificando sua sessao." />;
  } else if (route.kind === "app" && !session.user) {
    content = <RouteGate title="Preparando o acesso" text="Abrindo a tela de login da EdTech." />;
  } else if (
    session.user &&
    (route.kind === "login" || route.kind === "cadastro" || route.kind === "esqueci-senha" || route.kind === "redefinir-senha")
  ) {
    content = <RouteGate title="Voltando ao painel" text="Sua sessao ja esta ativa no ambiente React." />;
  } else if (route.kind === "login") {
    content = (
      <LoginScreen
        canDisableDemoMode={canDisableDemoMode}
        isDemoMode={isDemoMode}
        onDemoModeExit={handleDemoModeExit}
        onDemoSessionStart={handleDemoSessionStart}
        onNavigate={handleNavigate}
        onSessionStart={handleSessionStart}
      />
    );
  } else if (route.kind === "cadastro") {
    content = <CadastroScreen isDemoMode={isDemoMode} onNavigate={handleNavigate} />;
  } else if (route.kind === "esqueci-senha") {
    content = <EsqueciSenhaScreen onNavigate={handleNavigate} />;
  } else if (route.kind === "redefinir-senha") {
    content = <RedefinirSenhaScreen token={route.token} onNavigate={handleNavigate} />;
  } else if (route.kind === "verificar") {
    content = <VerificarCertificadoScreen codigo={route.codigo} onNavigate={handleNavigate} />;
  } else if (route.kind === "app" && session.user) {
    content = (
      <WorkspaceScreen
        canDisableDemoMode={canDisableDemoMode}
        isDemoMode={isDemoMode}
        onDemoModeExit={handleDemoModeExit}
        route={route}
        usuario={session.user}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSessionExpired={() => handleLogout("/login")}
      />
    );
  } else if (route.kind === "notfound") {
    content = <NotFoundScreen onNavigate={handleNavigate} />;
  } else {
    content = <PublicHome hasSession={Boolean(session.user)} isDemoMode={isDemoMode} onNavigate={handleNavigate} />;
  }

  return (
    <>
      {content}
      <TooltipGlobal />
    </>
  );
}
