import { TbCreditCard } from "react-icons/tb";
import { MdPersonAdd } from "react-icons/md";
import Botao from "./Botao.jsx";
import { getCourseCover } from "../data/courseCovers.js";
import { resolverImagemCurso } from "../lib/courseImage.js";
import { formatMoney } from "../lib/format.js";

/* Extraido do JSX inline de PublicHome.jsx (plano fluxo-venda-cursos, Round
   6) pra ser reaproveitado tambem na previa em tempo real do
   ModalPrepararVenda.jsx (Admin digitando preco/descricao). onAbrirDetalhe/
   onComprar sao opcionais - quando omitidos o cartao fica so visual (previa),
   sem nenhuma acao clicavel, o que e exatamente o que a previa precisa. */
export default function CartaoCursoPublico({ curso, onAbrirDetalhe, onComprar }) {
  return (
    <article className="cartao-curso">
      <button
        aria-labelledby={`curso-titulo-${curso.id}`}
        className="cartao-curso__acionador"
        disabled={!onAbrirDetalhe}
        onClick={onAbrirDetalhe ? () => onAbrirDetalhe(curso) : undefined}
        type="button"
      >
        <div aria-hidden="true" className="cartao-curso__topo">
          <img
            alt=""
            aria-hidden="true"
            className="cartao-curso__imagem"
            loading="lazy"
            src={resolverImagemCurso(curso)}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getCourseCover(curso);
            }}
          />
        </div>

        <div className="cartao-curso__corpo">
          <h3 className="cartao-curso__titulo" id={`curso-titulo-${curso.id}`}>
            {curso.titulo}
          </h3>
          <p className="cartao-curso__descricao">{curso.descricao}</p>
        </div>
      </button>

      <footer className="cartao-curso__rodape">
        <strong className="cartao-curso__preco">{curso.ehGratuito ? "Grátis" : formatMoney(curso.preco)}</strong>
        <Botao
          aria-label={curso.ehGratuito ? `Começar grátis em ${curso.titulo}` : `Comprar ${curso.titulo}`}
          className="linha-icone-texto"
          disabled={!onComprar}
          onClick={onComprar ? () => onComprar(curso) : undefined}
          tamanho="pequeno"
          variante="primario"
        >
          {curso.ehGratuito ? (
            <>
              <MdPersonAdd aria-hidden="true" size={18} /> Começar grátis
            </>
          ) : (
            <>
              <TbCreditCard aria-hidden="true" size={18} /> Comprar · {formatMoney(curso.preco)}
            </>
          )}
        </Botao>
      </footer>
    </article>
  );
}
