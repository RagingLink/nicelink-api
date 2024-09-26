import tseslint from 'typescript-eslint';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import importPluginX from 'eslint-plugin-import-x';
import sortKeysPlugin from 'eslint-plugin-sort-keys-fix';

const stylisticRules = {
    '@stylistic/arrow-parens': ['error', 'always'],
    '@stylistic/arrow-spacing': 'error',
    '@stylistic/block-spacing': 'error',
    '@stylistic/brace-style': ['warn', '1tbs', {
        allowSingleLine: true
    }],
    '@stylistic/comma-dangle': 'warn',
    '@stylistic/comma-spacing': 'error',
    '@stylistic/comma-spacing': 'error',
    '@stylistic/eol-last': ['warn', 'always'],
    '@stylistic/indent': ['error', 4, {
        SwitchCase: 1
    }],
    '@stylistic/keyword-spacing': 'error',
    '@stylistic/lines-between-class-members': ['error', {
        enforce: [
            { blankLine: 'always', next: 'method', prev: 'field' },
            { blankLine: 'always', next: 'method', prev: 'method' },
            { blankLine: 'always', next: '*', prev: 'method' }
        ]
    }],
    '@stylistic/max-statements-per-line': ['error', {
        max: 1
    }],
    '@stylistic/no-mixed-spaces-and-tabs': 2,
    '@stylistic/no-multi-spaces': ['error'],
    '@stylistic/no-multiple-empty-lines': ['warn', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0
    }],
    '@stylistic/no-trailing-spaces': 'warn',
    '@stylistic/no-whitespace-before-property': 'error',
    '@stylistic/object-curly-spacing': ['error', 'always'],
    '@stylistic/one-var-declaration-per-line': ['error', 'always'],

    '@stylistic/operator-linebreak': ['error', 'after'],
    '@stylistic/quotes': ['error', 'single', {
        avoidEscape: false
    }],
    '@stylistic/semi': [2, 'always'],
    '@stylistic/semi-spacing': 'error',
    '@stylistic/space-in-parens': 'error',
    '@stylistic/space-infix-ops': 'error'
};

const typescriptRules = {
    '@typescript-eslint/class-literal-property-style': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true
    }],
    '@typescript-eslint/explicit-member-accessibility': 'error',

    '@typescript-eslint/no-floating-promises': 'error',

    '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowAny: false,
        allowNullableBoolean: false,
        allowNullableNumber: false,
        allowNullableObject: false,
        allowNullableString: false,
        allowNumber: false,
        allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true,
        allowString: false
    }]
};

const importRules = {
    'import-x/extensions': ['error', 'always', {
        ignorePackages: true
    }],
    'import-x/newline-after-import': 'warn',
    'import-x/order':
        [
            'error',
            {
                'distinctGroup': true,
                'groups':
                    [
                        'external',
                        'builtin',
                        'internal',
                        'sibling',
                        'parent',
                        'index'
                    ],
                'newlines-between': 'always'
            }
        ],
    'sort-imports': ['error', {
        'ignoreCase': true,
        'ignoreDeclarationSort': true
    }]
};

export default tseslint.config(
    { // Having this as a separate object is apparently needed to actually ignore the .js files AND IT DOESN"T MAKE SENSE!!!!!
        ignores: ['**/*.js', 'out/**/*.js', 'node_modules']
    },
    {
        files: ['src/**/*.ts', 'eslint.config.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            parser: tsParser,
            parserOptions: {
                project: './eslint.tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                warnOnUnsupportedTypeScriptVersion: false
            }
        },
        plugins: {
            '@stylistic': stylistic,
            '@stylistic/ts': stylisticTs,
            '@typescript-eslint': tseslintPlugin,
            'import-x': importPluginX
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...tseslint.configs['strictTypeChecked'].rules,
            ...tseslint.configs['stylisticTypeChecked'].rules,
            /**
             * * Stylistic rules
             */
            ...stylisticRules,
            /**
             * * Typescript rules
             */
            ...typescriptRules,
            /**
             * * Sort imports
             */
            ...importRules,
            'eqeqeq': 'error',
            'guard-for-in': 'warn',

            'no-alert': 'error',

            'no-console': 'error',
            'no-else-return': 'error',
            'no-global-assign': 'error',
            'no-iterator': 'error',
            'no-lone-blocks': 'warn',
            'no-lonely-if': 'error',
            'no-new-func': 'error',
            'no-proto': 'error',
            'no-sequences': 'error',
            //'no-unused-vars': 'off',
            'no-var': 'error',

            'one-var': ['error', 'never']

        }
    },
    {
        files: ['eslint.config.mjs'],
        plugins: {
            'sort-keys-fix': sortKeysPlugin
        },
        rules: {
            'sort-keys-fix/sort-keys-fix': 'error'
        }
    }
);
