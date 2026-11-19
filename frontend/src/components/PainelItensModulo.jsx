import { TbDiamond, TbListCheck } from "react-icons/tb";
import MenuAcoes from "./MenuAcoes.jsx";

/* Painel do modulo aberto (Professor/Coordenador/Admin), docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item 1
   - cabecalho (icone redondo + titulo + contagens + pilula "N itens") e
   linhas grandes (uma por conteudo/quiz, na ordem de hoje). Clicar na linha
   inteira abre JanelaPreviaItem.jsx (quem chama decide o que "abrir"
   significa, via `linha.onAbrir`) - este componente e so a casca visual +
   selecao em lote, igual RoteiroModulo.jsx fazia antes (que ele substitui,
   junto com MiniaturaPasso.jsx). Cada `linha` ja vem pronta de quem chama
   (TelaModuloGestaoProfessor.jsx/TelaModuloGestao.jsx), com o icone/selo/menu
   que cada perfil usa - mesmo padrao de renderFechado/renderAberto que
   RoteiroModulo usava, só que achatado num objeto (sem estado aberto/fechado
   aqui: quem abre e a janela, nao o proprio painel). */
export default function PainelItensModulo({
  barraSelecao,
  itensSelecionados,
  linhas,
  mensagemVazia,
  modoSelecao,
  moduloTitulo,
  moduloVazio,
  mostrarSelecionar,
  onEntrarSelecao,
  onSelecionarItem,
  resumoModulo,
  totalItens
}) {
  return (
    <div className="painel-itens-modulo">
      <header className="painel-itens-modulo__cabecalho">
        <div className="painel-itens-modulo__cabecalho-icone" aria-hidden="true">
          <TbDiamond size={22} />
        </div>
        <div className="painel-itens-modulo__cabecalho-texto">
          <h2 className="painel-itens-modulo__titulo">{moduloTitulo}</h2>
          <p className="painel-itens-modulo__resumo">{resumoModulo}</p>
        </div>
        <span className="painel-itens-modulo__pilula">{totalItens} {totalItens === 1 ? "item" : "itens"}</span>
        {mostrarSelecionar && !moduloVazio ? (
          <button className="painel-itens-modulo__selecionar" onClick={onEntrarSelecao} type="button">
            <TbListCheck aria-hidden="true" size={15} /> Selecionar
          </button>
        ) : null}
      </header>

      {barraSelecao}

      {moduloVazio ? (
        <div className="painel-itens-modulo__vazio">
          <p className="texto-vazio" role="status">
            {mensagemVazia}
          </p>
        </div>
      ) : (
        <ul className="painel-itens-modulo__lista">
          {linhas.map((linha) => {
            const selecionado = itensSelecionados?.has(linha.id);
            return (
              <li className="painel-itens-modulo__item" key={linha.id}>
                <div
                  aria-label={`Ver ${linha.tituloReal}`}
                  className="painel-itens-modulo__linha"
                  onClick={() => (modoSelecao ? onSelecionarItem(linha.id) : linha.onAbrir())}
                  onKeyDown={(evento) => {
                    if (evento.target !== evento.currentTarget || (evento.key !== "Enter" && evento.key !== " ")) {
                      return;
                    }
                    evento.preventDefault();
                    modoSelecao ? onSelecionarItem(linha.id) : linha.onAbrir();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {modoSelecao ? (
                    <span className="atividades-curso__checkbox-alvo" onClick={(evento) => evento.stopPropagation()}>
                      <input
                        aria-label={`Selecionar ${linha.tituloReal}`}
                        checked={Boolean(selecionado)}
                        className="tabela-checkbox"
                        onChange={() => onSelecionarItem(linha.id)}
                        type="checkbox"
                      />
                    </span>
                  ) : null}

                  <span className={`painel-itens-modulo__icone painel-itens-modulo__icone--${linha.corIcone}`} aria-hidden="true">
                    {linha.iconeTipo}
                  </span>

                  <div className="painel-itens-modulo__texto">
                    <strong className="painel-itens-modulo__item-titulo" title={linha.tituloReal}>
                      {linha.tituloExibicao}
                    </strong>
                    {linha.descricao ? <span className="painel-itens-modulo__item-descricao">{linha.descricao}</span> : null}
                    <span className="painel-itens-modulo__item-dados">{linha.dadosLinha}</span>
                  </div>

                  <div className="painel-itens-modulo__direita" onClick={(evento) => evento.stopPropagation()}>
                    <span className="insignia insignia--neutro painel-itens-modulo__selo-tipo">
                      {linha.seloTipo.icone} {linha.seloTipo.texto}
                    </span>
                    {linha.menuItens ? <MenuAcoes itens={linha.menuItens} rotulo={`Opções de ${linha.tituloReal}`} /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
