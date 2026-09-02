import BarraProgresso from "./BarraProgresso.jsx";
import Insignia from "./Insignia.jsx";
import { EmptyState } from "./Primitives.jsx";
import { getCourseCover } from "../data/courseCovers.js";

/* Grade de cards de curso do professor, ponto de entrada compartilhado por
   Conteudos, Avaliacoes e Progresso (cada uma monta seu proprio resumo por
   curso e so passa o texto/badge que faz sentido pra ela). Mesmo padrao
   visual (catalogo-card/catalogo-grade) da grade de cursos do aluno.
   `percentual` e opcional: quando informado, mostra a mesma barra de
   progresso (BarraProgresso) usada no card compacto de "Meus cursos"/
   Conteudos do aluno, no lugar do badge de texto. */
export default function GradeCursosProfessor({ cursos, mensagemVazia, onSelecionar }) {
  if (!cursos.length) {
    return <EmptyState message={mensagemVazia} />;
  }

  return (
    <ul aria-label="Cursos do professor" className="catalogo-grade" role="list">
      {cursos.map(({ badge, curso, percentual, resumo, rodapeEsquerda }) => (
        <li key={curso.id}>
          <button className="catalogo-card catalogo-card--acionavel" onClick={() => onSelecionar(curso.id)} type="button">
            <img alt="" className="catalogo-card__imagem" loading="lazy" src={getCourseCover(curso)} />
            <div className="catalogo-card__corpo">
              <strong className="catalogo-card__titulo">{curso.titulo}</strong>
              <p className="catalogo-card__data">{resumo}</p>
              {percentual !== undefined ? <BarraProgresso percentual={percentual} /> : null}
              <footer className="catalogo-card__rodape-aluno">
                <span className="catalogo-card__codigo">{rodapeEsquerda}</span>
                {badge ? <Insignia texto={badge} /> : null}
              </footer>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
