/* Mapeamento automático de variante visual por texto de status —
   evita que cada chamador precise informar a variante manualmente */
const variantePorValor = {
  Aprovada: "sucesso",
  Ativa: "sucesso",
  Concluído: "sucesso",
  Publicada: "sucesso",
  "Em andamento": "info",
  Pendente: "aviso",
  Rascunho: "aviso",
  Rejeitada: "erro",
  Cancelada: "erro",
  Inativo: "erro",
  "Não iniciado": "neutro",
  Concluída: "neutro",
};

export default function Insignia({ texto, variante, style }) {
  const varianteResolvida = variante || variantePorValor[texto] || "neutro";

  return (
    <span className={`insignia insignia--${varianteResolvida}`} role="status" style={style}>
      {texto}
    </span>
  );
}
