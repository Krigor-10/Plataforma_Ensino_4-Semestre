import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import CampoSenha from "./CampoSenha.jsx";

function renderDentroDeFormulario(onSubmit) {
  render(
    <form onSubmit={onSubmit}>
      <label htmlFor="senha">Senha</label>
      <CampoSenha id="senha" name="senha" value="segredo123" onChange={() => {}} />
    </form>
  );
}

describe("CampoSenha", () => {
  test("comeca oculto e alterna type/aria-label/aria-pressed ao clicar no olho", async () => {
    const usuario = userEvent.setup();
    renderDentroDeFormulario((event) => event.preventDefault());

    const entrada = screen.getByLabelText("Senha");
    expect(entrada).toHaveAttribute("type", "password");

    const botaoOlho = screen.getByRole("button", { name: "Mostrar senha" });
    expect(botaoOlho).toHaveAttribute("aria-pressed", "false");

    await usuario.click(botaoOlho);

    expect(entrada).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute("aria-pressed", "true");

    await usuario.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(entrada).toHaveAttribute("type", "password");
  });

  test("botao do olho tem type=button e nao envia o formulario", async () => {
    const usuario = userEvent.setup();
    const aoEnviar = vi.fn((event) => event.preventDefault());
    renderDentroDeFormulario(aoEnviar);

    const botaoOlho = screen.getByRole("button", { name: "Mostrar senha" });
    expect(botaoOlho).toHaveAttribute("type", "button");

    await usuario.click(botaoOlho);

    expect(aoEnviar).not.toHaveBeenCalled();
  });

  test("ao enviar o formulario, a senha volta a ficar oculta", async () => {
    const usuario = userEvent.setup();
    renderDentroDeFormulario((event) => event.preventDefault());

    const entrada = screen.getByLabelText("Senha");
    await usuario.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(entrada).toHaveAttribute("type", "text");

    const botaoEnviar = document.createElement("button");
    botaoEnviar.type = "submit";
    entrada.closest("form").appendChild(botaoEnviar);
    await usuario.click(botaoEnviar);

    expect(entrada).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeInTheDocument();
  });
});
