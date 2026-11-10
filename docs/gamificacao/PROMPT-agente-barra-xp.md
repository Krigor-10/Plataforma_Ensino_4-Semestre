# Prompt — Barra de XP do aluno (web)

## Contexto

Adicionar uma barra de XP e nível para o aluno em dois lugares:

- **Etapa 1:** versão completa no Panorama, à direita de "Olá, Aluno";
- **Etapa 2:** versão compacta na barra de abas do Acadêmico, à direita.

O projeto ainda não tem XP nem nível no banco, nas rotas ou no frontend. Por decisão do usuário, nesta entrega o XP é **calculado no frontend a partir do progresso que já existe**. Nada é gravado.

**Só frontend. Sem rota nova, sem migration, sem dependência nova e sem mudar regra de progresso.** Verifique no app real (`http://127.0.0.1:5173`, com o backend local), com uma conta de aluno. Não use modo demo. Os números de linha valem para a versão de 2026-11-06.

## Escopo

**Muda:**

- novo `frontend/src/lib/xp.js` e `frontend/src/lib/xp.test.js`;
- novo `frontend/src/components/ProgressoXp.jsx`;
- `frontend/src/pages/workspace/DashboardAluno.jsx`;
- `frontend/src/pages/WorkspaceScreen.jsx`, `LayoutWorkspace.jsx`, `BarraTopo.jsx` e `NavGrupo.jsx` (só a Etapa 2);
- `frontend/src/styles/layout.css`.

**Não muda:**

- card "Pronto para começar" e "Em andamento", lista de cursos ativos e cartões de estatística do Panorama;
- classes compartilhadas `.cabecalho-pagina` e `.barra-progresso`: elas atendem outras telas;
- dashboards de Admin, Professor e Coordenador;
- `Trilha de conteúdos`, Avaliações e Certificados;
- app `mobile/` em React Native: vale só o site em tela pequena;
- `frontend/src/styles/workspace.css` e `base.css`: têm alterações em aberto de outro trabalho. Coloque os estilos novos em `layout.css`.

## 1. Regra de XP

Criar `frontend/src/lib/xp.js`, com a regra concentrada nestas constantes:

```js
export const XP_POR_CONTEUDO = 10;
export const XP_POR_MODULO = 50;
export const XP_POR_CURSO = 200;
export const XP_POR_NIVEL = 500;

export function calcularXp(progressos = {}) { /* ... */ }
```

`calcularXp` conta os itens com `normalizeProgressStatus(item.statusProgresso) === "Concluido"` em `progressos.conteudos`, `progressos.modulos` e `progressos.cursos`, e devolve:

```js
{
  total,            // XP acumulado
  nivel,            // Math.floor(total / XP_POR_NIVEL) + 1
  xpNoNivel,        // total % XP_POR_NIVEL
  xpPorNivel,       // XP_POR_NIVEL
  percentualNivel   // Math.round((xpNoNivel / XP_POR_NIVEL) * 100)
}
```

Use o mesmo critério dos cartões "Conteúdos concluídos" e "Módulos concluídos" do Panorama, para os números não se contradizerem. Não conte quiz, avaliação nem nota: quiz não gera nota, e essa regra ainda não foi decidida.

O valor é derivado. Se um módulo deixar de estar concluído, por exemplo quando entrar conteúdo novo, o XP pode diminuir. Isso é esperado nesta entrega: não crie histórico nem compensação.

## 2. Componente

Criar `frontend/src/components/ProgressoXp.jsx`:

```jsx
<ProgressoXp xp={xp} variante="completa" />
<ProgressoXp xp={xp} variante="compacta" />
```

- Reaproveite `BarraProgresso`, com `mostrarTexto={false}` e `rotuloAria` igual a ``Nível ${nivel}: ${xpNoNivel} de ${xpPorNivel} XP``.
- `xp` nulo: não renderiza nada.
- **Completa:** primeira linha com ícone `TbBolt` em `--cor-marca` e "Nível N" à esquerda, "X / 500 XP" à direita, em `--cor-texto-suave`. Segunda linha com a barra.
- **Compacta:** "Nível N" e uma barra fina na mesma linha, sem o texto de XP.
- Não use `TbTrophy`: ele já representa Certificados na navegação.
- Sem animação nova e sem cor nova: use só as variáveis do tema. Confira nos temas escuro e claro.

