module.exports = {
  extends: 'airbnb-base',
  plugins: ['prettier'],
  env: {
    node: true,
  },
  rules: {
    'prettier/prettier': [0],
    'quote-props': [0],
    'prefer-destructuring': [
      'error',
      {
        array: false,
        object: true,
      },
    ],
    semi: [0],
    'global-require': [0],
    indent: [0],
    'no-tabs': 0,
    'no-console': [1],
    curly: [2, 'all'],
    'space-before-function-paren': 'off',
    'no-trailing-spaces': [0],
    'spaced-comment': [0],
    'max-len': [0],
    'new-cap': [0],
    'func-names': [0],
    'no-else-return': [0],
    'no-unused-vars': [2, { vars: 'all', args: 'none' }],
    'object-shorthand': [1],
    'no-bitwise': [1],
    'no-mixed-operators': [0],
    'no-plusplus': [1, { allowForLoopAfterthoughts: true }],
    'no-underscore-dangle': [0, { allowAfterThis: true }],
    'import/prefer-default-export': [0],
    'arrow-parens': [0],
    'function-paren-newline': [0],
  },
  overrides: [
    {
      files: ['**/*.js'],
      excludedFiles: '**/node_modules/**/*.js',
    },
  ],
}
