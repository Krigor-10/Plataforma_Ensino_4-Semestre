# Prompt: clicar no módulo pisca a tela e volta para a lista (correção do commit 2324570, só frontend web)

## Problema relatado pelo usuário

Na tela do curso do Admin e do Coordenador (aba Módulos), o clique num módulo **pisca a tela e continua na lista de módulos**. A tela do módulo (`TelaModuloGestao`) nunca aparece.

## Causa (verificada pelo agente de arquitetura no código, não repetir a investigação)

`frontend/src/pages/WorkspaceScreen.jsx`, no `useEffect` da rota canônica (≈ linhas 123–137):

```js
const canonicalPath =
  activeSection === "dashboard" ? "/app" : `/app/${activeSection}${route.param ? `/${route.param}` : ""}`;
...
if (normalizePath(currentPath) !== canonicalPath) {
  onNavigate(canonicalPath, { replace: true });
}
```

O caminho canônico só leva em conta `section` e `param`. O que acontece hoje:
1. O clique navega para `/app/cursos/12/modulos/34`, e a tela do módulo começa a abrir: é a piscada.
2. Esse efeito compara com `/app/cursos/12`, acha diferente e faz `replace` para `/app/cursos/12`.
3. O `subsecao`/`subparam` some, e a lista volta.

O commit `2324570` estendeu `readRoute` (`lib/router.js`) e repassou `moduloIdSelecionado`, mas não ajustou esse efeito. Os testes não pegaram porque testam `readRoute` e o `PainelCursoGestao` isolados, sem o `WorkspaceScreen`.

## Tarefa

1. No efeito da rota canônica do `WorkspaceScreen.jsx`, **preservar `subsecao` e `subparam`** quando existirem, por exemplo `/app/cursos/12/modulos/34`. Incluir `route.subsecao` e `route.subparam` nas dependências do efeito.
   - Manter só para o caso válido de hoje: seção `cursos`, com `param`, `subsecao === "modulos"` e `subparam`. Qualquer outra combinação continua sendo cortada para `section/param`, como hoje.
2. **Teste de regressão (vitest)** que pegue esse caso pelo caminho real:
   - com a URL `/app/cursos/:id/modulos/:moduloId`, o `WorkspaceScreen` (ou o fluxo `SecaoCursos` → `PainelCursoGestao` com a rota) **não** faz `replace` para `/app/cursos/:id`, e a tela do módulo aparece;
   - outra URL com segmentos a mais, por exemplo `/app/alunos/5/qualquer`, continua sendo cortada como hoje.

**Não alterar:** o resto do fluxo do commit `2324570`, o backend e as outras seções.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como Admin e como Coordenador:
- Clicar num módulo abre a tela do módulo e a URL fica em `/app/cursos/:id/modulos/:moduloId`, sem piscar de volta.
- Recarregar (F5) na URL do módulo abre o mesmo módulo.
- O voltar do navegador volta para a lista de módulos.
- Módulo anterior/próximo trocam a URL e a tela.
- Um `moduloId` inválido volta para `/app/cursos/:id`, como já estava previsto.
- Depois disso, conferir o resto dos critérios de `docs/fluxo-coordenador/PROMPT-agente-modulo-tela-propria.md`, que não deu para ver por causa deste bug: painel ao lado, gabarito, anterior/próximo item, Esc, tela estreita.
- `npm run lint` e `npm test` sem erros novos.
