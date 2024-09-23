//import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import importPluginX from 'eslint-plugin-import-x';

export default tseslint.config(
    {
        files: ['src/**/*.ts', 'eslint.config.mjs'],
        ignores: ['**/*.js', 'out/**/*.js', 'node_modules'],
        plugins: {
            '@typescript-eslint': tseslintPlugin,
            '@stylistic': stylistic,
            '@stylistic/ts': stylisticTs,
            'import-x': importPluginX
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './eslint.tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                warnOnUnsupportedTypeScriptVersion: false
            },
            ecmaVersion: 'latest'
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...tseslint.configs['strictTypeChecked'].rules,
            ...tseslint.configs['stylisticTypeChecked'].rules,
            '@stylistic/no-mixed-spaces-and-tabs': 2,
            '@stylistic/lines-between-class-members': ['error', 'always', {
                exceptAfterSingleLine: true,
                exceptAfterOverload: true
            }],

            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/operator-linebreak': ['error', 'after'],
            '@stylistic/no-multi-spaces': ['error'],
            '@stylistic/space-infix-ops': 'error',
            '@stylistic/arrow-spacing': 'error',
            '@stylistic/block-spacing': 'error',
            '@stylistic/arrow-parens': ['error', 'always'],
            // Sort imports and sort them into groups
            'import-x/order':
                [
                    'error',
                    {
                        'newlines-between': 'always',
                        'distinctGroup': true,
                        'groups':
                            [
                                'external',
                                'builtin',
                                'internal',
                                'sibling',
                                'parent',
                                'index'
                            ]
                    }
                ],
            'import-x/newline-after-import': 'warn',
            'import-x/extensions': ['error', 'always', {
                ignorePackages: true
            }],
            'sort-imports': ['error', {
                'ignoreCase': true,
                'ignoreDeclarationSort': true
            }],

            '@stylistic/brace-style': ['warn', '1tbs', {
                allowSingleLine: true
            }],

            '@stylistic/comma-dangle': 'warn',
            '@stylistic/comma-spacing': 'error',
            '@stylistic/eol-last': ['warn', 'always'],
            eqeqeq: 'error',
            'guard-for-in': 'warn',
            '@stylistic/indent': ['error', 4, {
                SwitchCase: 1
            }],

            '@stylistic/max-statements-per-line': ['error', {
                max: 1
            }],
            '@stylistic/space-in-parens': 'error',
            '@stylistic/comma-spacing': 'error',

            'no-alert': 'error',
            'no-console': 'error',
            'no-else-return': 'error',
            'no-global-assign': 'error',
            'no-iterator': 'error',
            'no-lone-blocks': 'warn',
            'no-lonely-if': 'error',

            '@stylistic/no-multiple-empty-lines': ['warn', {
                max: 1,
                maxEOF: 0,
                maxBOF: 0
            }],

            'no-new-func': 'error',
            'no-proto': 'error',
            'no-sequences': 'error',
            '@stylistic/no-trailing-spaces': 'warn',
            //'no-unused-vars': 'off',
            'no-var': 'error',
            'one-var': ['error', 'never'],
            '@stylistic/one-var-declaration-per-line': ['error', 'always'],

            '@stylistic/quotes': ['error', 'single', {
                avoidEscape: false
            }],

            '@stylistic/semi': [2, 'always'],
            '@stylistic/semi-spacing': 'error',
            '@stylistic/no-whitespace-before-property': 'error',
            '@stylistic/keyword-spacing': 'error',
            //Typescript
            '@typescript-eslint/explicit-member-accessibility': 'error',
            '@typescript-eslint/class-literal-property-style': 'error',
            '@typescript-eslint/return-await': 'error',

            '@typescript-eslint/explicit-function-return-type': ['error', {
                allowExpressions: true
            }],

            '@typescript-eslint/strict-boolean-expressions': ['error', {
                allowString: false,
                allowNumber: false,
                allowNullableObject: false,
                allowNullableBoolean: false,
                allowNullableString: false,
                allowNullableNumber: false,
                allowAny: false,
                allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true
            }],
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-floating-promises': 'error'
        }
    }
);
