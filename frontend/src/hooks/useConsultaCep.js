import { useEffect, useRef, useState } from "react";
import { onlyDigits } from "../lib/format.js";

const ATRASO_DEBOUNCE_MS = 500;

/**
 * Consulta automatica de endereco por CEP (ViaCEP), com debounce e protecao
 * contra condicao de corrida. So dispara a chamada com exatamente 8 digitos;
 * nunca bloqueia o formulario nem lanca excecao - falha de rede ou CEP nao
 * encontrado so vira uma mensagem informativa, o preenchimento manual
 * continua disponivel. `onEncontrado` decide o que fazer com o endereco
 * resolvido (cada formulario mantem seu proprio estado).
 */
export function useConsultaCep({ onEncontrado } = {}) {
  const [status, setStatus] = useState("idle");
  const [mensagem, setMensagem] = useState("");
  const timeoutRef = useRef(null);
  const consultaAtualRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function consultarCep(cepBruto) {
    const digitos = onlyDigits(cepBruto);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (digitos.length !== 8) {
      setStatus("idle");
      setMensagem("");
      return;
    }

    const idDestaConsulta = ++consultaAtualRef.current;
    setStatus("buscando");
    setMensagem("Buscando endereco...");

    timeoutRef.current = window.setTimeout(async () => {
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);

        if (idDestaConsulta !== consultaAtualRef.current) {
          return;
        }

        if (!resposta.ok) {
          throw new Error("Falha na consulta do CEP.");
        }

        const dados = await resposta.json();

        if (idDestaConsulta !== consultaAtualRef.current) {
          return;
        }

        if (dados?.erro) {
          setStatus("nao-encontrado");
          setMensagem("CEP nao encontrado. Preencha o endereco manualmente.");
          return;
        }

        setStatus("encontrado");
        setMensagem("");
        onEncontrado?.({
          rua: dados.logradouro || "",
          bairro: dados.bairro || "",
          cidade: dados.localidade || "",
          estado: dados.uf || ""
        });
      } catch {
        if (idDestaConsulta !== consultaAtualRef.current) {
          return;
        }

        setStatus("erro");
        setMensagem("Nao foi possivel consultar o CEP agora. Preencha o endereco manualmente.");
      }
    }, ATRASO_DEBOUNCE_MS);
  }

  return { status, mensagem, consultarCep };
}
