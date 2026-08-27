import { useEffect, useState } from "react";
import { TbLock, TbMoon, TbSettings, TbSun, TbUserCircle, TbUserFilled } from "react-icons/tb";
import Modal from "../../components/Modal.jsx";
import Insignia from "../../components/Insignia.jsx";
import { MiniList } from "../../components/Primitives.jsx";
import { corPorTipo } from "./BarraLateral.jsx";

const variantePorTipo = { Aluno: "marca", Professor: "info", Coordenador: "aviso", Admin: "erro" };

function usarTemaClaro() {
  const [temaClaro, setTemaClaro] = useState(() => localStorage.getItem("coderyse-tema") === "claro");

  useEffect(() => {
    document.documentElement.dataset.tema = temaClaro ? "claro" : "escuro";
    localStorage.setItem("coderyse-tema", temaClaro ? "claro" : "escuro");
  }, [temaClaro]);

  return [temaClaro, setTemaClaro];
}

export function ModalPerfilWorkspace({
  itensCursos,
  fatos,
  destaques,
  ehAluno,
  aoFechar,
  perfil,
  nomeUsuario
}) {
  const [aba, setAba] = useState("informacoes");
  const [temaClaro, setTemaClaro] = usarTemaClaro();

  return (
    <Modal className="modal-caixa--perfil" onFechar={aoFechar} titulo="Meu perfil">
      <div className="perfil-grade">
        <aside className="perfil-cartao-identidade">
          <div aria-hidden="true" className="perfil-avatar-grande" style={{ "--cor-perfil": corPorTipo[perfil] ?? "#7b2ff7" }}>
            <TbUserFilled size={32} />
          </div>
          <h3 className="perfil-cartao-identidade__nome">{nomeUsuario}</h3>
          <Insignia
            texto={perfil}
            variante={variantePorTipo[perfil] ?? "neutro"}
            style={perfil === "Admin" ? { color: "#fff" } : undefined}
          />

          <dl className="perfil-cartao-identidade__dados">
            {fatos.map((fato) => (
              <div className="perfil-dado" key={fato.label}>
                <dt>{fato.label}</dt>
                <dd>{fato.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className="perfil-painel">
          <nav aria-label="Secoes do perfil" className="abas-matriculas" role="tablist" style={{ marginBottom: "var(--espaco-lg)" }}>
            <button
              aria-selected={aba === "informacoes"}
              className={`abas-matriculas__aba${aba === "informacoes" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => setAba("informacoes")}
              role="tab"
              type="button"
            >
              <TbUserCircle aria-hidden="true" size={16} />
              Informacoes
            </button>
            <button
              aria-selected={aba === "configuracoes"}
              className={`abas-matriculas__aba${aba === "configuracoes" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => setAba("configuracoes")}
              role="tab"
              type="button"
            >
              <TbSettings aria-hidden="true" size={16} />
              Configuracoes
            </button>
          </nav>

          {aba === "informacoes" ? (
            <section aria-labelledby="titulo-resumo-perfil" className="painel-secao">
              <header className="painel-secao__cabecalho">
                <h3 className="painel-secao__titulo" id="titulo-resumo-perfil">
                  {ehAluno ? "Resumo academico" : "Resumo atual"}
                </h3>
              </header>
              <div className="painel-secao__conteudo">
                <div className="profile-modal__chips">
                  {destaques.map((item) => (
                    <span className="chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>

                {ehAluno ? (
                  <>
                    <h4 style={{ marginTop: "var(--espaco-lg)", marginBottom: "var(--espaco-sm)", fontSize: "0.85rem", color: "var(--cor-texto-suave)" }}>
                      Cursos com matricula aprovada
                    </h4>
                    <MiniList emptyMessage="Assim que suas matriculas forem aprovadas, elas aparecerao aqui." items={itensCursos} />
                  </>
                ) : null}
              </div>
            </section>
          ) : (
            <section aria-labelledby="titulo-config-perfil" className="painel-secao">
              <header className="painel-secao__cabecalho">
                <h3 className="painel-secao__titulo" id="titulo-config-perfil">
                  Configuracoes
                </h3>
              </header>
              <div className="painel-secao__conteudo">
                <div className="perfil-seguranca-item">
                  <div className="perfil-seguranca-item__info">
                    {temaClaro ? <TbSun aria-hidden="true" size={22} /> : <TbMoon aria-hidden="true" size={22} />}
                    <div>
                      <strong>Aparencia</strong>
                      <p>{temaClaro ? "Tema claro ativado" : "Tema escuro ativado"}</p>
                    </div>
                  </div>
                  <button
                    aria-checked={temaClaro}
                    aria-label={temaClaro ? "Ativar tema escuro" : "Ativar tema claro"}
                    className={`switch-tema${temaClaro ? " switch-tema--claro" : ""}`}
                    onClick={() => setTemaClaro((atual) => !atual)}
                    role="switch"
                    type="button"
                  >
                    <TbMoon aria-hidden="true" className="switch-tema__lua" size={12} />
                    <span aria-hidden="true" className="switch-tema__thumb" />
                    <TbSun aria-hidden="true" className="switch-tema__sol" size={12} />
                  </button>
                </div>

                <div className="perfil-seguranca-item">
                  <div className="perfil-seguranca-item__info">
                    <TbLock aria-hidden="true" size={22} />
                    <div>
                      <strong>Senha</strong>
                      <p>Alteracao de senha ainda nao disponivel neste ambiente.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