## 3. Etapa 1: Panorama

Em `DashboardAluno.jsx`, o `<header className="cabecalho-pagina">` (linha 95) tem um único filho, e `.cabecalho-pagina` já usa `justify-content: space-between` e `flex-wrap: wrap`. Basta acrescentar um segundo filho depois da `div` da saudação:

```jsx
{matriculasAprovadas.length > 0 ? <ProgressoXp variante="completa" xp={calcularXp(progressos)} /> : null}
```

Sem matrícula aprovada, o bloco não aparece, e o cabeçalho fica como hoje.

Estilos em `layout.css`, com classes próprias (`.progresso-xp`, `.progresso-xp--completa`, `.progresso-xp--compacta`):

- completa com `flex: 0 1 20rem` e `min-width: 14rem`;
- altura sem ultrapassar o bloco de título e subtítulo: **o cabeçalho não pode ficar mais alto** no desktop;
- sem cartão nem borda, para não competir com o card logo abaixo;
- em até 768px, `.cabecalho-pagina` vira coluna: use `align-self: stretch` e `flex-basis: auto`, para o bloco ocupar a largura toda abaixo da saudação.

## 4. Etapa 2: barra de abas do Acadêmico

Só para aluno. As outras contas não podem ver nem receber esse dado.

- Em `WorkspaceScreen.jsx`, calcular `xpAluno` com `useMemo`: `isStudent && hasData ? calcularXp(snapshot.progressos) : null`. Sem `hasData`, a carga inicial mostraria nível 1 por um instante.
- Passar `xpAluno` por `LayoutWorkspace` → `BarraTopo` → `NavGrupo`, com padrão `null`.
- Em `NavGrupo.jsx`, depois de `.nav-grupo__tabs` e **fora do `tablist`**, renderizar `<ProgressoXp variante="compacta" xp={xpAluno} />`.
- Usar `margin-left: auto` e `flex-shrink: 0`. Altura máxima de 44px: `.nav-grupo` tem altura fixa e `overflow-x: auto`.
- Ocultar a variante compacta em até 768px. As abas têm prioridade.

Não altere `temNavGrupo`, `ALTURA_NAV_GRUPO` nem a altura da barra: `.layout-principal--com-tabs` depende disso.

## 5. Testes

Em `frontend/src/lib/xp.test.js`, cubra:

- `progressos` vazio ou indefinido: `total` 0, `nivel` 1, `percentualNivel` 0;
- status numérico `3` e texto "Concluido" contam; "Em andamento" e "Nao iniciado" não;
- 2 conteúdos, 1 módulo e 1 curso concluídos: `total` 270;
- `total` 499: nível 1. `total` 500: nível 2 e `xpNoNivel` 0.

## 6. Verificação

Rode `npm test` e `npm run build` em `frontend`. No app real, com conta de aluno, confira:

1. **Panorama em 1920px:** bloco à direita da saudação, sem aumentar o cabeçalho nem deslocar o card.
2. **Panorama em 1024px e 375px:** sem rolagem horizontal; em 375px, o bloco fica abaixo da saudação.
3. **Conteúdos e Avaliações:** versão compacta à direita das abas, sem aumentar a barra e com o mesmo nível do Panorama.
4. **Em até 768px:** versão compacta oculta e abas funcionando.
5. **Concluir um conteúdo:** ao voltar ao Panorama, o XP sobe 10, junto com o cartão "Conteúdos concluídos". Se o conteúdo fechar um módulo ou curso, somam-se 50 ou 200.
6. **Aluno sem matrícula aprovada:** Panorama igual ao de hoje.
7. **Professor, coordenador e admin:** nada de XP nos dashboards nem nas abas.
8. **Temas escuro e claro:** leitura correta.
9. **Leitor de tela:** a barra anuncia o nível e o XP, e o bloco não entra na navegação por abas.

Na entrega, informe os arquivos alterados, o resultado dos testes e prints do Panorama e do Acadêmico.
