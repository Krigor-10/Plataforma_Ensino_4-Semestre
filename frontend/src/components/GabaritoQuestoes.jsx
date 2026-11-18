import { TbCheck, TbX } from "react-icons/tb";
import { resolverUrlArquivo } from "../lib/api.js";

function encontrarLetraCorreta(questao) {
  const corretas = (questao.alternativas || []).filter((alternativa) => alternativa.ehCorreta);
  return corretas.length === 1 ? corretas[0].letra : null;
}

function formatarPontos(pontos) {
  const valor = Number(pontos || 0);
  const texto = valor % 1 === 0 ? String(valor) : valor.toFixed(1).replace(".", ",");
  return `${texto} ponto${valor === 1 ? "" : "s"}`;
}

function rotuloDificuldade(dificuldade) {
  const nivel = Number(dificuldade);
  if (nivel <= 2) {
    return "fácil";
  }
  return nivel === 3 ? "média" : "difícil";
}

function anexosImagem(questao) {
  return (questao.anexos || []).filter((anexo) => anexo.tipoAnexo === "Imagem");
}

function anexosArquivo(questao) {
  return (questao.anexos || []).filter((anexo) => anexo.tipoAnexo !== "Imagem");
}

/* Extraido de PreviaTrilhaAluno.jsx (fluxo-coordenador Parte 3/3) pra ser
   reaproveitado tambem pela previa de um item (PreviaItemAluno.jsx,
   docs/TelaConteudosProfessor/PROMPT-agente-fluxo-professor-igual-
   coordenador.md) e pela tela da avaliacao (TelaAvaliacaoGestao.jsx) - mesmo
   gabarito, so mudou onde e renderizado:
   - `compacto` (docs/fluxo-coordenador/PROMPT-agente-modulo-leitura-
     compacta.md): cabecalho "QUESTAO N" + pilula "Resposta: X", sem os
     rotulos "Alternativas"/"Explicacao" em cima. So usado hoje junto com
     `mostrarFicha` (tela da avaliacao, abaixo) - a previa de um item
     (PreviaItemAluno) e a previa do Professor continuam no formato padrao,
     igual ao que o aluno ve.
   - `mostrarFicha`/`numeroInicial` (docs/fluxo-coordenador/PROMPT-agente-
     avaliacao-tela-propria.md + ...-avaliacao-tela-limpa.md + ...-
     avaliacao-figura-layout.md) sao usados so pela tela da avaliacao, que
     renderiza uma questao de cada vez: pontos/dificuldade no cabecalho,
     contexto antes do enunciado (so o contexto - a citacao, se houver, vem
     do professor dentro do proprio texto; `referenciasBibliograficas` do
     banco de questoes vira um <details> recolhido no fim, pra nao repetir),
     anexo de arquivo na coluna do texto e anexo de imagem num bloco a parte
     (`.quiz-anexos--imagens`). Com imagem, o cabecalho + um
     `.revisao-questao__corpo-figura` com duas colunas (texto | figura) -
     ver workspace.css pra como o CSS poe as duas lado a lado (>= 900px) ou
     a figura logo depois do enunciado (abaixo disso), sem duplicar a figura
     no DOM. Sem imagem (ou sem mostrarFicha), nao tem corpo-figura nenhum -
     a marcacao fica igual a de antes dessa rodada. */
