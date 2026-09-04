import { useEffect, useState } from "react";
import { InlineMessage } from "../components/Primitives.jsx";
import { TbX } from "react-icons/tb";
import Botao from "../components/Botao.jsx";
import { SIGNUP_INITIAL_STATE } from "../data/appConfig.js";
import { formatCep, onlyDigits } from "../lib/format.js";
import { apiRequest } from "../lib/api.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const ABAS = ["Dados Pessoais e Senha", "Endereco"];
const CAMPOS_ABA_0 = ["nome", "email", "cpf", "telefone", "cursoId", "senha", "confirmarSenha"];

const ID_DO_CAMPO = {
  nome: "cad-nome",
  email: "cad-email",
  cpf: "cad-cpf",
  telefone: "cad-telefone",
  cursoId: "cad-curso",
  senha: "cad-senha",
  confirmarSenha: "cad-confirmar-senha",
  cep: "cad-cep",
  rua: "cad-rua",
  numero: "cad-numero",
  bairro: "cad-bairro",
  cidade: "cad-cidade",
  estado: "cad-estado"
};

export default function CadastroScreen({ isDemoMode, onNavigate }) {
  useDocumentTitle("Cadastro de matricula | CodeRyse Academy");

  const [form, setForm] = useState(SIGNUP_INITIAL_STATE);
  const [cursos, setCursos] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");
  const [abaAtual, setAbaAtual] = useState(0);
  const [campoComErro, setCampoComErro] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      try {
        const response = await apiRequest("/Cursos");
        if (ignore) {
          return;
        }

        setCursos(response);
        setCatalogStatus("ready");
      } catch (err) {
        if (ignore) {
          return;
        }

        setCatalogStatus("error");
        setTone("error");
        setMessage(err.message || "Nao foi possivel carregar os cursos agora.");
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, []);

  function updateField(name, value) {
    if (campoComErro === name) {
      setCampoComErro("");
    }

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function avancarAba() {
    const campoFaltando = CAMPOS_ABA_0.find((campo) => !String(form[campo] || "").trim());

    if (campoFaltando) {
      setTone("error");
      setMessage("Preencha todos os campos desta etapa antes de continuar.");
      setCampoComErro(campoFaltando);
      return;
    }

    setTone("info");
    setMessage("");
    setCampoComErro("");
    setAbaAtual(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateSignup(form);

    if (validationError) {
      setTone("error");
      setMessage(validationError.mensagem);
      setCampoComErro(validationError.campo);
      return;
    }

    setCampoComErro("");
    setStatus("pending");
    setTone("info");
    setMessage("Enviando seu cadastro...");

    const cpfDigits = onlyDigits(form.cpf);
    const cepDigits = onlyDigits(form.cep);

    try {
      const response = await apiRequest("/Alunos/cadastro-completo", {
        method: "POST",
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim(),
          cpf: cpfDigits,
          telefone: form.telefone.trim(),
          cep: formatCep(cepDigits),
          rua: form.rua.trim(),
          numero: form.numero.trim(),
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          estado: form.estado.trim().toUpperCase(),
          cursoId: Number(form.cursoId),
          senha: form.senha
        })
      });

      setStatus("success");
      setTone("success");
      setMessage(response.mensagem || "Cadastro realizado com sucesso. Sua matricula foi aprovada.");

      window.setTimeout(() => {
        onNavigate("/login");
      }, 1400);
    } catch (err) {
      setStatus("idle");
      setTone("error");
      setMessage(err.message || "Nao foi possivel concluir o cadastro.");
    }
  }

  function classeCampo(nomeCampo) {
    return campoComErro === nomeCampo ? "campo campo--erro" : "campo";
  }

  function propsInvalido(nomeCampo) {
    if (campoComErro !== nomeCampo) {
      return {};
    }

    return { "aria-invalid": "true", "aria-describedby": `${ID_DO_CAMPO[nomeCampo]}-erro` };
  }

  function ErroCampo({ nomeCampo }) {
    if (campoComErro !== nomeCampo) {
      return null;
    }

    return (
      <span className="campo__erro" id={`${ID_DO_CAMPO[nomeCampo]}-erro`} role="alert">
        {message}
      </span>
    );
  }

  if (status === "success") {
    return (
      <div className="tela-cadastro tela-cadastro--confirmacao">
        <div className="cadastro-confirmacao">
          <span className="cadastro-confirmacao__icone" aria-hidden="true">✓</span>
          <h1 className="cadastro-confirmacao__titulo">Matricula confirmada!</h1>
          <p className="cadastro-confirmacao__texto">{message || "Sua matricula foi aprovada. Voce ja pode entrar com o e-mail cadastrado e acessar o curso."}</p>
          <div className="cadastro-confirmacao__acoes">
            <Botao variante="primario" tamanho="grande" onClick={() => onNavigate("/login")}>
              Acessar plataforma
            </Botao>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tela-cadastro">
      <header className="cadastro-cabecalho">
        <div className="cadastro-cabecalho__inner">
          <button className="cadastro-voltar" type="button" onClick={() => onNavigate("/")}>
            ← Voltar
          </button>
          <a className="cabecalho-publico__logo" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
            <span className="cabecalho-publico__logo-marca" aria-hidden="true">
              <span>Code</span>
              <span>Ryse</span>
            </span>
          </a>
          <span className="cadastro-cabecalho__legenda">
            Ja tem conta?{" "}
            <button className="cadastro-entrar" type="button" onClick={() => onNavigate("/login")}>
              Entrar
            </button>
          </span>
        </div>
      </header>

      <main className="cadastro-principal">
        <div className="cadastro-container">
          <div>
            <h1 className="cadastro-intro__titulo">Matricule-se na CodeRyse</h1>
            <p className="cadastro-intro__subtitulo">O formulario envia o cadastro completo e sua matricula ja e aprovada automaticamente.</p>
          </div>

          {isDemoMode ? (
            <InlineMessage tone="info">
              Modo apresentacao ativo: o envio do cadastro sera simulado localmente e depois voce pode entrar com o mesmo e-mail.
            </InlineMessage>
          ) : null}

          <nav className="abas-matriculas" aria-label="Etapas do cadastro">
            {ABAS.map((rotulo, indice) => (
              <button
                className={`abas-matriculas__aba${abaAtual === indice ? " abas-matriculas__aba--ativa" : ""}`}
                disabled={indice > abaAtual}
                key={rotulo}
                onClick={() => indice <= abaAtual && setAbaAtual(indice)}
                type="button"
              >
                {rotulo}
              </button>
            ))}
          </nav>

          <form className="formulario-cadastro" onSubmit={handleSubmit}>
            {abaAtual === 0 ? (
              <div className="formulario-cadastro__grupo">
                <span className="formulario-cadastro__legenda">Dados pessoais</span>

                <div className={classeCampo("nome")}>
                  <label className="campo__rotulo" htmlFor="cad-nome">Nome completo</label>
                  <input
                    className="campo__entrada"
                    id="cad-nome"
                    name="nome"
                    type="text"
                    value={form.nome}
                    onChange={(event) => updateField("nome", event.target.value)}
                    required
                    {...propsInvalido("nome")}
                  />
                  <ErroCampo nomeCampo="nome" />
                </div>

                <div className={classeCampo("email")}>
                  <label className="campo__rotulo" htmlFor="cad-email">E-mail</label>
                  <input
                    autoComplete="email"
                    className="campo__entrada"
                    id="cad-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                    {...propsInvalido("email")}
                  />
                  <ErroCampo nomeCampo="email" />
                </div>

                <div className={classeCampo("cpf")}>
                  <label className="campo__rotulo" htmlFor="cad-cpf">CPF</label>
                  <input
                    className="campo__entrada"
                    id="cad-cpf"
                    inputMode="numeric"
                    name="cpf"
                    type="text"
                    value={form.cpf}
                    onChange={(event) => updateField("cpf", event.target.value)}
                    required
                    {...propsInvalido("cpf")}
                  />
                  <ErroCampo nomeCampo="cpf" />
                </div>

                <div className={classeCampo("telefone")}>
                  <label className="campo__rotulo" htmlFor="cad-telefone">Telefone</label>
                  <input
                    className="campo__entrada"
                    id="cad-telefone"
                    inputMode="tel"
                    name="telefone"
                    type="text"
                    value={form.telefone}
                    onChange={(event) => updateField("telefone", event.target.value)}
                    required
                    {...propsInvalido("telefone")}
                  />
                  <ErroCampo nomeCampo="telefone" />
                </div>

                <div className={classeCampo("cursoId")}>
                  <label className="campo__rotulo" htmlFor="cad-curso">Curso desejado</label>
                  <select
                    className="campo__entrada"
                    id="cad-curso"
                    name="cursoId"
                    value={form.cursoId}
                    onChange={(event) => updateField("cursoId", event.target.value)}
                    required
                    {...propsInvalido("cursoId")}
                  >
                    <option value="">
                      {catalogStatus === "loading" ? "Carregando cursos..." : "Selecione um curso"}
                    </option>
                    {cursos.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.titulo}
                      </option>
                    ))}
                  </select>
                  <ErroCampo nomeCampo="cursoId" />
                </div>

                <div className={classeCampo("senha")}>
                  <label className="campo__rotulo" htmlFor="cad-senha">Senha</label>
                  <input
                    autoComplete="new-password"
                    className="campo__entrada"
                    id="cad-senha"
                    minLength={6}
                    name="senha"
                    type="password"
                    value={form.senha}
                    onChange={(event) => updateField("senha", event.target.value)}
                    required
                    {...propsInvalido("senha")}
                  />
                  <ErroCampo nomeCampo="senha" />
                </div>

                <div className={classeCampo("confirmarSenha")}>
                  <label className="campo__rotulo" htmlFor="cad-confirmar-senha">Confirmar senha</label>
                  <input
                    autoComplete="new-password"
                    className="campo__entrada"
                    id="cad-confirmar-senha"
                    minLength={6}
                    name="confirmarSenha"
                    type="password"
                    value={form.confirmarSenha}
                    onChange={(event) => updateField("confirmarSenha", event.target.value)}
                    required
                    {...propsInvalido("confirmarSenha")}
                  />
                  <ErroCampo nomeCampo="confirmarSenha" />
                </div>
              </div>
            ) : (
              <div className="formulario-cadastro__grupo">
                <span className="formulario-cadastro__legenda">Endereco</span>

                <div className={classeCampo("cep")}>
                  <label className="campo__rotulo" htmlFor="cad-cep">CEP</label>
                  <input
                    className="campo__entrada"
                    id="cad-cep"
                    inputMode="numeric"
                    name="cep"
                    type="text"
                    value={form.cep}
                    onChange={(event) => updateField("cep", event.target.value)}
                    required
                    {...propsInvalido("cep")}
                  />
                  <ErroCampo nomeCampo="cep" />
                </div>

                <div className="grade-endereco">
                  <div className={classeCampo("rua")}>
                    <label className="campo__rotulo" htmlFor="cad-rua">Rua</label>
                    <input
                      className="campo__entrada"
                      id="cad-rua"
                      name="rua"
                      type="text"
                      value={form.rua}
                      onChange={(event) => updateField("rua", event.target.value)}
                      required
                      {...propsInvalido("rua")}
                    />
                    <ErroCampo nomeCampo="rua" />
                  </div>

                  <div className={classeCampo("numero")}>
                    <label className="campo__rotulo" htmlFor="cad-numero">Numero</label>
                    <input
                      className="campo__entrada"
                      id="cad-numero"
                      name="numero"
                      type="text"
                      value={form.numero}
                      onChange={(event) => updateField("numero", event.target.value)}
                      required
                      {...propsInvalido("numero")}
                    />
                    <ErroCampo nomeCampo="numero" />
                  </div>
                </div>

                <div className={classeCampo("bairro")}>
                  <label className="campo__rotulo" htmlFor="cad-bairro">Bairro</label>
                  <input
                    className="campo__entrada"
                    id="cad-bairro"
                    name="bairro"
                    type="text"
                    value={form.bairro}
                    onChange={(event) => updateField("bairro", event.target.value)}
                    required
                    {...propsInvalido("bairro")}
                  />
                  <ErroCampo nomeCampo="bairro" />
                </div>

                <div className="grade-endereco">
                  <div className={classeCampo("cidade")}>
                    <label className="campo__rotulo" htmlFor="cad-cidade">Cidade</label>
                    <input
                      className="campo__entrada"
                      id="cad-cidade"
                      name="cidade"
                      type="text"
                      value={form.cidade}
                      onChange={(event) => updateField("cidade", event.target.value)}
                      required
                      {...propsInvalido("cidade")}
                    />
                    <ErroCampo nomeCampo="cidade" />
                  </div>

                  <div className={classeCampo("estado")}>
                    <label className="campo__rotulo" htmlFor="cad-estado">Estado</label>
                    <input
                      className="campo__entrada"
                      id="cad-estado"
                      maxLength={2}
                      name="estado"
                      type="text"
                      value={form.estado}
                      onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
                      required
                      {...propsInvalido("estado")}
                    />
                    <ErroCampo nomeCampo="estado" />
                  </div>
                </div>
              </div>
            )}

            {message ? <InlineMessage tone={tone}>{message}</InlineMessage> : null}

            <footer className="formulario-cadastro__rodape">
              {abaAtual === 0 ? (
                <Botao variante="perigo" onClick={() => onNavigate("/")} type="button">
                  <TbX aria-hidden="true" size={15} /> Cancelar
                </Botao>
              ) : (
                <Botao variante="fantasma" onClick={() => setAbaAtual(0)} type="button">
                  Anterior
                </Botao>
              )}

              {abaAtual === 0 ? (
                <Botao variante="primario" onClick={avancarAba} type="button">
                  Proximo
                </Botao>
              ) : (
                <Botao variante="primario" disabled={status === "pending" || catalogStatus === "loading"} type="submit">
                  {status === "pending" ? "Enviando..." : "Concluir cadastro"}
                </Botao>
              )}
            </footer>
          </form>
        </div>
      </main>
    </div>
  );
}

function validateSignup(form) {
  const requiredFields = [
    "nome",
    "email",
    "cpf",
    "telefone",
    "cep",
    "rua",
    "numero",
    "bairro",
    "cidade",
    "estado",
    "cursoId",
    "senha",
    "confirmarSenha"
  ];

  const campoFaltando = requiredFields.find((field) => !String(form[field] || "").trim());

  if (campoFaltando) {
    return { campo: campoFaltando, mensagem: "Preencha todos os campos do cadastro." };
  }

  if (onlyDigits(form.cpf).length !== 11) {
    return { campo: "cpf", mensagem: "Informe um CPF com 11 digitos." };
  }

  if (onlyDigits(form.cep).length !== 8) {
    return { campo: "cep", mensagem: "Informe um CEP com 8 digitos." };
  }

  if (form.estado.trim().length !== 2) {
    return { campo: "estado", mensagem: "Use a sigla do estado com 2 letras." };
  }

  if (form.senha.length < 6) {
    return { campo: "senha", mensagem: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (form.senha !== form.confirmarSenha) {
    return { campo: "confirmarSenha", mensagem: "As senhas nao coincidem." };
  }

  return null;
}
