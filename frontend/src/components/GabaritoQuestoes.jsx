import { TbCheck, TbX } from "react-icons/tb";

/* Extraido de PreviaTrilhaAluno.jsx (fluxo-coordenador Parte 3/3) pra ser
   reaproveitado tambem por RevisaoConteudoCurso.jsx (navegacao em indice) -
   mesmo gabarito, so mudou onde e renderizado. */
export default function GabaritoQuestoes({ questoes }) {
  return (
    <div className="revisao-avaliacao revisao-avaliacao--gabarito">
      {questoes.map((questao, indice) => (
        <section className="revisao-questao" key={questao.id}>
          <header className="revisao-questao__cabecalho">
            <span className="revisao-questao__numero">Questão {indice + 1}</span>
          </header>

          <p className="revisao-questao__enunciado">{questao.enunciado}</p>

          {questao.afirmativas?.length > 0 ? (
            <div className="revisao-questao__bloco">
              <p className="revisao-questao__rotulo">Afirmativas avaliadas</p>
              <ol className="revisao-afirmativas">
                {questao.afirmativas.map((afirmativa) => (
                  <li className="revisao-afirmativas__item" key={afirmativa.numero}>
                    <div className="revisao-afirmativas__cabecalho">
                      <strong>{afirmativa.numero}.</strong> {afirmativa.texto}
                      {afirmativa.ehCorreta ? (
                        <span className="revisao-afirmativas__marca revisao-afirmativas__marca--certo">
                          <TbCheck aria-hidden="true" size={13} /> Correta
                        </span>
                      ) : (
                        <span className="revisao-afirmativas__marca revisao-afirmativas__marca--errado">
                          <TbX aria-hidden="true" size={13} /> Incorreta
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {questao.alternativas?.length > 0 ? (
            <div className="revisao-questao__bloco">
              <p className="revisao-questao__rotulo">Alternativas</p>
              <ul className="revisao-alternativas" role="list">
                {questao.alternativas.map((alternativa) => (
                  <li
                    className={`revisao-alternativas__item${alternativa.ehCorreta ? " revisao-alternativas__item--correta" : ""}`}
                    key={alternativa.id}
                  >
                    <div className="revisao-alternativas__cabecalho">
                      <strong>{alternativa.letra}</strong> {alternativa.texto}
                      {alternativa.ehCorreta ? (
                        <span className="revisao-alternativas__marca revisao-alternativas__marca--certo">
                          <TbCheck aria-hidden="true" size={13} /> Correta
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {questao.explicacao ? (
            <div className="revisao-questao__bloco">
              <p className="revisao-questao__rotulo">Explicação</p>
              <p className="revisao-questao__explicacao">{questao.explicacao}</p>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
