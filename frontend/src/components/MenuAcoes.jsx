/* ============================================================
   MENU ACOES — menu de contexto "..." acessivel, reutilizavel.
   Reaproveita as classes .menu-contexto/.menu-contexto__lista/
   .menu-item--perigo ja existentes (SecaoModulos.jsx etc.), mas
   com navegacao por teclado completa: role="menu"/"menuitem",
   setas entre itens, Esc fecha, foco volta ao botao ao fechar,
   fecha ao clicar fora.

   A lista abre em portal (document.body), com posicao calculada a
   partir do botao - mesma tecnica de MenuKebabTabela.jsx (Coordenadores/
   Professores), adaptada pra cobrir tambem o gatilho com texto
   (`textoBotao`) e os itens com `divisor`. Sem isso, o menu ficava
   cortado por qualquer ancestral com overflow (cartao do modulo,
   rolagem da lista - pedido de ajuste da tela do modulo, ref.
   docs/TelaConteudosProfessor/modulo-compacto-exemplo.png). A classe
   .menu-contexto__lista continua
   com `position: absolute` por padrao (usada tambem fora deste
   componente, ex. PainelCursoGestao.jsx) - aqui ela ganha `position:
   fixed`/top/left via estilo inline, que tem prioridade sobre a classe.
   ============================================================ */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbChevronDown, TbDotsVertical } from "react-icons/tb";
import Botao from "./Botao.jsx";

const MARGEM_JANELA = 8;
const DESLOCAMENTO_BOTAO = 6;
const LARGURA_PADRAO_MENU = 175;

/**
 * Por padrao, botao so com o icone "..." (aria-label via `rotulo`). Passando
 * `textoBotao`, o gatilho vira um Botao com texto (reaproveita variante/tamanho
 * de Botao.jsx) em vez do icone - usado por "Adicionar" em
 * SecaoConteudosProfessor.jsx. `rotulo` continua opcional nesse caso (o texto
 * visivel ja serve de nome acessivel). Navegacao por teclado e o resto do
 * comportamento do menu nao mudam em nenhum dos dois casos.
 */
