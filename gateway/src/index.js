import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const PORT = process.env.PORT || 4000;
const DOTNET_API_URL = process.env.DOTNET_API_URL || "http://localhost:5000";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(cors({ origin: CORS_ORIGINS }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", upstream: DOTNET_API_URL });
});

app.use(
  createProxyMiddleware({
    target: DOTNET_API_URL,
    changeOrigin: true,
    pathFilter: ["/api", "/uploads"],
    on: {
      // Sem isso, uma falha no upstream (.NET fora do ar, timeout) vaza o
      // erro cru do http-proxy-middleware (stack trace/detalhe interno) pro
      // cliente em vez de uma resposta JSON padrao como o resto da API.
      error: (err, req, res) => {
        console.error(`Erro ao repassar ${req.method} ${req.url} para ${DOTNET_API_URL}:`, err.message);

        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
        }

        res.end(JSON.stringify({ erro: "Nao foi possivel se comunicar com a API no momento.", status: 502 }));
      }
    }
  })
);

app.listen(PORT, () => {
  console.log(`Gateway ouvindo em http://localhost:${PORT}`);
  console.log(`Repassando /api e /uploads para ${DOTNET_API_URL}`);
});
