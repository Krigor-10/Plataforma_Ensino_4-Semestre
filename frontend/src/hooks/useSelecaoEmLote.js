import { useEffect, useMemo, useRef, useState } from "react";

/* Selecao multipla com checkbox de cabecalho (estado indeterminado) pra
   acoes em lote em tabelas paginadas - poda a selecao pros ids que ainda
   estao visiveis na pagina atual, o que cobre automaticamente troca de aba,
   busca e paginacao (ex.: um item que deixa de aparecer na aba Ativos depois
   de inativado) sem precisar de reset manual em cada handler. Extraido de
   SecaoProfessores.jsx pra ser reaproveitado em SecaoCoordenadores.jsx (ver
   docs/bugs/PROMPT-agente-selecao-em-lote-coordenadores.md). */
export function useSelecaoEmLote(itensPagina) {
  const [selecionados, setSelecionados] = useState(() => new Set());
  const refCheckboxCabecalho = useRef(null);

  const idsVisiveis = useMemo(() => new Set(itensPagina.map((item) => item.id)), [itensPagina]);
  const todosSelecionadosNaPagina = itensPagina.length > 0 && itensPagina.every((item) => selecionados.has(item.id));
  const algunsSelecionadosNaPagina = itensPagina.some((item) => selecionados.has(item.id));

  useEffect(() => {
    setSelecionados((atuais) => {
      const proximos = new Set([...atuais].filter((id) => idsVisiveis.has(id)));
      return proximos.size === atuais.size ? atuais : proximos;
    });
  }, [idsVisiveis]);

  useEffect(() => {
    if (refCheckboxCabecalho.current) {
      refCheckboxCabecalho.current.indeterminate = algunsSelecionadosNaPagina && !todosSelecionadosNaPagina;
    }
  }, [algunsSelecionadosNaPagina, todosSelecionadosNaPagina]);

  function alternarSelecao(id) {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);

      if (proximos.has(id)) {
        proximos.delete(id);
      } else {
        proximos.add(id);
      }

      return proximos;
    });
  }

  function alternarSelecaoPagina() {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);

      if (todosSelecionadosNaPagina) {
        itensPagina.forEach((item) => proximos.delete(item.id));
      } else {
        itensPagina.forEach((item) => proximos.add(item.id));
      }

      return proximos;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  return {
    selecionados,
    setSelecionados,
    refCheckboxCabecalho,
    todosSelecionadosNaPagina,
    algunsSelecionadosNaPagina,
    alternarSelecao,
    alternarSelecaoPagina,
    limparSelecao
  };
}
