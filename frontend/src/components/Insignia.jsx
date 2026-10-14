import { inferirVarianteStatus } from "../lib/statusVariant.js";

export default function Insignia({ texto, variante, style }) {
  const varianteResolvida = variante || inferirVarianteStatus(texto);

  return (
    <span className={`insignia insignia--${varianteResolvida}`} role="status" style={style}>
      {texto}
    </span>
  );
}
