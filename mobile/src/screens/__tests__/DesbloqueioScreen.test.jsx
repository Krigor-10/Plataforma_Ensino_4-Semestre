import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as LocalAuthentication from "expo-local-authentication";
import DesbloqueioScreen from "../DesbloqueioScreen.jsx";
import { apiRequest } from "../../lib/api.js";

jest.mock("expo-local-authentication", () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn()
}));

jest.mock("../../lib/api.js", () => ({ apiRequest: jest.fn() }));

const USUARIO = { nome: "Ana Souza", email: "ana@teste.local", tipoUsuario: "Aluno" };

async function renderizar() {
  const onDesbloqueado = jest.fn();
  const onSair = jest.fn();
  await render(<DesbloqueioScreen onDesbloqueado={onDesbloqueado} onSair={onSair} usuario={USUARIO} />);
  return { onDesbloqueado, onSair };
}

// Pacote 9 da auditoria de 26/11 (H1, H2).
describe("DesbloqueioScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("com trava no celular, pede a biometria sozinha e desbloqueia", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
    const { onDesbloqueado } = await renderizar();

    await waitFor(() => expect(onDesbloqueado).toHaveBeenCalledWith());
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false, cancelLabel: "Usar senha da conta" })
    );
  });

  test("cancelar a biometria leva para a senha da conta, que confirma pelo login", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" });
    apiRequest.mockResolvedValue({ token: "t2", refreshToken: "r2", usuario: USUARIO });
    const { onDesbloqueado } = await renderizar();

    const campo = await screen.findByLabelText("Senha da conta");
    await fireEvent.changeText(campo, "segredo");
    await fireEvent.press(screen.getByText("Desbloquear"));

    await waitFor(() =>
      expect(onDesbloqueado).toHaveBeenCalledWith({ token: "t2", refreshToken: "r2", user: USUARIO })
    );
    expect(apiRequest).toHaveBeenCalledWith("/Auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ana@teste.local", senha: "segredo" })
    });
    expect(screen.getByText("Usar biometria ou PIN do celular")).toBeTruthy();
  });

  test("celular sem biometria nem PIN vai direto para a senha e explica o motivo", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
    await renderizar();

    expect(await screen.findByText(/não tem biometria nem PIN configurados/)).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText("Usar biometria ou PIN do celular")).toBeNull();
  });

  test("senha errada mostra o erro e nao desbloqueia", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
    apiRequest.mockRejectedValue(new Error("E-mail ou senha inválidos."));
    const { onDesbloqueado } = await renderizar();

    await fireEvent.changeText(await screen.findByLabelText("Senha da conta"), "errada");
    await fireEvent.press(screen.getByText("Desbloquear"));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeTruthy();
    expect(onDesbloqueado).not.toHaveBeenCalled();
  });

  test("'Sair da conta' chama o logout", async () => {
    LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
    const { onSair } = await renderizar();

    await fireEvent.press(await screen.findByText("Sair da conta"));

    expect(onSair).toHaveBeenCalled();
  });
});
