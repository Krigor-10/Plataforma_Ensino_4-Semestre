const { app, BrowserWindow, session } = require("electron");
const path = require("path");

// O app desktop nao tem interface propria: ele abre uma janela Electron
// carregando a mesma SPA React ja servida pelo backend .NET em wwwroot,
// junto com a API, no mesmo host/porta (sem CORS, sem duplicar o gateway).
const APP_URL = process.env.DESKTOP_APP_URL || "http://localhost:5000";

function criarJanelaPrincipal() {
  const janela = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "PlataformaEnsino",
    icon: path.join(__dirname, "..", "frontend", "src", "assets", "icon.svg"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  janela.loadURL(APP_URL);
}

// Camada extra de defesa em profundidade (contextIsolation/nodeIntegration/
// sandbox acima ja bloqueiam o risco classico de Electron - acesso a Node a
// partir do renderer). Sem CSP, um XSS na SPA ainda poderia carregar
// script/recurso de qualquer origem; isso restringe a origem propria mesmo
// nesse cenario. 'unsafe-inline' em style-src e necessario porque a SPA usa
// style={{}} inline extensivamente (React) e framer-motion tambem injeta
// estilo inline em runtime.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join("; ");

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP]
      }
    });
  });

  criarJanelaPrincipal();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanelaPrincipal();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
