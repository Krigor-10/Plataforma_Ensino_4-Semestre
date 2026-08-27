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
    pathFilter: "/api"
  })
);

app.listen(PORT, () => {
  console.log(`Gateway ouvindo em http://localhost:${PORT}`);
  console.log(`Repassando /api para ${DOTNET_API_URL}/api`);
});
