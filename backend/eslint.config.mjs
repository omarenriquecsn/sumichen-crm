import tseslint from 'typescript-eslint';

// Configuración flat (ESLint 9) para el backend.
// Punto 7: se añadió lint al backend. Reglas relajadas porque el código
// es legacy (sin lint previo); el objetivo es un gate básico que pase.
export default tseslint.config(
  {
    ignores: [
      'build/**',
      'node_modules/**',
      'exports/**',
      'uploads/**',
      'temp/**',
      'eslint.config.mjs',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
);