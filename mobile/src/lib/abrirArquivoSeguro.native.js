import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// iOS/Android: baixa o arquivo com o token so no header Authorization (nunca
// na URL) pra um arquivo temporario, depois abre a folha nativa de
// compartilhar/abrir-com. Troca o antigo Linking.openURL(urlComTokenNaQuery),
// que deixava o token no historico/logs do navegador externo - ver Fase 4 em
// mobile_seguranca_sessao_e_certificado. `File.downloadFileAsync` (API nova
// do expo-file-system, SDK 54+) rejeita automaticamente com status != 2xx,
// sem precisar checar manualmente.
export async function abrirArquivoSeguro({ nomeArquivo, token, urlAbsoluta }) {
  const destino = new File(Paths.cache, nomeArquivo);
  const arquivoBaixado = await File.downloadFileAsync(urlAbsoluta, destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true
  });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (!podeCompartilhar) {
    throw new Error("Não é possível abrir arquivos neste dispositivo.");
  }

  await Sharing.shareAsync(arquivoBaixado.uri);
}
