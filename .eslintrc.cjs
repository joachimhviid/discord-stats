const { readGitignoreFiles } = require('eslint-gitignore')

module.exports = {
  root: true,
  ignorePatterns: readGitignoreFiles({ cwd: __dirname }),
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': ['error'],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
  },
}
