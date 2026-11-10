/* ============================================================
   MENU KEBAB TABELA — menu de contexto "..." para linhas de tabela
   (Coordenadores, Professores). Reaproveita as classes .kebab-btn/
   .kebab-menu/.kebab-menu__item ja existentes, mas centraliza a
   logica que antes estava duplicada em cada tela: portal fixo no
   body, reposicionamento pra cima quando nao cabe embaixo, fecha ao
   rolar/redimensionar, e acessibilidade completa de menu (role,
   setas, foco).
   ============================================================ */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbDotsVertical } from "react-icons/tb";

const MARGEM_JANELA = 8;
const DESLOCAMENTO_BOTAO = 6;
const LARGURA_PADRAO_MENU = 168;

export default function MenuKebabTabela({ itens, rotulo }) {
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

    const left = Math.min(
      Math.max(retanguloBotao.right - larguraMenu, MARGEM_JANELA),
      window.innerWidth - larguraMenu - MARGEM_JANELA
    );

    setPosicao({ top, left });
    // Depende do numero de itens porque isso muda a altura do menu (ex.: menu
    // sem a opcao Excluir), o que pode mudar se ele cabe embaixo ou nao.
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

    function fecharAoClicarFora(event) {
      if (refLista.current?.contains(event.target) || refBotao.current?.contains(event.target)) {
        return;
      }
      setAberto(false);
    }

    function fecharAoRolarOuRedimensionar() {
      setAberto(false);
    }

    document.addEventListener("keydown", fecharComEsc);
    document.addEventListener("keydown", navegarComSeta);
    // Fase de captura (terceiro argumento true): o clique no botao de OUTRO
    // kebab (ou nas acoes da linha) chama event.stopPropagation() na fase de
    // bolha, o que impediria este listener de rodar se ele tambem estivesse
    // na bolha - o menu ja aberto nunca saberia que o clique aconteceu fora
    // dele. Na fase de captura, este listener roda ANTES do stopPropagation
    // do alvo, entao sempre recebe o clique.
    document.addEventListener("click", fecharAoClicarFora, true);
    // Mesma logica pro scroll: capture:true pega a rolagem de QUALQUER
    // contêiner (ex. o wrapper com overflow da tabela), nao so da janela -
    // eventos de scroll nao sobem na fase de bolha, mas a fase de captura
    // passa por todos os ancestrais ate o alvo.
    window.addEventListener("scroll", fecharAoRolarOuRedimensionar, true);
    window.addEventListener("resize", fecharAoRolarOuRedimensionar);
    return () => {
      document.removeEventListener("keydown", fecharComEsc);
      document.removeEventListener("keydown", navegarComSeta);
      document.removeEventListener("click", fecharAoClicarFora, true);
      window.removeEventListener("scroll", fecharAoRolarOuRedimensionar, true);
      window.removeEventListener("resize", fecharAoRolarOuRedimensionar);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      // preventScroll: sem isso, focar o item fora da area visivel rola a
      // pagina pra trazer o item a vista, o que pode disparar o proprio
      // fechamento ao rolar que acabamos de registrar acima.
      refLista.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    }
  }, [aberto]);

  function selecionar(item) {
    setAberto(false);
    refBotao.current?.focus();
    item.onSelecionar();
  }

  if (!itensVisiveis.length) {
    return null;
  }

  return (
    <>
      <button
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={rotulo}
        className="kebab-btn"
        onClick={(event) => {
          event.stopPropagation();
          setAberto((atual) => !atual);
        }}
        ref={refBotao}
        type="button"
      >
        <TbDotsVertical aria-hidden="true" size={16} />
      </button>
      {aberto
        ? createPortal(
            <div
              className="kebab-menu"
              ref={refLista}
              role="menu"
              style={{
                top: posicao?.top ?? 0,
                left: posicao?.left ?? 0,
                visibility: posicao ? "visible" : "hidden"
              }}
            >
              {itensVisiveis.map((item) => (
                <button
                  className={item.perigo ? "kebab-menu__item kebab-menu__item--perigo" : "kebab-menu__item"}
                  disabled={item.desabilitado}
                  key={item.chave}
                  onClick={(event) => {
                    event.stopPropagation();
                    selecionar(item);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {item.rotulo}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
