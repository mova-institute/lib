module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'only-warn'],
  env: {
    node: true,
  },

  ignorePatterns: ['dist/**'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],

  parserOptions: {
    ecmaVersion: 2020,
    project: './tsconfig.json',
  },

  rules: {
    // turning off or tuning bad recommnendeds
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    // todo: remove after https://github.com/typescript-eslint/typescript-eslint/issues/3012
    '@typescript-eslint/no-unsafe-return': 'off',
    // todo: remove after https://github.com/typescript-eslint/typescript-eslint/issues/3012
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-misused-promises': [
      'warn',
      {
        checksVoidReturn: false,
      },
    ],

    '@typescript-eslint/array-type': ['warn', { default: 'generic' }],
    '@typescript-eslint/class-literal-property-style': ['warn'],
    '@typescript-eslint/consistent-indexed-object-style': ['warn'],
    '@typescript-eslint/consistent-type-assertions': [
      'off',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
    ],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    // '@typescript-eslint/consistent-type-imports': 'off',
    // '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': [
      'warn',
      { accessibility: 'no-public' },
    ],
    // '@typescript-eslint/member-delimiter-style': 'off',
    // '@typescript-eslint/member-ordering': ['warn'],  // todo
    // '@typescript-eslint/method-signature-style': ['warn'],  // todo
    // '@typescript-eslint/naming-convention': ['warn'],  // todo
    '@typescript-eslint/no-base-to-string': ['warn'],
    // '@typescript-eslint/no-confusing-non-null-assertion': 'off',
    // '@typescript-eslint/no-confusing-void-expression': ['warn'],  // todo
    '@typescript-eslint/no-dynamic-delete': ['warn'],
    '@typescript-eslint/no-extraneous-class': ['warn'],
    // https://github.com/microsoft/TypeScript/issues/35799
    // '@typescript-eslint/no-implicit-any-catch': ['warn'],
    '@typescript-eslint/no-invalid-void-type': ['warn'],
    // '@typescript-eslint/no-parameter-properties': 'off',
    // '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-require-imports': ['warn'],
    // '@typescript-eslint/no-type-alias': 'off',
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['warn'],
    '@typescript-eslint/no-unnecessary-condition': [
      'warn',
      { allowConstantLoopConditions: true },
    ],
    '@typescript-eslint/no-unnecessary-qualifier': ['warn'],
    '@typescript-eslint/no-unnecessary-type-arguments': ['warn'],
    '@typescript-eslint/no-unnecessary-type-constraint': ['warn'],
    '@typescript-eslint/non-nullable-type-assertion-style': ['warn'], // doesn’t work, todo
    // '@typescript-eslint/prefer-enum-initializers': 'off',
    '@typescript-eslint/prefer-for-of': ['warn'],
    '@typescript-eslint/prefer-function-type': ['warn'], // experiment
    '@typescript-eslint/prefer-includes': ['warn'],
    '@typescript-eslint/prefer-literal-enum-member': ['warn'],
    // '@typescript-eslint/prefer-nullish-coalescing': ['warn'],
    '@typescript-eslint/prefer-optional-chain': ['warn'],
    // '@typescript-eslint/prefer-readonly': ['warn'],  // todo: try
    // '@typescript-eslint/prefer-readonly-parameter-types': ['warn'], // todo: consider
    '@typescript-eslint/prefer-reduce-type-parameter': ['warn'],
    '@typescript-eslint/prefer-string-starts-ends-with': ['warn'],
    // '@typescript-eslint/prefer-ts-expect-error': 'off',
    // '@typescript-eslint/promise-function-async': ['warn'],  // todo: reconsider
    // '@typescript-eslint/require-array-sort-compare': 'off',
    // '@typescript-eslint/sort-type-union-intersection-members': 'off',
    // '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/switch-exhaustiveness-check': ['warn'],
    // '@typescript-eslint/type-annotation-spacing': 'off',
    // '@typescript-eslint/typedef': 'off',
    '@typescript-eslint/unified-signatures': ['warn'],

    // '@typescript-eslint/dot-notation': ['warn'],
    // '@typescript-eslint/init-declarations': ['warn'], // todo
    '@typescript-eslint/no-invalid-this': ['warn'],
    '@typescript-eslint/no-loop-func': ['warn'],
    '@typescript-eslint/no-loss-of-precision': ['warn'],
    '@typescript-eslint/no-shadow': ['warn'],
    '@typescript-eslint/return-await': ['warn'],

    // eslint
    // override
    'no-fallthrough': [
      'warn',
      { commentPattern: 'break[\\s\\w]*omitted|no\\s*break' },
    ],

    'no-restricted-imports': ['warn', { paths: ['lodash', 'date-fns'] }],

    'no-promise-executor-return': ['warn'],
    'no-unreachable-loop': ['warn'],
    'no-unsafe-optional-chaining': ['warn'],
    'no-useless-backreference': ['warn'],
    // NB: many false positives https://github.com/eslint/eslint/issues/11899
    'require-atomic-updates': ['error'],
    // todo: continue from here: https://eslint.org/docs/rules/#best-practices

    'array-callback-return': ['warn'],
    'block-scoped-var': ['warn'],
    'class-methods-use-this': ['warn'],
    // 'consistent-return': ['warn'],
    'default-case': ['warn'],
    'default-case-last': ['warn'],
    eqeqeq: ['warn'],
    'grouped-accessor-pairs': ['warn'],
    'no-caller': ['warn'],
    'no-constructor-return': ['warn'],
    'no-else-return': ['warn'],
    'no-eq-null': ['warn'],
    'no-eval': ['warn'],
    'no-extra-bind': ['warn'],
    'no-extra-label': ['warn'],
    'no-implicit-coercion': ['warn'],
    'no-implicit-globals': ['warn'],
    'no-implied-eval': ['warn'],
    'no-iterator': ['warn'],
    'no-new-func': ['warn'],
    'no-new-wrappers': ['warn'],
    'no-nonoctal-decimal-escape': ['warn'],
    'no-proto': ['warn'],
    'no-return-assign': ['warn'],
    'no-return-await': ['warn'],
    'no-self-compare': ['warn'],
    'no-sequences': ['warn'],
    'no-throw-literal': ['warn'],
    'no-unmodified-loop-condition': ['warn'],
    'no-unused-expressions': ['warn'],
    'no-useless-call': ['warn'],
    'no-useless-return': ['warn'],
    // 'prefer-named-capture-group': ['warn'],
    'prefer-promise-reject-errors': ['warn'],
    'require-unicode-regexp': 'off',

    camelcase: ['warn', { ignoreDestructuring: true, ignoreImports: true }],
    // camelcase: 'off', // ~
    'func-style': ['warn', 'declaration', { allowArrowFunctions: true }],
    'new-cap': ['warn', { capIsNewExceptions: ['express.Router'] }],
    'new-parens': ['warn'],
    // 'no-array-constructor': ['warn'],
    'no-multi-assign': ['warn'],
    'no-negated-condition': ['warn'],
    'no-nested-ternary': ['warn'],
    'no-new-object': ['warn'],
    'no-unneeded-ternary': ['warn'],
    'no-useless-catch': 'off', // todo: turn on for grooming phases
    // 'one-var': 'off',
    'one-var-declaration-per-line': ['warn'],
    'operator-assignment': ['warn', 'always'],
    'prefer-exponentiation-operator': ['warn'],
    'prefer-object-spread': ['warn'],

    'no-confusing-arrow': ['warn'],
    'no-useless-computed-key': ['warn'],
    'no-useless-rename': ['warn'],
    'no-var': ['warn'],
    'object-shorthand': ['warn', 'always'],
    'prefer-arrow-callback': ['warn'],
    // https://www.toomanybees.com/storytime/es6-const-was-a-mistake
    // https://jamie.build/const
    'prefer-const': 'off',
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: {
          array: false,
          object: true,
        },
      },
    ],
    'prefer-numeric-literals': ['warn'],
    'prefer-rest-params': ['warn'],
    'prefer-spread': ['warn'],
    'prefer-template': ['off'],
    'symbol-description': ['warn'],

    // todo: remove :unknown from catches after https://github.com/microsoft/TypeScript/pull/41013
  },
}
