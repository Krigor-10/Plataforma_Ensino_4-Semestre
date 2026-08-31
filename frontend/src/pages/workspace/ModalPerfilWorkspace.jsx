import { useEffect, useState } from "react";
import { TbLock, TbMoon, TbSettings, TbSun, TbUserCircle, TbUserEdit, TbUserFilled } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";
import Insignia from "../../components/Insignia.jsx";
import { InlineMessage, MiniList } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";
import { formatCep, onlyDigits } from "../../lib/format.js";
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

function estadoFormularioPerfilInicial(usuario) {
  return {
    nome: usuario?.nome || "",
    email: usuario?.email || "",
    telefone: usuario?.telefone || "",
    cep: usuario?.cep || "",
    rua: usuario?.rua || "",
    numero: usuario?.numero || "",
    bairro: usuario?.bairro || "",
    cidade: usuario?.cidade || "",
    estado: usuario?.estado || ""
  };
}

const ESTADO_INICIAL_SENHA = { senhaAtual: "", novaSenha: "", confirmarNovaSenha: "" };

export function ModalPerfilWorkspace({
  itensCursos,
  fatos,
  destaques,
  ehAluno,
  aoFechar,
  perfil,
  nomeUsuario,
  usuario,
  onSessionExpired,
  onUsuarioAtualizado
}) {
  const [aba, setAba] = useState("informacoes");
  const [temaClaro, setTemaClaro] = usarTemaClaro();

  const [dadosPerfil, setDadosPerfil] = useState(() => estadoFormularioPerfilInicial(usuario));
  const [mensagemPerfil, setMensagemPerfil] = useState({ tone: "", message: "" });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregarPerfilCompleto() {
      try {
        const perfilCompleto = await apiRequest("/Usuarios/me");
        if (!cancelado) {
          setDadosPerfil(estadoFormularioPerfilInicial(perfilCompleto));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
        }
      }
    }

    carregarPerfilCompleto();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dadosSenha, setDadosSenha] = useState(ESTADO_INICIAL_SENHA);
  const [mensagemSenha, setMensagemSenha] = useState({ tone: "", message: "" });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  function atualizarCampoPerfil(event) {
    const { name, value } = event.target;
    setDadosPerfil((atual) => ({ ...atual, [name]: value }));
  }

  function atualizarCampoSenha(event) {
    const { name, value } = event.target;
    setDadosSenha((atual) => ({ ...atual, [name]: value }));
  }

  function validarFormularioPerfil() {
    const obrigatorios = ["nome", "email", "telefone", "cep", "rua", "numero", "bairro", "cidade", "estado"];
    const campoVazio = obrigatorios.find((campo) => !String(dadosPerfil[campo] || "").trim());

    if (campoVazio) {
      return "Preencha todos os campos para salvar seu perfil.";
    }

    if (onlyDigits(dadosPerfil.cep).length !== 8) {
      return "Informe um CEP com 8 digitos.";
    }

    if (dadosPerfil.estado.trim().length !== 2) {
      return "Informe a UF com 2 letras.";
    }

    return "";
  }

  async function salvarPerfil(event) {
    event.preventDefault();

    const erro = validarFormularioPerfil();
    if (erro) {
      setMensagemPerfil({ tone: "error", message: erro });
      return;
    }

    setSalvandoPerfil(true);
    setMensagemPerfil({ tone: "", message: "" });

    try {
      const usuarioAtualizado = await apiRequest("/Usuarios/me", {
        method: "PUT",
        body: JSON.stringify({
          nome: dadosPerfil.nome.trim(),
          email: dadosPerfil.email.trim(),
          telefone: dadosPerfil.telefone.trim(),
          cep: formatCep(onlyDigits(dadosPerfil.cep)),
          rua: dadosPerfil.rua.trim(),
          numero: dadosPerfil.numero.trim(),
          bairro: dadosPerfil.bairro.trim(),
          cidade: dadosPerfil.cidade.trim(),
          estado: dadosPerfil.estado.trim().toUpperCase()
        })
      });

      onUsuarioAtualizado?.(usuarioAtualizado);
      setMensagemPerfil({ tone: "success", message: "Perfil atualizado com sucesso." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemPerfil({ tone: "error", message: err.message || "Nao foi possivel salvar seu perfil agora." });
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function salvarSenha(event) {
    event.preventDefault();

    if (dadosSenha.novaSenha.length < 6) {
      setMensagemSenha({ tone: "error", message: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    if (dadosSenha.novaSenha !== dadosSenha.confirmarNovaSenha) {
      setMensagemSenha({ tone: "error", message: "As senhas nao coincidem." });
      return;
    }

    setSalvandoSenha(true);
    setMensagemSenha({ tone: "", message: "" });

    try {
      await apiRequest("/Usuarios/me/senha", {
        method: "PUT",
        body: JSON.stringify({
          senhaAtual: dadosSenha.senhaAtual,
          novaSenha: dadosSenha.novaSenha
        })
      });

      setDadosSenha(ESTADO_INICIAL_SENHA);
      setMensagemSenha({ tone: "success", message: "Senha atualizada com sucesso." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemSenha({ tone: "error", message: err.message || "Nao foi possivel atualizar sua senha agora." });
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <Modal
      className="modal-caixa--perfil"
      onFechar={aoFechar}
      titulo="Meu perfil"
      rodape={
        aba === "editar" ? (
          <footer className="modal-rodape">
            <Botao disabled={salvandoPerfil} form="form-perfil-editar" type="submit" variante="primario">
              <MdSave aria-hidden="true" size={17} /> {salvandoPerfil ? "Salvando..." : "Salvar alteracoes"}
            </Botao>
          </footer>
        ) : aba === "configuracoes" ? (
          <footer className="modal-rodape">
            <Botao disabled={salvandoSenha} form="form-perfil-senha" type="submit" variante="primario">
              <MdSave aria-hidden="true" size={17} /> {salvandoSenha ? "Salvando..." : "Trocar senha"}
            </Botao>
          </footer>
        ) : null
      }
    >
      <div className="perfil-grade">
        <aside className="perfil-cartao-identidade">
          <div aria-hidden="true" className="perfil-avatar-grande" style={{ "--cor-perfil": corPorTipo[perfil] ?? "#7b2ff7" }}>
            <TbUserFilled size={26} />
          </div>

          <div className="perfil-cartao-identidade__principal">
            <h3 className="perfil-cartao-identidade__nome">{nomeUsuario}</h3>
            <Insignia
              texto={perfil}
              variante={variantePorTipo[perfil] ?? "neutro"}
              style={perfil === "Admin" ? { color: "#fff" } : undefined}
            />
          </div>

          <dl className="perfil-cartao-identidade__dados">
            {fatos.map((fato) => (
              <div className="perfil-dado" key={fato.label}>
                <dt title={fato.label}>{fato.label}</dt>
                <dd title={String(fato.value)}>{fato.value}</dd>
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
              aria-selected={aba === "editar"}
              className={`abas-matriculas__aba${aba === "editar" ? " abas-matriculas__aba--ativa" : ""}`}
              onClick={() => setAba("editar")}
              role="tab"
              type="button"
            >
              <TbUserEdit aria-hidden="true" size={16} />
              Editar dados
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
          ) : null}

          {aba === "editar" ? (
            <section aria-labelledby="titulo-editar-perfil" className="painel-secao">
              <header className="painel-secao__cabecalho">
                <h3 className="painel-secao__titulo" id="titulo-editar-perfil">
                  Editar dados
                </h3>
              </header>
              <div className="painel-secao__conteudo">
                <form className="formulario-modal" id="form-perfil-editar" onSubmit={salvarPerfil}>
                  <div className="formulario-perfil__grade">
                    <div className="campo formulario-perfil__campo--largo">
                      <label className="campo__rotulo" htmlFor="perfil-nome">Nome completo *</label>
                      <input autoComplete="name" className="campo__entrada" disabled={salvandoPerfil} id="perfil-nome" maxLength={150} name="nome" onChange={atualizarCampoPerfil} value={dadosPerfil.nome} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-email">E-mail *</label>
                      <input autoComplete="email" className="campo__entrada" disabled={salvandoPerfil} id="perfil-email" name="email" onChange={atualizarCampoPerfil} type="email" value={dadosPerfil.email} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-telefone">Telefone *</label>
                      <input autoComplete="tel" className="campo__entrada" disabled={salvandoPerfil} id="perfil-telefone" maxLength={20} name="telefone" onChange={atualizarCampoPerfil} placeholder="(11) 99999-9999" value={dadosPerfil.telefone} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-cep">CEP *</label>
                      <input autoComplete="postal-code" className="campo__entrada" disabled={salvandoPerfil} id="perfil-cep" inputMode="numeric" maxLength={9} name="cep" onChange={atualizarCampoPerfil} placeholder="00000-000" value={dadosPerfil.cep} />
                    </div>
                    <div className="campo formulario-perfil__campo--largo">
                      <label className="campo__rotulo" htmlFor="perfil-rua">Rua *</label>
                      <input autoComplete="address-line1" className="campo__entrada" disabled={salvandoPerfil} id="perfil-rua" maxLength={200} name="rua" onChange={atualizarCampoPerfil} value={dadosPerfil.rua} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-numero">Numero *</label>
                      <input autoComplete="address-line2" className="campo__entrada" disabled={salvandoPerfil} id="perfil-numero" maxLength={20} name="numero" onChange={atualizarCampoPerfil} value={dadosPerfil.numero} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-bairro">Bairro *</label>
                      <input autoComplete="address-level3" className="campo__entrada" disabled={salvandoPerfil} id="perfil-bairro" maxLength={120} name="bairro" onChange={atualizarCampoPerfil} value={dadosPerfil.bairro} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-cidade">Cidade *</label>
                      <input autoComplete="address-level2" className="campo__entrada" disabled={salvandoPerfil} id="perfil-cidade" maxLength={120} name="cidade" onChange={atualizarCampoPerfil} value={dadosPerfil.cidade} />
                    </div>
                    <div className="campo">
                      <label className="campo__rotulo" htmlFor="perfil-estado">UF *</label>
                      <input autoComplete="address-level1" className="campo__entrada" disabled={salvandoPerfil} id="perfil-estado" maxLength={2} name="estado" onChange={atualizarCampoPerfil} placeholder="SP" value={dadosPerfil.estado} />
                    </div>
                  </div>

                  {mensagemPerfil.message ? <InlineMessage tone={mensagemPerfil.tone}>{mensagemPerfil.message}</InlineMessage> : null}
                </form>
              </div>
            </section>
          ) : null}

          {aba === "configuracoes" ? (
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

                <div className="perfil-seguranca-item perfil-seguranca-item--formulario">
                  <div className="perfil-seguranca-item__info">
                    <TbLock aria-hidden="true" size={22} />
                    <div>
                      <strong>Senha</strong>
                      <p>Troque sua senha de acesso.</p>
                    </div>
                  </div>

                  <form className="formulario-modal" id="form-perfil-senha" onSubmit={salvarSenha} style={{ width: "100%" }}>
                    <div className="formulario-perfil__grade">
                      <div className="campo formulario-perfil__campo--largo">
                        <label className="campo__rotulo" htmlFor="senha-atual">Senha atual *</label>
                        <input autoComplete="current-password" className="campo__entrada" disabled={salvandoSenha} id="senha-atual" name="senhaAtual" onChange={atualizarCampoSenha} type="password" value={dadosSenha.senhaAtual} />
                      </div>
                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="senha-nova">Nova senha *</label>
                        <input autoComplete="new-password" className="campo__entrada" disabled={salvandoSenha} id="senha-nova" minLength={6} name="novaSenha" onChange={atualizarCampoSenha} type="password" value={dadosSenha.novaSenha} />
                      </div>
                      <div className="campo">
                        <label className="campo__rotulo" htmlFor="senha-confirmar">Confirmar nova senha *</label>
                        <input autoComplete="new-password" className="campo__entrada" disabled={salvandoSenha} id="senha-confirmar" minLength={6} name="confirmarNovaSenha" onChange={atualizarCampoSenha} type="password" value={dadosSenha.confirmarNovaSenha} />
                      </div>
                    </div>

                    {mensagemSenha.message ? <InlineMessage tone={mensagemSenha.tone}>{mensagemSenha.message}</InlineMessage> : null}
                  </form>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
