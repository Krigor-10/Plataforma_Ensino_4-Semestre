// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const { FlatCompat } = require('@eslint/eslintrc');
const globals = require('globals');
const expoConfig = require("eslint-config-expo/flat");

// eslint-plugin-react-native-a11y so publica config no formato legado
// (nao suporta flat config nativamente, ultima versao so declara peer dep
// ate ESLint 8) — FlatCompat converte o preset "basic" pro formato novo.
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = defineConfig([
  expoConfig,
  ...compat.config(require("eslint-plugin-react-native-a11y").configs.basic),
  {
    files: ["**/__tests__/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: globals.jest
    }
  },
  {
    ignores: ["dist/*"],
  }
]);
