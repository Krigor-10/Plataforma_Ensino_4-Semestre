import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const PORT = process.env.PORT || 4000;
const DOTNET_API_URL = process.env.DOTNET_API_URL || "http://localhost:5000";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

// CSP e Cross-Origin-Resource-Policy desligados: este gateway so serve JSON/
// binario proxiado (/api, /uploads), nunca HTML, entao CSP nao tem o que
// proteger aqui; CORP "same-origin" (o default do helmet) bloquearia o
// frontend (origem separada em dev e possivelmente em producao) de carregar
// imagens/PDFs de /uploads via <img>/<a>. O resto dos headers do helmet
// (X-Content-Type-Options, X-Frame-Options, HSTS, etc.) fica ativo.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
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
