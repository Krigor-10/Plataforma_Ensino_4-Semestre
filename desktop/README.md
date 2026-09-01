# Desktop (Electron)

`desktop/` empacota a mesma SPA React já servida pelo backend .NET (`wwwroot`) numa janela Electron — não existe interface nativa própria, é o mesmo frontend web.

## Rodando em dev

Suba o backend normalmente primeiro (ele serve a API e o frontend buildado na mesma porta):

```powershell
dotnet run
```

Em outro terminal:

```powershell
cd desktop
npm install       # primeira vez
npm start          # abre a janela Electron apontando para http://localhost:5000
```

Para apontar para outro host/porta (ex.: um ambiente de homologação), defina `DESKTOP_APP_URL` antes de iniciar:

```powershell
$env:DESKTOP_APP_URL = "http://localhost:5000"
npm start
```

## Build de instalador

```powershell
cd desktop
npm run build   # gera o instalador via electron-builder (NSIS no Windows)
```
