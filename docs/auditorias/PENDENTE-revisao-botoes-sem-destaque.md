# PENDENTE — Revisão dos botões sem destaque no projeto todo (web)

> **Status:** melhoria futura, registrada a pedido do usuário em 2026-11-11. **Não iniciar sem pedido.** Quando for a hora, este arquivo vira o prompt para o agente de código, depois do inventário e das decisões do usuário.

## O que o usuário apontou

Na tela do curso (Admin/Coordenador), os botões "Editar curso", "Foto de capa", "Professores (N)" e "Coordenador" parecem apagados: quase sem cor, borda fraca e pouco efeito. Imagem: `botoes-sem-destaque-exemplo.png`, nesta pasta.

O pedido é revisar **o projeto todo** para achar os botões nesse estilo e corrigi-los.

## O que já se sabe (levantamento rápido, 2026-11-11)

- Os botões do exemplo são `<Botao variante="secundario" tamanho="pequeno">` (`pages/workspace/PainelCursoGestao.jsx` ≈ linhas 232–250).
- `.botao--secundario` (`styles/componentes.css` ≈ linha 104):
  - fundo `rgba(123,47,247,0.12)`, texto branco, borda `rgba(123,47,247,0.35)`;
  - no hover, o fundo vai para 0.22 e o botão sobe 1px.
  - No tema escuro, fica muito perto do fundo do card.
- Outras variantes com o mesmo risco: `.botao--fantasma` (fundo branco a 5%) e `<Botao>` **sem** `variante`. Neste último caso, a base `.botao` tem fundo transparente e borda transparente, então o botão vira só texto.
- Contagem bruta por busca de texto em `frontend/src/pages` e `components`, sem testes. É aproximada, porque `<Botao>` com props em várias linhas pode ser contado errado:

  | Tipo | Ocorrências |
  |---|---|
  | `variante="secundario"` | 25 |
  | `variante="fantasma"` | 23 |
  | `<Botao>` sem `variante` na mesma linha | 43 |
  | `<button className="botao …">` cru | 9 |

- Já existem exceções com cor própria, que **não** são o problema: "Adicionar Quiz" e "Gerar quiz com IA" (`.atividades-curso__adicionar--quiz/--ia`) e o botão roxo primário.

## O que fazer quando for retomado

1. **Inventário por tela e perfil:** onde está cada botão, qual a variante, qual o papel da ação (principal, secundária ou terciária) e um print, no tema escuro e no claro.
2. **Decisões com o usuário, com imagens:** a hierarquia de botões por tela e um ajuste das variantes `secundario` e `fantasma` (fundo, borda, hover e foco) que se destaque sem competir com o primário.
3. **Correção pela causa:** ajustar as variantes globais em `componentes.css` e os tokens dos dois temas, e corrigir os `<Botao>` sem `variante` que deveriam ter uma. Evitar CSS solto por tela.
4. **Verificação:** contraste AA de texto e borda, foco visível, tema claro, mobile, e nenhuma regressão nos botões com cor própria.

Mobile (React Native) e desktop ficam fora até o usuário decidir.
