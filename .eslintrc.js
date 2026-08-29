module.exports = {
  root: true,

  extends: ['eslint:recommended', 'airbnb-base'],

  env: {
    browser: true,
    es6: true,
  },

  globals: {
    DEV: true,
  },

  parser: 'babel-eslint',

  parserOptions: {
    sourceType: 'module',
  },

  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },

  rules: {
    'class-methods-use-this': ['off'],
    'comma-dangle': ['error', 'always-multiline'],
    'consistent-return': ['off'],
    'import/extensions': 0,
    // named exports throughout, even for single-export files (matches every
    // other module in this project - COMPONENTS, RECIPES, etc. are all
    // named, not default)
    'import/prefer-default-export': 'off',

    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['postcss.config.js'],
      },
    ],

    'max-len': ['off', { code: 120 }],
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'no-param-reassign': ['off', { props: false }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-return-assign': ['off'],
    'no-unused-expressions': 'off',
    'no-use-before-define': ['error', { functions: false }],
    'object-curly-newline': ['error', { consistent: true }],
    'operator-linebreak': ['error', 'after'],
    'prefer-const': ['error', { destructuring: 'all' }],

    'padding-line-between-statements': [
      'error',

      // newline-before-return
      { blankLine: 'always', prev: '*', next: 'return' },

      // newline-after-var
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      {
        blankLine: 'any',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var'],
      },
    ],

    'quote-props': ['error', 'consistent-as-needed'],
    semi: ['error', 'never'],
  },

  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        // TypeScript already catches undefined identifiers and unused vars;
        // the base JS rules don't understand TS-only syntax (types, interfaces).
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
      },
    },
  ],
}
