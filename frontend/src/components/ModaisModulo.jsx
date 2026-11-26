import { TbArchive, TbCheck, TbX } from "react-icons/tb";
import { MdSave } from "react-icons/md";
import Botao from "./Botao.jsx";
import Modal from "./Modal.jsx";
import SelectSimples from "./SelectSimples.jsx";
import { InlineMessage } from "./Primitives.jsx";

/* Modais de criar/editar/excluir modulo, compartilhados entre
   SecaoConteudosProfessor.jsx e PainelCursoGestao.jsx (Admin/Coordenador) -
   os dois chamam com o curso ja fixo (ver `cursoFixo`). O seletor de curso
   (`cursosOrdenados`) fica disponivel pra um eventual caller sem curso fixo,
   mas nenhum dos dois atuais precisa dele. Estado e chamadas de API vem do
   hook useModaisModulo.js. Curso nunca e alteravel ao editar (so o titulo e
   salvo, ver useModaisModulo#salvarModulo) - o seletor fica desabilitado
   nesse caso pra nao sugerir o contrario. */
export default function ModaisModulo({
  bloqueioExclusao = null,
  cursoFixo = null,
  cursosOrdenados = [],
  dadosFormulario,
  formularioAberto,
  mensagemExclusao,
  mensagemFormulario,
  moduloEmEdicaoId,
  moduloParaExcluir,
  onConfirmarExclusao,
  onFecharExclusao,
  onFecharFormulario,
  onSalvarModulo,
  onVerArquivados,
  salvando,
  setDadosFormulario
}) {
  const exclusaoBloqueada = bloqueioExclusao?.podeExcluir === false;

  return (
    <>
      {moduloParaExcluir ? (
        <Modal
          onFechar={onFecharExclusao}
          titulo="Excluir módulo"
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={onFecharExclusao} variante={exclusaoBloqueada ? "secundario" : "perigo"}>
                <TbX aria-hidden="true" size={15} /> {exclusaoBloqueada ? "Fechar" : "Cancelar"}
              </Botao>
              {exclusaoBloqueada ? null : (
                <Botao disabled={salvando} onClick={onConfirmarExclusao} variante="sucesso">
                  <TbCheck aria-hidden="true" size={15} /> {salvando ? "Excluindo..." : "Confirmar exclusão"}
                </Botao>
              )}
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            Deseja excluir o módulo <strong>{moduloParaExcluir.titulo}</strong>? Esta ação não pode ser desfeita.
          </p>
          {mensagemExclusao ? (
            <>
              <InlineMessage tone={exclusaoBloqueada ? "warning" : "error"}>{mensagemExclusao}</InlineMessage>
              {exclusaoBloqueada && bloqueioExclusao?.temItemArquivado && onVerArquivados ? (
                <Botao onClick={onVerArquivados} tamanho="pequeno" variante="secundario">
                  <TbArchive aria-hidden="true" size={15} /> Ver arquivados
                </Botao>
              ) : null}
            </>
          ) : null}
        </Modal>
      ) : null}

      {formularioAberto ? (
        <Modal
          onFechar={onFecharFormulario}
          titulo={moduloEmEdicaoId ? "Editar modulo" : "Novo modulo"}
          rodape={
            <footer className="modal-rodape">
              <Botao disabled={salvando} onClick={onFecharFormulario} type="button" variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao disabled={salvando} form="form-modulo" type="submit" variante="primario">
                <MdSave aria-hidden="true" size={17} /> {salvando ? "Salvando..." : "Salvar"}
              </Botao>
            </footer>
          }
        >
          <form className="formulario-modal" id="form-modulo" onSubmit={onSalvarModulo}>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="modulo-curso">Curso *</label>
              {cursoFixo ? (
                <input className="campo__entrada" disabled id="modulo-curso" type="text" value={cursoFixo.titulo} />
              ) : (
                <SelectSimples
                  disabled={Boolean(moduloEmEdicaoId)}
                  id="modulo-curso"
                  onChange={(valor) => setDadosFormulario((atual) => ({ ...atual, cursoId: valor }))}
                  opcoes={cursosOrdenados.map((curso) => ({ valor: String(curso.id), rotulo: curso.titulo }))}
                  placeholder="Selecione um curso"
                  value={dadosFormulario.cursoId}
                />
              )}
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="modulo-titulo">Titulo *</label>
              <input
                autoComplete="off"
                className="campo__entrada"
                id="modulo-titulo"
                maxLength={150}
                onChange={(event) => setDadosFormulario((atual) => ({ ...atual, titulo: event.target.value }))}
                placeholder="Ex: Fundamentos de Programacao"
                type="text"
                value={dadosFormulario.titulo}
              />
            </div>
            {moduloEmEdicaoId && !cursoFixo ? (
              <p className="texto-mudo" style={{ fontSize: "0.8rem" }}>
                O curso fica travado durante a edicao porque a API atual permite atualizar apenas o titulo do modulo.
              </p>
            ) : null}
            {mensagemFormulario.message ? <InlineMessage tone={mensagemFormulario.tone}>{mensagemFormulario.message}</InlineMessage> : null}
          </form>
        </Modal>
      ) : null}
    </>
  );
}
