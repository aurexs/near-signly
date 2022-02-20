/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript/recommended',
    '@vue/eslint-config-prettier',
  ],
  env: {
    'vue/setup-compiler-macros': true,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'prettier/prettier': [
      'warn',
      {
        singleQuote: true,
        semi: false,
        trailingComma: 'es5',
        printWidth: 120,
        arrowParens: 'always',
        endOfLine: 'lf',
      },
    ],
    // "import/no-unresolved": 0,
    'no-unused-vars': 0,
    // "no-unused-vars": ["warn", { "vars": "local", "args": "after-used", "caughtErrors": "none" }],
    'no-prototype-builtins': 0,
    // "no-useless-escape": 0,
    // 'no-control-regex': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    'no-implicit-any': 0,
  },
}
