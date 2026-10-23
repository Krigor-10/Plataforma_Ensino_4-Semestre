# Desktop (Electron)

`desktop/` empacota a mesma SPA React já servida pelo backend .NET (`wwwroot`) numa janela Electron — não existe interface nativa própria, é o mesmo frontend web.

**Importante:** o app aponta para produção (Azure, `https://app-coderyse-academy.azurewebsites.net`) por padrão — é o que precisa ir dentro do instalador distribuído, já que o usuário final não tem o backend local. Para dev, é preciso sobrescrever explicitamente com `DESKTOP_APP_URL`, senão `npm start` abre a janela já conectada em produção.

## Rodando em dev

Suba o backend normalmente primeiro (ele serve a API e o frontend buildado na mesma porta):

```powershell
dotnet run
```

Em outro terminal:

```powershell
cd desktop
npm install       # primeira vez
$env:DESKTOP_APP_URL = "http://localhost:5000"
npm start          # abre a janela Electron apontando para o backend local
```

Para apontar para outro host/porta (ex.: um ambiente de homologação), use essa mesma variável com a URL desejada.

## Build de instalador

```powershell
cd desktop
npm run build   # gera o instalador via electron-builder (NSIS no Windows), ja apontando pra producao
```

O instalador gerado não precisa de nenhuma configuração adicional da máquina de quem instala — `DESKTOP_APP_URL` só é necessário pra rodar localmente em dev, nunca pro instalador final.
