// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettierConfig from 'eslint-config-prettier'

export default withNuxt(prettierConfig, {
  // Vendored skill code (installed by ui-ux-pro-max-cli, ADR-009) and generated
  // graph output. Not ours to lint — edits here are lost on the next reinstall.
  ignores: ['.claude/**', '.agents/**', 'design-system/**', 'graphify-out/**']
})
