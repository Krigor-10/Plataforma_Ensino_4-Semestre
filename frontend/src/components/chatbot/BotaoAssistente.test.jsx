import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import BotaoAssistente from "./BotaoAssistente.jsx";

describe("BotaoAssistente", () => {
  test("fechado: aria-label de abrir e chama onClick", async () => {
    const onClick = vi.fn();
    render(<BotaoAssistente aberto={false} onClick={onClick} />);

    const botao = screen.getByRole("button", { name: "Abrir Assistente CodeRyse" });
    expect(botao).toHaveAttribute("aria-expanded", "false");

    await userEvent.setup().click(botao);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("aberto: troca pro aria-label de fechar", () => {
    render(<BotaoAssistente aberto onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fechar Assistente CodeRyse" })).toHaveAttribute("aria-expanded", "true");
  });
});
