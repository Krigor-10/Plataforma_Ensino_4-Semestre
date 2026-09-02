import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist/**", "../wwwroot/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      // So as duas regras classicas de hooks (bug real e dependencia
      // esquecida) - o resto do pacote "recommended" do plugin v7 sao as
      // regras novas orientadas ao React Compiler (ex: set-state-in-effect),
      // que reprovariam padroes de useEffect ja usados em todo o projeto sem
      // isso ser um bug. Ligar essas regras exigiria uma decisao separada do
      // time, nao algo pra vir escondido dentro da config inicial do linter.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  }
];
