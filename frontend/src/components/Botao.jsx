import { forwardRef } from "react";
import { motion } from "framer-motion";

const MOLA = { type: "spring", stiffness: 420, damping: 18 };

/**
 * Drop-in para <button className="botao ..."> com física de mola.
 * Uso: <Botao variante="primario" tamanho="pequeno" onClick={...}>Texto</Botao>
 * Encaminha ref pro <button> real (ex.: MenuAcoes usa o botao com texto como
 * gatilho do menu e precisa do DOM node pra focar/detectar clique fora).
 */
const Botao = forwardRef(function Botao(
  { variante, tamanho, className = "", children, disabled, type = "button", ...rest },
  ref
) {
  const classes = [
    "botao",
    variante && `botao--${variante}`,
    tamanho && `botao--${tamanho}`,
    className,
  ].filter(Boolean).join(" ");

  return (
    <motion.button
      ref={ref}
      className={classes}
      type={type}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.95, y: 1 }}
      transition={MOLA}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

export default Botao;
