const { app, BrowserWindow } = require("electron");
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

app.whenReady().then(() => {
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
