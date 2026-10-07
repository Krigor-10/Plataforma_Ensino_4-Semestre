// Script de uso unico: as imagens em src/assets foram commitadas em
// resolucao de foto de banco de imagens (ate 7360x4912) sem nenhum
// redimensionamento/compressao, mesmo sendo exibidas como thumbnail de
// card (16:9, ~450px de largura renderizada). Rodar uma vez pra corrigir
// o que ja esta commitado - vite-plugin-image-optimizer (vite.config.js)
// cobre qualquer imagem nova adicionada depois.
import sharp from "sharp";
import { readdirSync, renameSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const pastaAssets = fileURLToPath(new URL("../src/assets/", import.meta.url));

const LARGURA_MAXIMA_CARD = 960;
const QUALIDADE_JPEG = 78;

async function processar(nomeArquivo) {
  const caminhoOriginal = join(pastaAssets, nomeArquivo);
  const metadata = await sharp(caminhoOriginal).metadata();

  const larguraDestino = Math.min(metadata.width ?? LARGURA_MAXIMA_CARD, LARGURA_MAXIMA_CARD);

  const pipeline = sharp(caminhoOriginal).resize({ width: larguraDestino, withoutEnlargement: true });

  const vaiConverterParaJpeg = extname(nomeArquivo).toLowerCase() === ".png";
  const nomeFinal = vaiConverterParaJpeg
    ? nomeArquivo.replace(/\.png$/i, ".jpg")
    : nomeArquivo;
  const caminhoFinal = join(pastaAssets, nomeFinal);
  const caminhoTemporario = `${caminhoFinal}.tmp`;

  await pipeline.jpeg({ quality: QUALIDADE_JPEG, mozjpeg: true }).toFile(caminhoTemporario);

  if (vaiConverterParaJpeg) {
    unlinkSync(caminhoOriginal);
  }
  renameSync(caminhoTemporario, caminhoFinal);

  return { nomeArquivo, nomeFinal };
}

const arquivos = readdirSync(pastaAssets).filter((nome) => /\.(jpe?g|png)$/i.test(nome));

for (const nomeArquivo of arquivos) {
  const { nomeFinal } = await processar(nomeArquivo);
  console.log(`${nomeArquivo} -> ${nomeFinal}`);
}
