/* ============================================================
   CAMPO SENHA — input de senha reutilizavel com botao de olho
   para mostrar/ocultar o que foi digitado.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { TbEye, TbEyeOff } from "react-icons/tb";

export default function CampoSenha(props) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const refEntrada = useRef(null);

  // Ao enviar o formulario (sucesso ou erro), a senha volta a ficar oculta -
  // evita que um erro de login/cadastro deixe a senha a mostra na tela.
  useEffect(() => {
    const formulario = refEntrada.current?.closest("form");
    if (!formulario) {
      return undefined;
    }

    function ocultarAoEnviar() {
      setSenhaVisivel(false);
    }

    formulario.addEventListener("submit", ocultarAoEnviar);
    return () => formulario.removeEventListener("submit", ocultarAoEnviar);
  }, []);

  return (
    <div className="campo-senha">
      <input {...props} ref={refEntrada} className="campo__entrada campo-senha__entrada" type={senhaVisivel ? "text" : "password"} />
      <button
        aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={senhaVisivel}
        className="campo-senha__botao-olho"
        onClick={() => setSenhaVisivel((atual) => !atual)}
        type="button"
      >
        {senhaVisivel ? <TbEyeOff aria-hidden="true" size={18} /> : <TbEye aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}
