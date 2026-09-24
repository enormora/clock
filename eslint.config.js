import { baseConfig } from '@enormora/eslint-config-base';
import { mochaNodeAssertConfig } from '@enormora/eslint-config-mocha-node-assert';
import { nodeConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: [ '**/CHANGELOG.md', 'coverage/**', 'target/**', 'mocha.config.json' ]
    },
    ...baseConfig,
    {
        files: [ '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,vue}' ],
        rules: {
            'import/no-unused-modules': [
                'error',
                {
                    unusedExports: true,
                    suppressMissingFileEnumeratorAPIWarning: true
                }
            ]
        }
    },
    {
        ...nodeConfig,
        files: [ '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,vue}' ]
    },
    {
        ...typescriptConfig,
        files: [ '**/*.ts' ],
        rules: {
            ...typescriptConfig.rules,
            'import/extensions': [
                'error',
                'always',
                {
                    ignorePackages: true
                }
            ]
        }
    },
    {
        ...mochaNodeAssertConfig,
        files: [ '**/*.test.ts' ],
        rules: {
            ...mochaNodeAssertConfig.rules,
            'sonarjs/no-empty-group': 'off',
            complexity: 'off',
            'mocha/no-global-tests': 'off',
            'mocha/no-mocha-arrows': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-magic-numbers': 'off',
            'enormora-typescript/no-this-expressions': 'off',
            'functional/no-this-expressions': 'off',
            'functional/prefer-immutable-types': 'off',
            'max-statements': 'off',
            'no-magic-numbers': 'off',
            'node/prefer-global/timers': 'off',
            'unicorn/no-this-outside-of-class': 'off'
        }
    },
    {
        files: [ 'source/clock.ts', 'source/temporal-clock.ts' ],
        rules: {
            'node/prefer-global/timers': 'off'
        }
    },
    {
        files: [ 'source/index.ts' ],
        rules: {
            'no-barrel-files/no-barrel-files': 'off'
        }
    },
    {
        files: [ 'package.json' ],
        rules: {
            'package-json/valid-repository': 'off'
        }
    },
    {
        files: [ '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,vue}' ],
        rules: {
            '@typescript-eslint/method-signature-style': 'off',
            '@typescript-eslint/no-unsafe-type-assertion': 'off',
            '@stylistic/operator-linebreak': 'off',
            'import/no-named-as-default': 'off',
            'import/no-named-as-default-member': 'off',
            'max-lines-per-function': [ 'error', { max: 50, skipBlankLines: true, skipComments: true } ]
        }
    },
    {
        files: [
            'source/clock.ts',
            'source/clock.test.ts',
            'source/temporal-clock.ts',
            'source/temporal-clock.test.ts'
        ],
        rules: {
            'unicorn/no-global-object-property-assignment': 'off',
            'unicorn/no-unnecessary-global-this': 'off'
        }
    },
    {
        files: [ 'eslint.config.js', 'mocha.config.json' ],
        rules: {
            '@cspell/spellchecker': 'off',
            'import/no-default-export': 'off'
        }
    },
    {
        files: [ '**/*.test.ts' ],
        rules: {
            'max-lines-per-function': 'off'
        }
    }
];
