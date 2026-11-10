# Prompt — Bug: borda direita esmaecida nas abas Ativos/Inativos (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print):** na tela Professores, o lado direito da caixa das abas "Ativos 11 / Inativos 0" some num degradê, como uma sombra, mesmo com as duas abas cabendo inteiras.

**Decisão do usuário:** tirar só esse esmaecimento da borda direita. O brilho roxo da aba ativa (`box-shadow` de `.abas-matriculas__aba--ativa`) **fica como está**.

## O que o agente de arquitetura já verificou (não repetir)

- O efeito vem de `.abas-matriculas` em `frontend/src/styles/layout.css` ≈ linhas 1126–1143: `mask-image` / `-webkit-mask-image` com `linear-gradient(to right, black calc(100% - 1rem), transparent 100%)`, aplicado sempre.
- Pelo comentário da regra, o degradê serve para indicar que há abas escondidas pelo scroll horizontal, como as 3 abas do modal "Meu perfil" em tela estreita. Mas ele aparece mesmo quando nada está escondido.
- Medido no CSS carregado em 127.0.0.1:5173, com a barra montada temporariamente na página: `scrollWidth` 249 = `clientWidth` 249, ou seja, nada para rolar, e a máscara apagando os últimos 16px mesmo assim.
- A barra aparece em 5 lugares, todos com `className="abas-matriculas"`, sem componente compartilhado:
  - `pages/CadastroScreen.jsx` ≈ 260;
  - `pages/workspace/ModalPerfilWorkspace.jsx` ≈ 248;
  - `pages/workspace/PainelCursoGestao.jsx` ≈ 267;
  - `pages/workspace/SecaoCoordenadores.jsx` ≈ 343;
  - `pages/workspace/SecaoProfessores.jsx` ≈ 463.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Tirar a máscara da regra base `.abas-matriculas` e aplicá-la só com um modificador, por exemplo `.abas-matriculas--mais-a-direita`, quando houver abas escondidas à direita.
2. Ligar e desligar o modificador por JS, com um hook pequeno e reaproveitável (por exemplo `useIndicadorRolagemHorizontal(ref)` em `frontend/src/hooks/`). Ele mede `scrollLeft + clientWidth < scrollWidth - 1`, e recalcula no `scroll`, com `ResizeObserver` e quando as abas mudam. Usar o hook nos 5 lugares acima. Ao rolar até o fim, o degradê some.
3. Atualizar o comentário da regra.

**Não alterar** o brilho da aba ativa, as cores, o espaçamento, o raio ou o comportamento de rolagem das abas.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- Professores, Coordenadores e as abas da tela do curso (Coordenador/Admin): borda direita da caixa inteira, igual aos outros lados, no desktop.
- Modal "Meu perfil" e cadastro em largura de celular (≈ 400px): o degradê aparece quando há abas escondidas à direita e some ao rolar até o fim.
- Brilho roxo da aba ativa igual a antes.
- Testes (vitest) do hook: com e sem conteúdo escondido, e depois de rolar até o fim.
- `npm run lint` e `npm test` sem erros novos.
