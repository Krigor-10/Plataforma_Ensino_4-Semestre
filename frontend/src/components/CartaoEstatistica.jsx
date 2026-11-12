/* onClick opcional - quando informado o cartao vira <button> (plano
   fluxo-venda-cursos, Round 6: "N cursos encerrados aguardando voce" no
   Dashboard do Admin precisa ser clicavel, o que nenhum outro uso deste
   componente precisava antes). Sem onClick, continua exatamente o
   <article> nao-interativo de sempre - nenhum dos outros usos muda. */
export default function CartaoEstatistica({ corBorda, icone, onClick, rotulo, valor }) {
  const estiloBorda = corBorda ? { borderTopColor: corBorda } : {};
  const conteudo = (
    <>
      <span className="cartao-estatistica__icone" aria-hidden="true">{icone}</span>
      <div className="cartao-estatistica__texto">
        <strong className="cartao-estatistica__valor" title={String(valor)}>{valor}</strong>
        <p className="cartao-estatistica__rotulo">{rotulo}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button aria-label={`${rotulo}: ${valor}`} className="cartao-estatistica cartao-estatistica--acionavel" onClick={onClick} style={estiloBorda} type="button">
        {conteudo}
      </button>
    );
  }

  return (
    <article className="cartao-estatistica" style={estiloBorda} aria-label={`${rotulo}: ${valor}`}>
      {conteudo}
    </article>
  );
}