export default function MenuAcoes({ itens, rotulo, textoBotao, iconeBotao, classNameBotao, varianteBotao = "primario", tamanhoBotao = "pequeno" }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const refBotao = useRef(null);
  const refLista = useRef(null);

  const itensVisiveis = itens.filter((item) => !item.oculto);

  useLayoutEffect(() => {
    if (!aberto) {
      return;
    }

    const retanguloBotao = refBotao.current?.getBoundingClientRect();
    if (!retanguloBotao) {
      return;
    }

    const retanguloMenu = refLista.current?.getBoundingClientRect();
    const alturaMenu = retanguloMenu?.height || 0;
    const larguraMenu = retanguloMenu?.width || LARGURA_PADRAO_MENU;

    const cabeAbaixo = retanguloBotao.bottom + DESLOCAMENTO_BOTAO + alturaMenu <= window.innerHeight - MARGEM_JANELA;
    const top = cabeAbaixo
      ? retanguloBotao.bottom + DESLOCAMENTO_BOTAO
      : Math.max(MARGEM_JANELA, retanguloBotao.top - DESLOCAMENTO_BOTAO - alturaMenu);

    // Alinha a borda direita do menu com a do botao (igual o visual antigo
    // com `right: 0`), sem deixar vazar pra fora da janela.
    const left = Math.min(
      Math.max(retanguloBotao.right - larguraMenu, MARGEM_JANELA),
      window.innerWidth - larguraMenu - MARGEM_JANELA
    );

    setPosicao({ top, left });
    // Depende do numero de itens porque isso muda a altura do menu, o que
    // pode mudar se ele cabe embaixo ou nao.
  }, [aberto, itensVisiveis.length]);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    function fecharComEsc(event) {
      if (event.key !== "Escape") {
        return;
      }
      setAberto(false);
      refBotao.current?.focus();
    }

    function fecharAoClicarFora(event) {
      if (refLista.current?.contains(event.target) || refBotao.current?.contains(event.target)) {
        return;
      }
      setAberto(false);
    }

    // Fecha ao rolar (janela ou qualquer ancestral com overflow, ex. a lista
    // da tela do modulo) - o menu e fixed/portal, entao nao acompanharia a
    // rolagem sozinho e ficaria "flutuando" desalinhado do botao.
    function fecharAoRolarOuRedimensionar() {
      setAberto(false);
    }

    document.addEventListener("keydown", fecharComEsc);
    // Fase de captura (terceiro argumento true): o clique no botao de OUTRO
    // menu (ou nas acoes da linha) chama event.stopPropagation() na fase de
    // bolha, o que impede esse listener de rodar se ele tambem estiver na
    // bolha - o menu ja aberto nunca saberia que um clique aconteceu fora
    // dele. Na fase de captura, este listener roda ANTES do stopPropagation
    // do alvo, entao sempre recebe o clique.
    document.addEventListener("click", fecharAoClicarFora, true);
    window.addEventListener("scroll", fecharAoRolarOuRedimensionar, true);
    window.addEventListener("resize", fecharAoRolarOuRedimensionar);
    return () => {
      document.removeEventListener("keydown", fecharComEsc);
      document.removeEventListener("click", fecharAoClicarFora, true);
      window.removeEventListener("scroll", fecharAoRolarOuRedimensionar, true);
      window.removeEventListener("resize", fecharAoRolarOuRedimensionar);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      refLista.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    }
  }, [aberto]);

  function navegarComSeta(event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    const opcoes = Array.from(refLista.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || []);
    if (!opcoes.length) {
      return;
    }

    const indiceAtual = opcoes.indexOf(document.activeElement);
    const proximo =
      event.key === "ArrowDown"
        ? opcoes[(indiceAtual + 1) % opcoes.length]
        : opcoes[(indiceAtual - 1 + opcoes.length) % opcoes.length];
    proximo.focus();
  }

  function selecionar(item) {
    setAberto(false);
    refBotao.current?.focus();
    item.onSelecionar();
  }

  if (!itensVisiveis.length) {
    return null;
  }

  return (
    <div className="menu-contexto">
      {textoBotao ? (
        <Botao
          aria-expanded={aberto}
          aria-haspopup="menu"
          className={classNameBotao}
          onClick={(event) => {
            event.stopPropagation();
            setAberto((atual) => !atual);
          }}
          ref={refBotao}
          tamanho={tamanhoBotao}
          variante={varianteBotao}
        >
          {iconeBotao} {textoBotao} <TbChevronDown aria-hidden="true" className={`menu-contexto__seta${aberto ? " menu-contexto__seta--aberta" : ""}`} size={15} />
        </Botao>
      ) : (
        <button
          aria-expanded={aberto}
          aria-haspopup="menu"
          aria-label={rotulo}
          className="menu-contexto__botao"
          onClick={(event) => {
            event.stopPropagation();
            setAberto((atual) => !atual);
          }}
          ref={refBotao}
          type="button"
        >
          <TbDotsVertical aria-hidden="true" size={18} />
        </button>
      )}
      {aberto
        ? createPortal(
            <ul
              className="menu-contexto__lista"
              onKeyDown={navegarComSeta}
              ref={refLista}
              role="menu"
              style={{
                position: "fixed",
                right: "auto",
                top: posicao?.top ?? 0,
                left: posicao?.left ?? 0,
                visibility: posicao ? "visible" : "hidden"
              }}
            >
              {itensVisiveis.map((item) =>
                item.divisor ? (
                  <li aria-hidden="true" className="menu-contexto__divisor" key={item.chave} role="separator" />
                ) : (
                  <li key={item.chave} role="none">
                    <button
                      className={item.perigo ? "menu-item--perigo" : undefined}
                      disabled={item.desabilitado}
                      onClick={(event) => {
                        event.stopPropagation();
                        selecionar(item);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      {item.rotulo}
                    </button>
                  </li>
                )
              )}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
}
