import { useState } from "react";
import { MdSave } from "react-icons/md";
import { TbTag, TbTagOff, TbX } from "react-icons/tb";
import Botao from "./Botao.jsx";
import CartaoCursoPublico from "./CartaoCursoPublico.jsx";
import Modal from "./Modal.jsx";
import { InlineMessage } from "./Primitives.jsx";
import { ApiError, apiRequest } from "../lib/api.js";

/* Janela "Preparar para venda" (plano fluxo-venda-cursos, Round 6) - Admin
   transforma um Gratuito encerrado em pacote pago (ou edita um pacote ja
   existente), vendo em tempo real como o cartao vai aparecer na home
   publica. Plugada tanto na grade de SecaoCursos.jsx quanto na tela do
   curso em PainelCursoGestao.jsx - por isso recebe so curso/callbacks, sem
   nenhuma dependencia do estado local de quem a abre.

   O botao de venda troca de rotulo/acao conforme o estado atual do curso:
   "Colocar a venda" (POST venda/publicar) quando publicadoParaVendaEm esta
   vazio, "Tirar da venda" (POST venda/despublicar) quando ja esta a venda -
   cobre os dois pontos de entrada do plano (Gratuito-encerrado abrindo pela
   1a vez, e PagoPacote ja convertido sendo editado depois).

   Pacote 8 da auditoria de 26/11 (D1, D4, D8b): Acompanhado ou Gratuito
   ENCERRADO escolhe se vira Pago ou Gratuito. O servidor guarda a
   modalidade original e recusa curso com questao dissertativa publicada. */
const MODELO_GRATUITO = 1;
const MODELO_PAGO_PACOTE = 2;
const ROTULO_MODELO = { 1: "Gratuito", 2: "Pago", 3: "Acompanhado" };

