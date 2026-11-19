import NumeroModulo from "./NumeroModulo.jsx";

/* Coluna da esquerda do "roteiro da aula" (docs/TelaConteudosProfessor/
   PROMPT-agente-tela-modulo-roteiro.md, item 1): so a lista dos modulos do
   curso, sem os itens dentro (os itens ficam so no roteiro, ao lado).
   Reaproveitada identica pelo Professor e pelo Coordenador/Admin - cada tela
   monta seu proprio `resumosPorModuloId` (Map moduloId -> {totalItens,
   totalRascunhos}), ja que a fonte dos dados difere (conteudos/avaliacoes
   crus no Professor x revisaoConteudo so com o publicado no Coordenador).
   `totalRascunhos` null/undefined = nao mostrar a parte de rascunhos (caso
   do Coordenador/Admin, que nunca ve rascunho).

   Abaixo de 768px vira um <select> no topo (item 4) - os dois elementos
   convivem no DOM, cada um escondido pelo outro via CSS (mesma tecnica que
   outras trocas de layout puramente visuais nesta tela), sem duplicar
   logica de navegacao em JS. */
export default function ListaModulosRoteiro({ modulosOrdenados, moduloId, onIrParaModulo, resumosPorModuloId }) {
  function resumoTexto(modulo) {
    const resumo = resumosPorModuloId.get(modulo.id);
    if (!resumo || resumo.totalItens === 0) {
      return "vazio";
    }

    const itens = `${resumo.totalItens} ${resumo.totalItens === 1 ? "item" : "itens"}`;
    if (resumo.totalRascunhos == null) {
      return itens;
    }

    return resumo.totalRascunhos > 0 ? `${itens} · ${resumo.totalRascunhos} rascunho${resumo.totalRascunhos === 1 ? "" : "s"}` : itens;
  }

  return (
    <>
      <nav aria-label="Módulos" className="roteiro-tela__lista-modulos">
        {modulosOrdenados.map((modulo, indice) => (
          <button
            aria-current={modulo.id === moduloId ? "true" : undefined}
            className="roteiro-tela__item-lista-modulos"
            key={modulo.id}
            onClick={() => onIrParaModulo(modulo.id)}
            type="button"
          >
            <NumeroModulo indice={indice} />
            <span className="roteiro-tela__item-lista-modulos-texto">
              <span className="roteiro-tela__item-lista-modulos-titulo">{modulo.titulo}</span>
              <span className="roteiro-tela__item-lista-modulos-resumo">{resumoTexto(modulo)}</span>
            </span>
          </button>
        ))}
      </nav>

      <label className="roteiro-tela__seletor-modulos">
        <span className="visualmente-oculto">Módulo</span>
        <select
          onChange={(evento) => onIrParaModulo(Number(evento.target.value))}
          value={moduloId ?? ""}
        >
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
