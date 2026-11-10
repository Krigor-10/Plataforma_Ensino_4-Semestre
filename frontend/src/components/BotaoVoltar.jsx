import { TbArrowLeft } from "react-icons/tb";

/* Botao "Voltar para X" no topo das telas de detalhe (Conteudos, Avaliacoes,
 * Progresso, Cursos, Modulos...). Componente unico (prompt "botao voltar
 * margem esquerda", 09/11) - antes cada tela montava o mesmo nav+botao do
 * seu jeito. Em telas largas, o CSS (.atividades-curso__navegacao, via
 * @container em workspace.css) tira o botao do fluxo e o leva pra margem
 * esquerda da coluna, alinhado ao titulo, mostrando so "Voltar" - o nome
 * completo some visualmente mas continua acessivel via aria-label/title.
 */
export default function BotaoVoltar({ destino, onClick }) {
  const rotulo = `Voltar para ${destino}`;

  return (
    <nav aria-label={`Navegação de ${destino}`} className="atividades-curso__navegacao">
      <button
        aria-label={rotulo}
        className="atividades-curso__voltar"
        onClick={onClick}
        title={rotulo}
        type="button"
      >
        <TbArrowLeft aria-hidden="true" size={22} />
        <span aria-hidden="true" className="atividades-curso__voltar-texto">{rotulo}</span>
        <span aria-hidden="true" className="atividades-curso__voltar-texto-curto">Voltar</span>
      </button>
    </nav>
  );
}
