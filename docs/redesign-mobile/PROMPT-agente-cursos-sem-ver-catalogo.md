# Prompt: app mobile — aba Cursos: remover o botão "Ver catálogo" (correção pequena)

## Pedido do usuário (2026-11-25, print da aba Cursos com a grade de cursos do aluno)

"Remover VER CATÁLOGO dessa tela."

O catálogo continua acessível por dois caminhos:
- o **menu lateral** (☰ › Catálogo);
- o banner **"Explorar catálogo"** no fim da Início.

## Onde está (verificado)

- `mobile/src/screens/aluno/ConteudosScreen.jsx`, na parte sem curso selecionado (≈ linhas 450–464): a `View` `estilos.cabecalhoGrade` contém só o botão "Ver catálogo" (`compass-outline` + texto, `navigation.navigate(ROUTES.CATALOGO)`).
- Estilos `cabecalhoGrade` (≈ linha 951), `botaoCatalogo` e `botaoCatalogoTexto`.
- `screens/aluno/__tests__/ConteudosScreen.test.jsx` ≈ linhas 70 e 113: usa `findByLabelText("Ver catálogo")` como sinal de que a grade carregou.

## Tarefa

1. **Remover** a `View` `cabecalhoGrade` inteira com o botão "Ver catálogo".
   - A grade de cursos sobe para logo abaixo do breadcrumb "CURSOS", com o mesmo respiro superior das outras abas (`espacamentos.lg`).
   - O `Toast` de mensagem continua onde está.
2. **Remover** os estilos `cabecalhoGrade`, `botaoCatalogo` e `botaoCatalogoTexto`, e os imports (`ROUTES.CATALOGO` e ícones) que ficarem sem uso nesta tela.
3. **Testes:**
   - trocar `findByLabelText("Ver catálogo")` por um sinal da grade, como o título de um curso do snapshot de teste (`findByText(...)`);
   - acrescentar `expect(screen.queryByLabelText("Ver catálogo")).toBeNull()`.

**Não alterar:**
- os cartões da grade;
- o estado vazio ("Quando uma matrícula for aprovada…");
- a trilha do curso;
- o menu lateral e o banner da Início.

## Critérios de aceite

- **Grade:** na aba Cursos, os cartões começam logo abaixo de "CURSOS", sem o botão "Ver catálogo".
- **Catálogo:** continua abrindo pelo menu lateral e pelo banner "Explorar catálogo" da Início.
- `npm test` (mobile) sem falhas.
