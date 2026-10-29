import { inferirVarianteStatus } from "../lib/statusVariant.js";

export default function Insignia({ texto, variante, style, className }) {
  const varianteResolvida = variante || inferirVarianteStatus(texto);

  return (
    <span
      className={`insignia insignia--${varianteResolvida}${className ? ` ${className}` : ""}`}
      role="status"
      style={style}
    >
      {texto}
    </span>
  );
}
