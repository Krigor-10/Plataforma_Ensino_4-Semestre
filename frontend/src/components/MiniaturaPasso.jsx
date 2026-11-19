import { TbTrophy } from "react-icons/tb";
import { obterIconeTipoConteudo, obterLinkArquivoConteudo } from "./PreviaTrilhaAluno.jsx";

const TIPO_CONTEUDO_IMAGEM = 5;

/* Miniatura do bloco FECHADO do roteiro da aula (docs/TelaConteudosProfessor/
   PROMPT-agente-tela-modulo-roteiro.md, item 1): imagem de verdade quando o
   conteudo e do tipo imagem, senao um quadrado com o icone do tipo (PDF,
   video, link, texto, quiz) - nunca a pagina do PDF (pesaria renderizar uma
   por bloco fechado da lista toda). Reaproveitada pelo Professor e pelo
   Coordenador/Admin, que montam o mesmo "item" (material ou quiz). */
export default function MiniaturaPasso({ item }) {
  if (item.tipo === "quiz") {
    return (
      <span aria-hidden="true" className="roteiro-passo__miniatura roteiro-passo__miniatura--icone">
        <TbTrophy aria-hidden="true" size="1.6rem" />
      </span>
    );
  }

  const tipoConteudo = Number(item.conteudo.tipoConteudo);
  const linkArquivo = tipoConteudo === TIPO_CONTEUDO_IMAGEM ? obterLinkArquivoConteudo(item.conteudo) : null;

  if (linkArquivo) {
    return (
      <span className="roteiro-passo__miniatura roteiro-passo__miniatura--imagem">
        <img alt="" src={linkArquivo} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="roteiro-passo__miniatura roteiro-passo__miniatura--icone">
      {obterIconeTipoConteudo(tipoConteudo, "1.6rem")}
    </span>
  );
}
