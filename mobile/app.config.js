// Config dinamica (substitui app.json) so pra poder decidir em tempo de
// build se o Android aceita HTTP sem criptografia (usesCleartextTraffic).
// So o perfil "preview" do EAS precisa disso, pra testar contra o gateway
// numa IP de rede local sem HTTPS configurado (ver eas.json,
// EXPO_PUBLIC_API_URL="http://192.168.0.2:4000"). "production" (e qualquer
// build fora do EAS, incluindo "expo start"/"npm run web" local) fica
// sempre HTTPS-only por padrao - cleartext e excecao, nunca a regra.
//
// Dois sinais, qualquer um liga o cleartext (nenhum dos dois liga sozinho em
// producao): EAS_BUILD_PROFILE e setada automaticamente pelo eas-cli durante
// o build com o nome do profile usado; APP_PERMITE_CLEARTEXT e setada
// explicitamente so no profile "preview" do eas.json, como reforco caso o
// nome do profile algum dia mude ou o build rode fora do fluxo usual do EAS.
const permiteCleartext =
  process.env.EAS_BUILD_PROFILE === "preview" || process.env.APP_PERMITE_CLEARTEXT === "true";

module.exports = {
  expo: {
    name: "mobile",
    slug: "mobile",
    owner: "coderyse",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.plataformaensino.mobile",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      versionCode: 6
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: permiteCleartext
          }
        }
      ],
      "@sentry/react-native",
      "expo-secure-store"
    ],
    extra: {
      eas: {
        projectId: "33116416-1872-483e-9feb-2c4557ec1c16"
      }
    }
  }
};
