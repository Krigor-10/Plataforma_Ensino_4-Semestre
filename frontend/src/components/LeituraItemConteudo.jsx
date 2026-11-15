import GabaritoQuestoes from "./GabaritoQuestoes.jsx";
import Insignia from "./Insignia.jsx";
import { obterLinkArquivoConteudo } from "./PreviaTrilhaAluno.jsx";
import { normalizeContentType } from "../lib/format.js";

const TIPO_CONTEUDO_LINK = 4;

function LeituraMaterial({ conteudo }) {
  const linkArquivo = obterLinkArquivoConteudo(conteudo);
  const rotuloLink = Number(conteudo.tipoConteudo) === TIPO_CONTEUDO_LINK ? "Abrir link" : "Abrir arquivo";

  return (
    <div className="leitura-item__material">
      <p className="leitura-item__material-tipo">{normalizeContentType(conteudo.tipoConteudo)}</p>
      {conteudo.descricao ? <p className="leitura-item__material-descricao">{conteudo.descricao}</p> : null}
      {linkArquivo ? (
        <a className="leitura-item__abrir-arquivo" href={linkArquivo} rel="noreferrer" target="_blank">
          {rotuloLink}
        </a>
      ) : null}
    </div>
  );
}

function LeituraQuiz({ questoes, totalQuestoes }) {
  return (
    <div className="leitura-item__quiz">
      <p className="leitura-item__quiz-contagem">
        {totalQuestoes} {totalQuestoes === 1 ? "questão" : "questões"}
      </p>
      {questoes && questoes.length > 0 ? <GabaritoQuestoes questoes={questoes} /> : null}
    </div>
  );
}

/* Leitura, so leitura, de um material ou quiz - extraido de
   RevisaoConteudoCurso.jsx (RevisaoMaterial/RevisaoQuiz) pra ser reaproveitado
   pelo painel lateral da tela do modulo (TelaModuloGestao.jsx), que substituiu
   a janela "Revisar conteudo" (docs/fluxo-coordenador/PROMPT-agente-modulo-
   tela-propria.md). `item` segue o mesmo formato de entrada usado la: { tipo:
   "material"|"quiz", titulo, conteudo?, quiz? }. */
export default function LeituraItemConteudo({ item, moduloIndice, moduloTitulo, questoes }) {
  return (
    <div className="leitura-item">
      <p className="leitura-item__trilha">
        Módulo {String(moduloIndice + 1).padStart(2, "0")} › {moduloTitulo} › {item.tipo === "quiz" ? "Quiz" : "Material"}
      </p>

      <div className="leitura-item__cabecalho">
        <h3 className="leitura-item__titulo">{item.titulo}</h3>
        <Insignia texto="Somente leitura" variante="info" />
      </div>

      {item.tipo === "material" ? (
        <LeituraMaterial conteudo={item.conteudo} />
      ) : (
        <LeituraQuiz questoes={questoes} totalQuestoes={item.quiz.totalQuestoes || 0} />
      )}
    </div>
  );
}
