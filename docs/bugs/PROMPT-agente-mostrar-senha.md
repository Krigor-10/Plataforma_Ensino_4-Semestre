# Prompt — Olho de "mostrar senha" nas telas de login e cadastro (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite, ícones `react-icons/tb`). Também vale para o desktop, que é o Electron abrindo o web. Hoje nenhum campo de senha tem botão para mostrar o que foi digitado.

**Escopo decidido pelo usuário:** só as telas públicas. São 5 campos:

| Tela | Arquivo | Campo (id) |
|---|---|---|
| Login | `frontend/src/pages/LoginScreen.jsx` | `login-senha` |
| Cadastro | `frontend/src/pages/CadastroScreen.jsx` | `cad-senha`, `cad-confirmar-senha` |
| Redefinir senha | `frontend/src/pages/RedefinirSenhaScreen.jsx` | `redefinir-nova-senha`, `redefinir-confirmar-senha` |

**Fora do escopo (não mexer agora):** trocar senha no `ModalPerfilWorkspace`, formulários de `SecaoProfessores` e `SecaoCoordenadores`, e o app mobile.

## Tarefa

1. Criar um componente reutilizável em `frontend/src/components/` (sugestão: `CampoSenha.jsx`) que renderize o `<input>` com a classe `campo__entrada` e um botão de olho dentro do campo, à direita.
   - Repassar todas as props para o input (`id`, `name`, `autoComplete`, `minLength`, `required`, `value`, `onChange`, `disabled`, `aria-invalid`/`aria-describedby` vindos de `propsInvalido` no Cadastro).
   - O botão alterna o `type` entre `password` e `text`. Ícones `TbEye` (senha oculta, clique para mostrar) e `TbEyeOff` (senha visível, clique para ocultar).
   - Botão com `type="button"`, para não enviar o formulário, e acessível: `aria-label` "Mostrar senha" / "Ocultar senha", `aria-pressed` refletindo o estado e foco visível pelo teclado.
   - Cada campo controla o próprio estado: mostrar a senha não mostra a confirmação.
   - Ao enviar o formulário, voltar para oculto, para que um erro de login não deixe a senha à mostra.
2. Substituir os 5 inputs pelo componente, mantendo `label htmlFor`, mensagens de erro (`ErroCampo`) e validação como estão.
3. CSS em `styles/componentes.css`: input com `padding-right` para o texto não ficar embaixo do ícone; botão centralizado na vertical, sem fundo, usando as cores/tokens que já existem nos campos (inclusive no estado de erro do Cadastro); área de toque de pelo menos 40×40 px. Esconder o olho nativo do Edge (`input::-ms-reveal { display: none; }`) para não aparecerem dois olhos.
4. Testes (vitest + Testing Library): o clique alterna `type` e `aria-label`; o botão não envia o formulário; o `type` volta a `password` depois do submit.

## Critérios de aceite

- Os 5 campos mostram o olho e alternam corretamente, com mouse e teclado (Tab até o botão, Enter/Espaço).
- O preenchimento automático do navegador continua funcionando (`autoComplete` preservado).
- O visual segue igual aos outros campos (altura, borda, estado de erro), em tema claro e escuro e em largura de celular.
- Edge sem dois olhos.
- `npm run lint` e `npm test` sem erros novos.
