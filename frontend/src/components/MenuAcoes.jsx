/* ============================================================
   MENU ACOES — menu de contexto "..." acessivel, reutilizavel.
   Reaproveita as classes .menu-contexto/.menu-contexto__lista/
   .menu-item--perigo ja existentes (SecaoModulos.jsx etc.), mas
   com navegacao por teclado completa: role="menu"/"menuitem",
   setas entre itens, Esc fecha, foco volta ao botao ao fechar,
   fecha ao clicar fora.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { TbChevronDown, TbDotsVertical } from "react-icons/tb";
import Botao from "./Botao.jsx";

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
  const refBotao = useRef(null);
  const refLista = useRef(null);

  const itensVisiveis = itens.filter((item) => !item.oculto);

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

    document.addEventListener("keydown", fecharComEsc);
    // Fase de captura (terceiro argumento true): o clique no botao de OUTRO
    // menu (ou nas acoes da linha) chama event.stopPropagation() na fase de
    // bolha, o que impede esse listener de rodar se ele tambem estiver na
    // bolha - o menu ja aberto nunca saberia que um clique aconteceu fora
    // dele. Na fase de captura, este listener roda ANTES do stopPropagation
    // do alvo, entao sempre recebe o clique.
    document.addEventListener("click", fecharAoClicarFora, true);
    return () => {
      document.removeEventListener("keydown", fecharComEsc);
      document.removeEventListener("click", fecharAoClicarFora, true);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      // preventScroll: sem isso, focar um item fora da area visivel de um
      // ancestral com overflow:hidden (ex.: o corpo do modulo ainda recortado
      // durante/logo apos a animacao de abertura) faz o navegador rolar esse
      // ancestral pra trazer o item focado a vista - o conteudo "pula"
      // visualmente, cortando o proprio menu.
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
      {aberto ? (
        <ul className="menu-contexto__lista" onKeyDown={navegarComSeta} ref={refLista} role="menu">
          {itensVisiveis.map((item) => (
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
          ))}
        </ul>
      ) : null}
    </div>
  );
}
