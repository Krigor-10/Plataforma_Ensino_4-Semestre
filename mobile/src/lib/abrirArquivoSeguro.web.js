// Alvo web (react-native-web): expo-file-system/expo-sharing nao tem suporte
// nessa plataforma. Autentica via header Authorization (fetch comum, nunca
// token na URL) e aciona o download do navegador a partir de um blob: URL -
// que nao fica em historico/logs como uma URL de rede real ficaria.
export async function abrirArquivoSeguro({ nomeArquivo, token, urlAbsoluta }) {
  const resposta = await fetch(urlAbsoluta, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao baixar o arquivo (status ${resposta.status}).`);
  }

  const blob = await resposta.blob();
  const urlObjeto = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = urlObjeto;
    link.download = nomeArquivo;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(urlObjeto);
  }
}
