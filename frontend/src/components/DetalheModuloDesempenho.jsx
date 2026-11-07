import {
  TbExternalLink,
  TbFile,
  TbFileText,
  TbPhoto,
  TbPlayerPlay,
  TbTrophy
} from "react-icons/tb";
import Insignia from "./Insignia.jsx";
import { formatGrade, formatPercent, normalizeContentType, normalizePublicationStatus, normalizeTipoAvaliacao } from "../lib/format.js";

const ICONE_TIPO_MATERIAL = {
  1: <TbFileText aria-hidden="true" size="1.75rem" />,
  2: <TbFile aria-hidden="true" size="1.75rem" />,
  3: <TbPlayerPlay aria-hidden="true" size="1.75rem" />,
  4: <TbExternalLink aria-hidden="true" size="1.75rem" />,
  5: <TbPhoto aria-hidden="true" size="1.75rem" />
};

/* Detalhe de um MODULO aberto (Progresso/Conclusao/Desempenho medio +
   materiais/avaliacoes), extraido de PainelModulosDesempenho pra ser
   reaproveitado tambem pela tela unica do Coordenador (PainelCursoCoordenador)
   - cada chamador cuida do proprio accordion/toggle, este componente so
   renderiza o CONTEUDO de dentro. `contextoCoordenador` oculta tipo de
   arquivo/status de publicacao (info de gestao, ver PainelModulosDesempenho).
   `separarGrupos` (so a tela do Coordenador usa) quebra a lista unica em duas,
   com os titulos "Conteudos"/"Quiz" (rodada 2, item 5 - so quiz nao arquivado
   chega aqui, filtrado pelo chamador antes de passar `modulo.avaliacoes`) -
   a tela do Professor continua com a lista combinada de sempre. */
export default function DetalheModuloDesempenho({ contextoCoordenador = false, modulo, separarGrupos = false }) {
  const semItens = modulo.materiais.length === 0 && modulo.avaliacoes.length === 0;

  const itensMateriais = modulo.materiais.map((material) => (
    <li className="atividades-curso__item" key={`material-${material.conteudoDidaticoId}`}>
      <div className="atividades-curso__linha">
        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--conteudo">
          {ICONE_TIPO_MATERIAL[Number(material.tipoConteudo)] || <TbFileText aria-hidden="true" size="1.75rem" />}
        </span>
        <div className="atividades-curso__corpo">
          <strong className="atividades-curso__item-titulo">{material.titulo}</strong>
          {contextoCoordenador ? null : (
            <p className="atividades-curso__meta">
              <span>{normalizeContentType(material.tipoConteudo)}</span>
              <span aria-hidden="true" className="atividades-curso__separador">·</span>
              <Insignia texto={normalizePublicationStatus(material.statusPublicacao)} />
            </p>
          )}
        </div>
        <div className="atividades-curso__metrica">
          {contextoCoordenador
            ? `${material.alunosConcluiram || 0} aluno${material.alunosConcluiram === 1 ? "" : "s"} concluiram · ${formatPercent(material.percentualConclusao)}`
            : `${formatPercent(material.percentualConclusao)} concluido`}
        </div>
      </div>
    </li>
  ));

  const itensAvaliacoes = modulo.avaliacoes.map((avaliacao) => (
    <li className="atividades-curso__item atividades-curso__item--quiz" key={`avaliacao-${avaliacao.avaliacaoId}`}>
      <div className="atividades-curso__linha">
        <span aria-hidden="true" className="atividades-curso__icone atividades-curso__icone--quiz">
          <TbTrophy aria-hidden="true" size="1.75rem" />
        </span>
        <div className="atividades-curso__corpo">
          <strong className="atividades-curso__item-titulo">{avaliacao.titulo}</strong>
          <p className="atividades-curso__meta">
            <span>{normalizeTipoAvaliacao(avaliacao.tipoAvaliacao)}</span>
            {contextoCoordenador ? null : (
              <>
                <span aria-hidden="true" className="atividades-curso__separador">·</span>
                <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
              </>
            )}
          </p>
        </div>
        <div className="atividades-curso__metrica">
          {avaliacao.totalParticipantes} participante{avaliacao.totalParticipantes === 1 ? "" : "s"} · Media {formatGrade(avaliacao.mediaNota)}
        </div>
      </div>
    </li>
  ));

  return (
    <>
      <dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">
        <div className="lista-detalhes__item">
          <dt>Progresso</dt>
          <dd>{formatPercent(modulo.progressoMedio)}</dd>
        </div>
        <div className="lista-detalhes__item">
          <dt>Conclusao</dt>
          <dd>{formatPercent(modulo.percentualConclusao)}</dd>
        </div>
        <div className="lista-detalhes__item">
          <dt>Desempenho medio</dt>
          <dd>{formatGrade(modulo.desempenhoMedio)}</dd>
        </div>
      </dl>

      {semItens ? (
        <p className="texto-vazio" role="status">Nenhum material ou avaliacao cadastrado neste modulo ainda.</p>
      ) : separarGrupos ? (
        <>
          {itensMateriais.length > 0 ? (
            <>
              <p className="atividades-curso__meta conteudos-modulo__descricao">Conteudos</p>
              <ul aria-label={`Conteudos de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
                {itensMateriais}
              </ul>
            </>
          ) : null}
          {itensAvaliacoes.length > 0 ? (
            <>
              <p className="atividades-curso__meta conteudos-modulo__descricao">Quiz</p>
              <ul aria-label={`Quiz de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
                {itensAvaliacoes}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <ul aria-label={`Materiais e avaliacoes de ${modulo.titulo}`} className="atividades-curso__lista" role="list">
          {itensMateriais}
          {itensAvaliacoes}
        </ul>
      )}
    </>
  );
}
