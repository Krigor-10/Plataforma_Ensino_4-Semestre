import { Component } from "react";
import { TbAlertTriangle } from "react-icons/tb";
import Botao from "./Botao.jsx";

/* Unico jeito de capturar erro de render em React hoje e um class component
   com getDerivedStateFromError/componentDidCatch (nao existe equivalente em
   hook). Sem isso, qualquer excecao nao tratada durante o render de QUALQUER
   tela derruba a arvore inteira pro fallback padrao do React (tela branca),
   sem mensagem nenhuma pro usuario. Reaproveita o mesmo padrao visual
   .route-gate/.route-gate__card ja usado nas telas de carregamento de sessao
   em App.jsx. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Erro nao tratado capturado pelo ErrorBoundary:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="route-gate">
        <section className="route-gate__card">
          <TbAlertTriangle aria-hidden="true" color="#ef4444" size={40} />
          <h1>Algo deu errado</h1>
          <p>Encontramos um erro inesperado nesta tela. Recarregar a pagina costuma resolver.</p>
          <Botao onClick={() => window.location.reload()} variante="primario">
            Recarregar pagina
          </Botao>
        </section>
      </div>
    );
  }
}
