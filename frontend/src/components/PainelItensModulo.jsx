import { TbListCheck, TbLock } from "react-icons/tb";
import MenuAcoes from "./MenuAcoes.jsx";
import NumeroModulo from "./NumeroModulo.jsx";

/* Painel do modulo aberto (Professor/Coordenador/Admin), docs/
   TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md, item 1
   + PROMPT-agente-tela-modulo-hierarquia-curso-kpis.md, item 3 - cabecalho
   discreto (quadradinho com o numero do modulo + rotulo "Módulo NN" em cima
   do titulo, que fica menor que o cartao do curso acima) e linhas grandes
   (uma por conteudo/quiz, na ordem de hoje). Clicar na linha inteira abre
   JanelaPreviaItem.jsx (quem chama decide o que "abrir" significa, via
   `linha.onAbrir`) - este componente e so a casca visual + selecao em lote,
   igual RoteiroModulo.jsx fazia antes (que ele substitui, junto com
   MiniaturaPasso.jsx). Cada `linha` ja vem pronta de quem chama
   (TelaModuloGestaoProfessor.jsx/TelaModuloGestao.jsx), com o icone/selo/menu
   que cada perfil usa - mesmo padrao de renderFechado/renderAberto que
   RoteiroModulo usava, só que achatado num objeto (sem estado aberto/fechado
   aqui: quem abre e a janela, nao o proprio painel).

   Reaproveitado tambem pelo Aluno (docs/TelaConteudosAlunos/PROMPT-agente-
   trilha-aluno-modulo-em-tela-propria.md), que usa 3 campos opcionais por
   `linha` que Professor/Coordenador nunca preenchem: `bloqueado` (cadeado,
   opacidade reduzida, linha inerte - bloqueio por ordem, igual o acordeao
   de antes fazia), `acao` (um no React no lugar do menu ⋮ - o botao "Iniciar
   quiz"/"Continuar"/"Ver revisao" do quiz) e `destaque` (realce temporario
   na linha, usado pelo botao "Continuar: {proximo item}" do cartao do
   curso ao levar o aluno direto pro quiz em questao). */
export default function PainelItensModulo({
  barraSelecao,
  itensSelecionados,
  linhas,
  mensagemVazia,
  modoSelecao,
  moduloIndice,
  moduloTitulo,
  moduloVazio,
  mostrarSelecionar,
  onEntrarSelecao,
  onSelecionarItem,
  resumoModulo,
  totalItens,
  totalRascunhosModulo
}) {
  return (
    <div className="painel-itens-modulo">
      <header className="painel-itens-modulo__cabecalho">
        <NumeroModulo indice={moduloIndice} />
        <div className="painel-itens-modulo__cabecalho-texto">
          <span className="painel-itens-modulo__rotulo-modulo">Módulo {String(moduloIndice + 1).padStart(2, "0")}</span>
          <h2 className="painel-itens-modulo__titulo">
            {moduloTitulo}
            <span className="painel-itens-modulo__resumo-inline"> · {resumoModulo}</span>
            {totalRascunhosModulo > 0 ? (
              <span className="painel-itens-modulo__rascunhos-inline"> · {totalRascunhosModulo} rascunho{totalRascunhosModulo === 1 ? "" : "s"}</span>
            ) : null}
          </h2>
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
            const indisponivel = modoSelecao ? false : Boolean(linha.bloqueado);
            return (
              <li
                className={`painel-itens-modulo__item${linha.destaque ? " painel-itens-modulo__item--destaque" : ""}`}
                id={linha.ancoraId}
                key={linha.id}
              >
                <div
                  aria-label={linha.bloqueado ? undefined : `Ver ${linha.tituloReal}`}
                  className={`painel-itens-modulo__linha${linha.bloqueado ? " painel-itens-modulo__linha--bloqueada" : ""}`}
                  onClick={indisponivel ? undefined : () => (modoSelecao ? onSelecionarItem(linha.id) : linha.onAbrir())}
                  onKeyDown={
                    indisponivel
                      ? undefined
                      : (evento) => {
                          if (evento.target !== evento.currentTarget || (evento.key !== "Enter" && evento.key !== " ")) {
                            return;
                          }
                          evento.preventDefault();
                          modoSelecao ? onSelecionarItem(linha.id) : linha.onAbrir();
                        }
                  }
                  role={indisponivel ? undefined : "button"}
                  tabIndex={indisponivel ? undefined : 0}
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

                  <span
                    className={`painel-itens-modulo__icone painel-itens-modulo__icone--${linha.bloqueado ? "bloqueado" : linha.corIcone}`}
                    aria-hidden="true"
                  >
                    {linha.bloqueado ? <TbLock size="1.3rem" /> : linha.iconeTipo}
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
                    {linha.acao ? linha.acao : linha.menuItens ? <MenuAcoes itens={linha.menuItens} rotulo={`Opções de ${linha.tituloReal}`} /> : null}
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
