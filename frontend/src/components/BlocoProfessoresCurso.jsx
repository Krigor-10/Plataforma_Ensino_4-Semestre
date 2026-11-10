import { useState } from "react";
import { TbPlus, TbX } from "react-icons/tb";
import Botao from "./Botao.jsx";
import Modal from "./Modal.jsx";
import SelectUsuario from "./SelectUsuario.jsx";

/* Formulario de vincular + lista de desvincular professores de UM curso,
   usado por PainelCursoGestao.jsx (Admin e Coordenador) com
   `confirmarDesvinculo` - desvincular pede confirmacao em Modal antes de
   chamar a API. Estado/chamadas vem do hook useProfessoresCurso.js. */
export default function BlocoProfessoresCurso({
  confirmarDesvinculo = false,
  titulo,
  ...estado
}) {
  const {
    carregando,
    desvincularProfessor,
    desvinculandoId,
    professoresDisponiveisParaVincular,
    professoresDoCurso,
    professorParaVincular,
    setProfessorParaVincular,
    vincularProfessor,
    vinculando
  } = estado;

  const [professorParaConfirmar, setProfessorParaConfirmar] = useState(null);

  function acionarDesvincular(professor) {
    if (confirmarDesvinculo) {
      setProfessorParaConfirmar(professor);
      return;
    }

    desvincularProfessor(professor.id);
  }

  function confirmarDesvinculoProfessor() {
    if (!professorParaConfirmar) {
      return;
    }

    desvincularProfessor(professorParaConfirmar.id);
    setProfessorParaConfirmar(null);
  }

  return (
    <>
      <div className="campo" style={{ marginTop: "var(--espaco-md)" }}>
        <label className="campo__rotulo" htmlFor="selecionar-professor-vincular">Vincular professor</label>
        <div style={{ display: "flex", gap: "var(--espaco-sm)" }}>
          <SelectUsuario
            id="selecionar-professor-vincular"
            onChange={setProfessorParaVincular}
            opcoes={professoresDisponiveisParaVincular}
            placeholder={professoresDisponiveisParaVincular.length ? "Selecione um professor" : "Todos os professores ja vinculados"}
            value={professorParaVincular}
          />
          <Botao disabled={!professorParaVincular || vinculando} onClick={vincularProfessor} tamanho="pequeno" variante="primario">
            <TbPlus aria-hidden="true" size={15} /> {vinculando ? "Vinculando..." : "Vincular"}
          </Botao>
        </div>
      </div>

      {carregando ? (
        <p className="texto-vazio texto-vazio--central" role="status">Carregando professores...</p>
      ) : professoresDoCurso.length === 0 ? (
        <p className="texto-vazio">Nenhum professor vinculado a este curso ainda.</p>
      ) : (
        <ul aria-label={titulo} className="slide-alunos__lista" role="list">
          {professoresDoCurso.map((professor) => (
            <li className="slide-alunos__linha" key={professor.id}>
              <div className="slide-alunos__linha-info">
                <strong className="slide-alunos__linha-nome">{professor.nome}</strong>
              </div>
              <Botao
                disabled={desvinculandoId === professor.id}
                onClick={() => acionarDesvincular(professor)}
                tamanho="pequeno"
                variante="perigo"
              >
                <TbX aria-hidden="true" size={14} /> {desvinculandoId === professor.id ? "Removendo..." : "Desvincular"}
              </Botao>
            </li>
          ))}
        </ul>
      )}

      {professorParaConfirmar ? (
        <Modal
          onFechar={() => setProfessorParaConfirmar(null)}
          titulo="Desvincular professor"
          rodape={
            <footer className="modal-rodape">
              <Botao onClick={() => setProfessorParaConfirmar(null)} variante="perigo">
                <TbX aria-hidden="true" size={15} /> Cancelar
              </Botao>
              <Botao onClick={confirmarDesvinculoProfessor} variante="sucesso">
                Confirmar
              </Botao>
            </footer>
          }
        >
          <p className="texto-confirmacao-exclusao">
            Deseja desvincular <strong>{professorParaConfirmar.nome}</strong> deste curso?
          </p>
        </Modal>
      ) : null}
    </>
  );
}
