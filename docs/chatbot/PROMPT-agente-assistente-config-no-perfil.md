# Prompt: web Admin — configuração do Assistente CodeRyse sai de Chamados e vai para Meu perfil › Configurações (só visual e local)

## Pedido do usuário (2026-11-25, print de Chamados de suporte no Admin)

"Seria melhor colocar esses dados de valores na tela de configurações ou ocultar?"

São os dados do cartão "Assistente CodeRyse": Ligado, Teto mensal (US$), Salvar, Gasto do mês e Perguntas do mês.

**Decisão do usuário:**
- **não ocultar**, porque o teto e o liga/desliga são o controle de custo do Admin;
- **tirar da tela de Chamados**, que é a fila de atendimento;
- **levar para a aba "Configurações" do modal "Meu perfil"**, que já existe, numa seção visível **só para o Admin**.
- Sem tela nova.

## Onde está (verificado)

- **Origem:** `frontend/src/pages/workspace/SecaoChamados.jsx` ≈ linha 164: `{ehAdmin ? <CartaoAssistenteAdmin onSessionExpired={onSessionExpired} /> : null}`.
- **Componente:** `frontend/src/components/chatbot/CartaoAssistenteAdmin.jsx`.
  - Carrega `obterConfiguracaoChatbot()` + `obterUsoChatbot()` e salva com `atualizarConfiguracaoChatbot({ ativo, tetoMensalUsd })` (`lib/chatbotApi.js`).
  - Tem testes em `CartaoAssistenteAdmin.test.jsx`.
- **Destino:** `frontend/src/pages/workspace/ModalPerfilWorkspace.jsx`.
  - Abas "Informações" / "Configurações" (≈ linha 286).
  - A aba `configuracoes` (≈ linha 371) tem os itens `perfil-seguranca-item`: "Aparência" (switch de tema) e "Senha" (formulário).
  - O modal recebe `perfil` (≈ linha 51).
  - O rodapé do modal mostra "Salvar" ligado ao formulário de senha (`form="form-perfil-senha"`, ≈ linha 218).

## Tarefa

### 1. Chamados só com a fila

- Remover o `CartaoAssistenteAdmin` de `SecaoChamados.jsx`. A tela fica com título, descrição, abas Abertos/Respondidos/Resolvidos, lista e conversa.
- **Atalho opcional discreto:** só para o Admin, à direita do subtítulo, um link pequeno "⚙ Configurar assistente" que abre o modal Meu perfil já na aba Configurações. Só fazer se abrir o modal com aba inicial for simples (prop `abaInicial`). Senão, pular.

### 2. Nova seção em Meu perfil › Configurações (só Admin)

- **Quando:** `perfil === "Admin"`. Usar o mesmo critério que o `WorkspaceScreen` já usa para Admin.
- **Onde:** acrescentar um terceiro item **depois de "Senha"**, no mesmo padrão visual `perfil-seguranca-item`.
- **Esquerda:** ícone de robô/assistente (`TbMessageChatbot` ou similar, 22px), **"Assistente CodeRyse"** e embaixo "Controle de uso e custo do assistente dos alunos."
- **Direita:** o **switch "Ligado"**, no mesmo componente/estilo do switch de tema. Hoje é um checkbox nativo; trocar pelo switch padrão.
- **Embaixo, na largura toda** (como o formulário de senha, `perfil-seguranca-item--formulario`):
  - o campo **"Teto mensal (US$)"** com o botão **"Salvar teto"** ao lado. O botão é **próprio** e **não** usa o "Salvar" do rodapé, que continua só para a senha;
  - dois números: **"Gasto do mês: $0,03 de $20,00"** e **"Perguntas do mês: 46"**, mais uma mini barra de uso (gasto ÷ teto): roxa, âmbar a partir de 80% e vermelha em 100%.
- **Implementação:** reaproveitar a lógica do `CartaoAssistenteAdmin`.
  - **Preferido:** transformá-lo em `SecaoAssistenteConfiguracoes`, ou dar a ele a prop `variante="perfil"`, com o layout acima.
  - **Mantém:** as mesmas chamadas da API, as mensagens de erro e `onSessionExpired`.
  - **Ligar/desligar** continua salvando na hora, como hoje.
- Para quem não é Admin, a aba Configurações fica como hoje (Aparência + Senha).

**Não alterar:**
- as rotas e regras do chatbot (teto, liga/desliga, uso);
- a fila de Chamados e as respostas;
- as abas e o formulário de "Informações" do perfil;
- o formulário de senha e o seu "Salvar".

## Testes (Vitest)

- **`SecaoChamados`:** o Admin **não** vê mais "Teto mensal" nem "Gasto do mês".
- **`ModalPerfilWorkspace`:**
  - o Admin, na aba Configurações, vê "Assistente CodeRyse", o switch, o teto, "Salvar teto", o gasto e as perguntas;
  - Professor, Coordenador e Aluno **não** veem.
- **Assistente:**
  - "Salvar teto" chama `atualizarConfiguracaoChatbot` com o novo teto e mantém o `ativo`;
  - o switch chama com o `ativo` invertido;
  - o "Salvar" do rodapé continua só enviando o formulário de senha.
- **Testes atuais:** os de `CartaoAssistenteAdmin` são migrados para o novo componente/variante, com o mesmo comportamento.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), como Admin:

- **Chamados:** mostra **só** as abas e a fila, sem o cartão do assistente.
- **Meu perfil › Configurações:** aparecem "Aparência", "Senha" e **"Assistente CodeRyse"**:
  - desligar e religar funciona;
  - mudar o teto para 25 e "Salvar teto" persiste depois de recarregar;
  - o gasto e as perguntas do mês aparecem com a mini barra.
- **Outros perfis:** como Professor, a aba Configurações não mostra o Assistente.
- `npm test` (web) e o lint sem erros novos.