export default function ModalPrepararVenda({ curso, onAtualizar, onFechar, onSalvo, onSessionExpired }) {
  // Modalidade que o servidor ja tem: muda se a conversao salvar e a
  // publicacao falhar logo depois (a janela fica aberta com o motivo).
  const [modeloAtual, setModeloAtual] = useState(Number(curso.modeloCurso));
  const podeEscolherModalidade = modeloAtual !== MODELO_PAGO_PACOTE;
  const [modeloDestino, setModeloDestino] = useState(MODELO_PAGO_PACOTE);
  const [preco, setPreco] = useState(String(curso.preco > 0 ? curso.preco : ""));
  const [descricao, setDescricao] = useState(curso.descricao || "");
  const [arquivoImagemSelecionado, setArquivoImagemSelecionado] = useState(null);
  const [previewImagem, setPreviewImagem] = useState(curso.imagemUrl || "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });

  const jaEstaAVenda = Boolean(curso.publicadoParaVendaEm);
  const destinoGratuito = podeEscolherModalidade && modeloDestino === MODELO_GRATUITO;
  const vaiConverter = podeEscolherModalidade && modeloDestino !== modeloAtual;
  const precoNumero = destinoGratuito ? 0 : Number(preco);
  const previaCurso = {
    ...curso,
    descricao,
    ehGratuito: !(precoNumero > 0),
    imagemUrl: previewImagem,
    preco: precoNumero
  };

  function selecionarArquivoImagem(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setArquivoImagemSelecionado(arquivo);
    setPreviewImagem(URL.createObjectURL(arquivo));
  }

  function fecharJanela() {
    if (salvando) {
      return;
    }

    if (previewImagem.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    onFechar();
  }

  async function executar(acao) {
    if (!destinoGratuito && (!Number.isFinite(precoNumero) || precoNumero <= 0)) {
      setMensagem({ tone: "error", message: "Informe um preco maior que zero." });
      return;
    }

    setSalvando(true);
    setMensagem({ tone: "", message: "" });
    let pacoteSalvo = false;

    try {
      await apiRequest(`/Cursos/${curso.id}/pacote`, {
        method: "PUT",
        body: JSON.stringify({
          preco: precoNumero,
          descricao: descricao.trim(),
          ...(podeEscolherModalidade ? { modeloDestino } : {})
        })
      });
      pacoteSalvo = true;
      if (podeEscolherModalidade) {
        setModeloAtual(modeloDestino);
      }

      if (arquivoImagemSelecionado) {
        const formData = new FormData();
        formData.append("imagem", arquivoImagemSelecionado);
        await apiRequest(`/Cursos/${curso.id}/imagem`, { method: "POST", body: formData });
      }

      if (acao === "publicar") {
        await apiRequest(`/Cursos/${curso.id}/venda/publicar`, { method: "POST" });
      } else if (acao === "despublicar") {
        await apiRequest(`/Cursos/${curso.id}/venda/despublicar`, { method: "POST" });
      }

      onSalvo();
      onFechar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      if (pacoteSalvo) {
        // Conversao/preco ja gravados; so a capa ou a publicacao falhou.
        onAtualizar?.();
        const salvoComo = ROTULO_MODELO[podeEscolherModalidade ? modeloDestino : modeloAtual];
        setMensagem({
          tone: "error",
          message: `O curso já foi salvo como ${salvoComo}, mas ainda não foi publicado: ${err.message || "tente de novo."}`
        });
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel salvar o pacote agora." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      className="modal-caixa--preparar-venda"
      onFechar={fecharJanela}
      rodape={
        <footer className="modal-rodape">
          <Botao disabled={salvando} onClick={fecharJanela} type="button" variante="perigo">
            <TbX aria-hidden="true" size={15} /> Cancelar
          </Botao>
          <Botao disabled={salvando} form="form-preparar-venda" type="submit" variante="secundario">
            <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Salvar sem publicar"}
          </Botao>
          <Botao
            disabled={salvando}
            onClick={() => executar(jaEstaAVenda ? "despublicar" : "publicar")}
            type="button"
            variante="primario"
          >
            {jaEstaAVenda ? (
              <>
                <TbTagOff aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Tirar da venda"}
              </>
            ) : (
              <>
                <TbTag aria-hidden="true" size={17} />{" "}
                {salvando ? "Salvando..." : destinoGratuito ? "Publicar no catálogo" : "Colocar à venda"}
              </>
            )}
          </Botao>
        </footer>
      }
      titulo={`Preparar para venda - ${curso.titulo}`}
    >
      <div className="janela-preparar-venda">
        <form
          className="formulario-modal"
          id="form-preparar-venda"
          onSubmit={(event) => {
            event.preventDefault();
            executar("salvar");
          }}
        >
          {podeEscolherModalidade ? (
            <fieldset className="campo janela-preparar-venda__modalidade">
              <legend className="campo__rotulo">Vender como</legend>
              <div className="gerar-ia__tipos-grid">
                <label className="gerar-ia__tipo-opcao">
                  <input
                    checked={modeloDestino === MODELO_PAGO_PACOTE}
                    disabled={salvando}
                    name="preparar-venda-modelo"
                    onChange={() => setModeloDestino(MODELO_PAGO_PACOTE)}
                    type="radio"
                  />
                  Pago
                </label>
                <label className="gerar-ia__tipo-opcao">
                  <input
                    checked={modeloDestino === MODELO_GRATUITO}
                    disabled={salvando}
                    name="preparar-venda-modelo"
                    onChange={() => setModeloDestino(MODELO_GRATUITO)}
                    type="radio"
                  />
                  Gratuito
                </label>
              </div>
            </fieldset>
          ) : null}

          {!destinoGratuito ? (
            <div className="campo">
              <label className="campo__rotulo" htmlFor="preparar-venda-preco">Preco (R$) *</label>
              <input
                className="campo__entrada"
                disabled={salvando}
                id="preparar-venda-preco"
                inputMode="decimal"
                min={0}
                onChange={(event) => setPreco(event.target.value)}
                step="0.01"
                type="number"
                value={preco}
              />
            </div>
          ) : null}

          <div className="campo">
            <label className="campo__rotulo" htmlFor="preparar-venda-descricao">Descricao</label>
            <textarea
              className="campo__entrada"
              disabled={salvando}
              id="preparar-venda-descricao"
              maxLength={1000}
              onChange={(event) => setDescricao(event.target.value)}
              rows={4}
              value={descricao}
            />
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="preparar-venda-imagem">Trocar capa</label>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="campo__entrada"
              disabled={salvando}
              id="preparar-venda-imagem"
              onChange={selecionarArquivoImagem}
              type="file"
            />
          </div>

          {vaiConverter ? (
            <InlineMessage tone="info">
              {`Ao salvar, o curso passa de ${ROTULO_MODELO[modeloAtual]} para ${ROTULO_MODELO[modeloDestino]}. `}
              A modalidade original fica registrada, quem já está matriculado continua com acesso e professor e
              coordenador passam a ser opcionais.
            </InlineMessage>
          ) : null}

          <InlineMessage tone="warning">
            {jaEstaAVenda
              ? "Este pacote ja esta a venda - alterar preco/descricao aqui nao afeta quem ja comprou (o valor fica congelado na matricula de cada aluno)."
              : "Enquanto nao for colocado a venda, este curso continua fora da home publica e do catalogo de compra."}
          </InlineMessage>

          {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
        </form>

        <div className="janela-preparar-venda__previa">
          <p className="janela-preparar-venda__previa-rotulo">Como vai aparecer na home</p>
          <CartaoCursoPublico curso={previaCurso} />
        </div>
      </div>
    </Modal>
  );
}
