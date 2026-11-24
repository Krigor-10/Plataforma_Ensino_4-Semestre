jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve())
}));

describe("lib/haptics", () => {
  let haptics;
  let Haptics;

  beforeEach(() => {
    jest.clearAllMocks();
    haptics = require("../haptics.js");
    Haptics = require("expo-haptics");
  });

  it("hapticSelecao chama Haptics.selectionAsync", () => {
    haptics.hapticSelecao();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("hapticToqueLeve chama Haptics.impactAsync com o estilo Light", () => {
    haptics.hapticToqueLeve();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it("hapticSucesso chama Haptics.notificationAsync com o tipo Success", () => {
    haptics.hapticSucesso();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it("hapticErro chama Haptics.notificationAsync com o tipo Error", () => {
    haptics.hapticErro();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it("uma rejeicao do modulo nativo nunca propaga (web/aparelho sem motor de vibracao)", async () => {
    Haptics.selectionAsync.mockReturnValueOnce(Promise.reject(new Error("not available")));

    expect(() => haptics.hapticSelecao()).not.toThrow();
  });
});
