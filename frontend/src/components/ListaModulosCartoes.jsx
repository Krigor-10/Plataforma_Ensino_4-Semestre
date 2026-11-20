import { TbChevronDown } from "react-icons/tb";
import NumeroModulo from "./NumeroModulo.jsx";

/* Coluna da esquerda da tela do modulo (Professor/Coordenador/Admin) - docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item 1:
   cada modulo do curso vira um cartao (numero grande, titulo ate 2 linhas,
   "N itens · N rascunhos" e uma seta) - o atual fica com o numero/fundo/
   barra roxos. Substitui ListaModulosRoteiro.jsx (lista simples de texto da
   versao "roteiro da aula"). Reaproveitada identica pelo Professor e pelo
   Coordenador/Admin - cada tela monta seu proprio `resumosPorModuloId` (Map
   moduloId -> {totalItens, totalRascunhos}), ja que a fonte dos dados difere
   (conteudos/avaliacoes crus no Professor x revisaoConteudo so com o
   publicado no Coordenador). `totalRascunhos` null/undefined = nao mostrar a
   parte de rascunhos (caso do Coordenador/Admin, que nunca ve rascunho).

   Abaixo de 768px vira um <select> no topo - os dois elementos convivem no
   DOM, cada um escondido pelo outro via CSS (mesma tecnica que outras trocas
   de layout puramente visuais nesta tela), sem duplicar logica de navegacao
   em JS. */
export default function ListaModulosCartoes({ modulosOrdenados, moduloId, onIrParaModulo, resumosPorModuloId }) {
  function resumoTexto(modulo) {
    const resumo = resumosPorModuloId.get(modulo.id);
    if (!resumo || resumo.totalItens === 0) {
      return "0 itens";
    }

    const itens = `${resumo.totalItens} ${resumo.totalItens === 1 ? "item" : "itens"}`;
    if (resumo.totalRascunhos == null) {
      return itens;
    }

    return resumo.totalRascunhos > 0 ? `${itens} · ${resumo.totalRascunhos} rascunho${resumo.totalRascunhos === 1 ? "" : "s"}` : itens;
  }

  return (
    <>
      <nav aria-label="Módulos" className="lista-modulos-cartoes">
        {modulosOrdenados.map((modulo, indice) => (
          <button
            aria-current={modulo.id === moduloId ? "true" : undefined}
            className="lista-modulos-cartoes__item"
            key={modulo.id}
            onClick={() => onIrParaModulo(modulo.id)}
            type="button"
          >
            <NumeroModulo indice={indice} />
            <span className="lista-modulos-cartoes__texto">
              <span className="lista-modulos-cartoes__titulo" title={modulo.titulo}>{modulo.titulo}</span>
              <span className="lista-modulos-cartoes__resumo">{resumoTexto(modulo)}</span>
            </span>
            <TbChevronDown aria-hidden="true" className="lista-modulos-cartoes__seta" size={16} />
          </button>
        ))}
      </nav>

      <label className="lista-modulos-cartoes__seletor">
        <span className="visualmente-oculto">Módulo</span>
        <select onChange={(evento) => onIrParaModulo(Number(evento.target.value))} value={moduloId ?? ""}>
          {modulosOrdenados.map((modulo, indice) => (
            <option key={modulo.id} value={modulo.id}>
              {String(indice + 1).padStart(2, "0")} · {modulo.titulo}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