export default function GabaritoQuestoes({ compacto = false, mostrarFicha = false, numeroInicial = 0, questoes }) {
  return (
    <div className={`revisao-avaliacao revisao-avaliacao--gabarito${compacto ? " revisao-avaliacao--compacta" : ""}`}>
      {questoes.map((questao, indice) => {
        const letraCorreta = compacto ? encontrarLetraCorreta(questao) : null;
        const numeroQuestao = numeroInicial + indice + 1;
        const imagensQuestao = mostrarFicha ? anexosImagem(questao) : [];
        const arquivosQuestao = mostrarFicha ? anexosArquivo(questao) : [];
        const temFigura = imagensQuestao.length > 0;

        const conteudoTexto = (
          <>
            {mostrarFicha && questao.contexto ? (
              <div className="revisao-questao__contexto">
                <p>{questao.contexto}</p>
              </div>
            ) : null}

            <p className="revisao-questao__enunciado">{questao.enunciado}</p>

            {arquivosQuestao.length > 0 ? (
              <div className="quiz-anexos quiz-anexos--arquivos">
                {arquivosQuestao.map((anexo) => (
                  <a className="quiz-anexo-arquivo" href={resolverUrlArquivo(anexo.arquivoUrl)} key={anexo.id} rel="noreferrer" target="_blank">
                    {anexo.titulo}
                  </a>
                ))}
              </div>
            ) : null}

            {questao.afirmativas?.length > 0 ? (
              <div className="revisao-questao__bloco">
                {!compacto ? <p className="revisao-questao__rotulo">Afirmativas avaliadas</p> : null}
                <ol className="revisao-afirmativas" role="list">
                  {questao.afirmativas.map((afirmativa) => (
                    <li className="revisao-afirmativas__item" key={afirmativa.numero}>
                      <div className="revisao-afirmativas__cabecalho">
                        <span className="revisao-afirmativas__letra">{afirmativa.numero}.</span>
                        <span className="revisao-afirmativas__texto">{afirmativa.texto}</span>
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
                {!compacto ? <p className="revisao-questao__rotulo">Alternativas</p> : null}
                <ul className="revisao-alternativas" role="list">
                  {questao.alternativas.map((alternativa) => (
                    <li
                      className={`revisao-alternativas__item${alternativa.ehCorreta ? " revisao-alternativas__item--correta" : ""}`}
                      key={alternativa.id}
                    >
                      <div className="revisao-alternativas__cabecalho">
                        <span className="revisao-alternativas__letra">{alternativa.letra}</span>
                        <span className="revisao-alternativas__texto">{alternativa.texto}</span>
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
              compacto ? (
                <p className="revisao-questao__explicacao revisao-questao__explicacao--compacta">
                  <strong>Explicação:</strong> {questao.explicacao}
                </p>
              ) : (
                <div className="revisao-questao__bloco">
                  <p className="revisao-questao__rotulo">Explicação</p>
                  <p className="revisao-questao__explicacao">{questao.explicacao}</p>
                </div>
              )
            ) : null}
          </>
        );

        return (
          <section className="revisao-questao" key={questao.id}>
            <header className="revisao-questao__cabecalho">
              <span className="revisao-questao__numero">
                {compacto ? `QUESTÃO ${numeroQuestao}` : `Questão ${numeroQuestao}`}
                {mostrarFicha ? ` · ${formatarPontos(questao.pontos)} · ${rotuloDificuldade(questao.dificuldade)}` : ""}
              </span>
              {letraCorreta ? <span className="revisao-questao__resposta-pilula">Resposta: {letraCorreta}</span> : null}
            </header>

            {temFigura ? (
              <div className="revisao-questao__corpo-figura">
                <div className="revisao-questao__coluna-texto">{conteudoTexto}</div>
                <aside className="revisao-questao__coluna-figura">
                  <div className="quiz-anexos quiz-anexos--imagens">
                    {imagensQuestao.map((anexo) => (
                      <figure className="quiz-anexo-imagem" key={anexo.id}>
                        <a href={resolverUrlArquivo(anexo.arquivoUrl)} rel="noreferrer" target="_blank">
                          <img alt={anexo.titulo} src={resolverUrlArquivo(anexo.arquivoUrl)} />
                        </a>
                        <figcaption>Clique para ampliar</figcaption>
                      </figure>
                    ))}
                  </div>
                </aside>
              </div>
            ) : (
              conteudoTexto
            )}

            {mostrarFicha && questao.referenciasBibliograficas ? (
              <details className="revisao-questao__referencias">
                <summary>Referências bibliográficas</summary>
                <p>{questao.referenciasBibliograficas}</p>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
