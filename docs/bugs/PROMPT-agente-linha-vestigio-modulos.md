# Prompt — Bug: linha de vestígio embaixo dos módulos nas trilhas de Conteúdos (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário:** no acesso de ALUNO, aba Conteúdos de um curso, em tela estreita, aparece uma linha horizontal fina embaixo do cartão do módulo, com a ponta esquerda reta saindo da faixa arredondada do cabeçalho. Parece um vestígio de layout antigo e deve ser removida.

## O que o agente de arquitetura já verificou (não repetir)

- A linha é o `border-bottom` de `.conteudos-modulo`, base em `frontend/src/styles/workspace.css` (≈ linhas 5620–5626).
- As seções da trilha usam `class="conteudos-modulo conteudos-modulo--cartao"`:
  - `SecoesAluno.jsx` ≈ linha 2011 (trilha do aluno);
  - `SecaoConteudosProfessor.jsx` ≈ linhas 1486 e 2001 (trilha do professor e prévia "Visualizar como aluno").
- `.conteudos-modulo--cartao` (≈ linha 4489) vem **antes** da base no mesmo arquivo e tem a mesma especificidade (uma classe). Por isso a base vence, e o `border`, o `border-radius` e o `background` do cartão não têm efeito.
- Conferido no CSS carregado em 127.0.0.1:5173, com seções de teste montadas temporariamente na página, usando `getComputedStyle`:
  - módulo que não é o último: `border-bottom: solid 1px`, `border-radius: 0`, fundo transparente, sem borda nas laterais nem em cima;
  - último módulo: sem linha (`.atividades-curso__lista-modulos > .conteudos-modulo:last-child`, ≈ linha 5628, vence a regra da ≈ linha 4510, de mesma especificidade);
  - cabeçalho: fundo próprio e `border-radius: 10px`. É ele que dá a aparência de cartão hoje.
- A regra de `border-style: dashed` citada no comentário das ≈ linhas 4499–4509 não existe mais para o módulo vazio. O teste com `conteudos-modulo--vazio` deu o mesmo resultado dos demais módulos.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Em `workspace.css`, logo depois de `.conteudos-modulo:has(...)` (≈ linha 5634), acrescentar:

   ```css
   .conteudos-modulo.conteudos-modulo--cartao {
     border-bottom: none;
   }
   ```

2. Remover as regras sem efeito das ≈ linhas 4489–4516 (`.conteudos-modulo--cartao`, o `:has` dela e as duas regras de `:last-child`), junto com os comentários delas. Nenhuma tem efeito na tela hoje.
3. Atualizar o comentário das ≈ linhas 4479–4488 e o das ≈ linhas 5642–5653, que dizem que a borda do cartão vive em `.conteudos-modulo--cartao`.

**Não mover** `.conteudos-modulo--cartao` para depois da base. Isso ativaria borda completa, raio e fundo nos cartões, e mudaria o visual aprovado das trilhas do aluno e do professor.

**Não alterar** a regra base `.conteudos-modulo`: as telas Módulos, Avaliações e Progresso dependem dela e têm regras próprias.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- Aluno, aba Conteúdos: sem linha embaixo dos módulos, em largura de celular (≈ 400px) e no desktop, com módulo fechado, aberto e bloqueado.
- Professor, aba Conteúdos, e a prévia "Visualizar como aluno": mesmo resultado, incluindo módulo vazio.
- Módulo aberto: a divisória entre o cabeçalho e o corpo continua (ela é o `border-bottom` do cabeçalho, não o da seção).
- Módulos, Avaliações e Progresso sem mudança visual.
- `npm run lint` e `npm test` sem erros novos.
