import { TbBolt } from "react-icons/tb";
import BarraProgresso from "./BarraProgresso.jsx";

/* Barra de XP/nivel do aluno (prompt "barra de XP do aluno",
   docs/gamificacao) - xp vem de calcularXp (lib/xp.js), derivado do
   progresso que ja existe, nada e persistido. variante="completa" no
   Panorama, variante="compacta" na barra de abas do Academico. */
export default function ProgressoXp({ xp, variante = "completa" }) {
  if (!xp) {
    return null;
  }

  const { nivel, xpNoNivel, xpPorNivel } = xp;
  const rotuloAria = `Nível ${nivel}: ${xpNoNivel} de ${xpPorNivel} XP`;

  if (variante === "compacta") {
    return (
      <div className="progresso-xp progresso-xp--compacta">
        <span className="progresso-xp__nivel">Nível {nivel}</span>
        <BarraProgresso mostrarTexto={false} percentual={xp.percentualNivel} rotuloAria={rotuloAria} />
      </div>
    );
  }

  return (
    <div className="progresso-xp progresso-xp--completa">
      <div className="progresso-xp__cabecalho">
        <span className="progresso-xp__nivel">
          <TbBolt aria-hidden="true" size={16} />
          Nível {nivel}
        </span>
        <span className="progresso-xp__contagem">
          {xpNoNivel} / {xpPorNivel} XP
        </span>
      </div>
      <BarraProgresso mostrarTexto={false} percentual={xp.percentualNivel} rotuloAria={rotuloAria} />
    </div>
  );
}
