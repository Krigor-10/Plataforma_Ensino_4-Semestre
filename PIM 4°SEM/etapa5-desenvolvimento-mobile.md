# Desenvolvimento da Solução Mobile

Etapa 5 do PIM IV (disciplina Desenvolvimento Mobile). O PIM III não tinha nenhuma seção sobre Mobile — essa etapa é conteúdo inteiramente novo do PIM IV, descrevendo o app React Native real em `mobile/`.

## 5.1 Telas Principais

App Expo (bare "blank" template, sem Expo Router) com fluxo de telas por estado, não por rota fixa:

- `LoginScreen` — autenticação
- `AlunoWorkspace` — casca do app autenticado (papel Aluno)
- `AvaliacoesScreen`, `ConteudosScreen`, `ProgressoScreen`, `MatriculasScreen`, `CertificadosScreen`, `NotificacoesScreen`, `PerfilScreen` — uma tela por seção do workspace
- `AcessoNaoSuportadoScreen` — exibida quando o usuário logado não é Aluno (o app mobile hoje só suporta esse papel; Professor/Coordenador/Admin seguem restritos ao Web)

## 5.2 Fluxo de Navegação

`App.js` decide qual tela raiz mostrar com base no estado da sessão, não com um navegador de rotas convencional (só `@react-navigation/native` como wrapper de contexto — `NavigationContainer`):

```
sem sessão          → LoginScreen
sessão + Aluno       → AlunoWorkspace (bottom nav interno entre as 7 seções)
sessão + outro papel → AcessoNaoSuportadoScreen
```

Ao abrir o app, `readSession()` (armazenamento local) decide se pula direto pro workspace ou pede login — sem "piscar" a tela de login pra quem já está autenticado.

## 5.3 Autenticação

Mesmo fluxo de JWT do Web (Etapa 4): login retorna token + refresh token, guardados via `AsyncStorage` (`mobile/src/lib/session.js`, usando o módulo compartilhado `shared/session.js` também usado pelo Web). Logout chama `POST /Auth/logout` invalidando o refresh token no servidor antes de limpar a sessão local — não é só "esquecer" o token no dispositivo.

## 5.4 Sincronização de Dados

Não há cache local nem modo offline: cada tela busca o dado direto da API a cada acesso (`apiRequest`, mesmo cliente HTTP compartilhado com o Web via `shared/apiClient.js`). É uma escolha deliberada de simplicidade para o escopo do PIM — o dado é sempre o mais atual possível, ao custo de exigir conexão pra qualquer tela funcionar.

## 5.5 Integração com APIs

O app fala com o **Gateway** (`gateway/`), nunca direto com a API .NET — mesmo papel que o Gateway cumpre pro Web (ver Etapa 4.1). `mobile/src/lib/config.js` resolve a URL do Gateway por plataforma: `10.0.2.2:4000` no emulador Android (que não enxerga `localhost` do host), `127.0.0.1:4000` em iOS Simulator e no alvo `web` do Expo — com `EXPO_PUBLIC_API_URL` tendo prioridade quando definida (usado nos perfis de build do EAS pra apontar pra um IP de rede real ou pra produção).
