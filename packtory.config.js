// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const packageRoots = {
    main: {
        js: 'index.js',
        declarationFile: 'index.d.ts'
    },
    clock: {
        js: 'clock.entry-point.js',
        declarationFile: 'clock.entry-point.d.ts'
    },
    temporalClock: {
        js: 'temporal-clock.entry-point.js',
        declarationFile: 'temporal-clock.entry-point.d.ts'
    },
    deterministicClock: {
        js: 'deterministic-clock.js',
        declarationFile: 'deterministic-clock.d.ts'
    }
};

const packageInterface = {
    modules: [
        { root: 'main', export: '.' },
        { root: 'clock', export: './clock' },
        { root: 'temporalClock', export: './temporal-clock' },
        { root: 'deterministicClock', export: './deterministic-clock' }
    ]
};

function createReleasePullRequestSettings() {
    return {
        branch: 'release/clock',
        // eslint-disable-next-line @cspell/spellchecker -- Preserve the package scope in the PR body.
        body: 'Updates CHANGELOG.md for the next @enormora/clock release.',
        githubActionsCi: {
            trigger: 'workflow-dispatch',
            workflowFile: 'continuous-integration.yml',
            requiredStatusContexts: [
                'Tests with Node.js v24',
                'Tests with Node.js v26',
                'Release PR policy',
                'Workflow security analysis'
            ]
        },
        label: 'release',
        title: 'Prepare release'
    };
}

export function resolveRegistrySettingsForEnvironment(environmentVariables) {
    const npmToken = environmentVariables.NPM_TOKEN;

    if (npmToken !== undefined && npmToken !== '') {
        return {
            auth: {
                type: 'bearer-token',
                token: npmToken
            }
        };
    }

    if (environmentVariables.GITHUB_ACTIONS === 'true') {
        return {
            auth: {
                type: 'npm-oidc',
                provider: 'github-actions'
            }
        };
    }

    return undefined;
}

export function resolvePublishSettingsForEnvironment(environmentVariables) {
    return {
        access: 'public',
        ...environmentVariables.GITHUB_ACTIONS === 'true' ? { provenance: { type: 'auto' } } : {}
    };
}

export async function buildConfig() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);
    // eslint-disable-next-line node/no-process-env -- Packtory config maps publish auth and provenance from process env.
    const environmentVariables = process.env;
    const registrySettings = resolveRegistrySettingsForEnvironment(environmentVariables);
    const publishSettings = resolvePublishSettingsForEnvironment(environmentVariables);

    return {
        ...registrySettings === undefined ? {} : { registrySettings },
        changelog: {
            packageTagFormat: '{packageName}@{version}',
            prLog: { ignoredLabels: [ 'release' ] },
            outputs: [ { kind: 'repository-file', path: 'CHANGELOG.md' }, { kind: 'github-release' } ]
        },
        releasePullRequest: createReleasePullRequestSettings(),
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
            publishSettings,
            additionalPackageJsonAttributes: {
                author: packageJson.author,
                license: packageJson.license,
                repository: packageJson.repository,
                engines: packageJson.engines
            },
            additionalFiles: [
                {
                    inputFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                },
                {
                    inputFilePath: path.join(projectFolder, 'README.md'),
                    targetFilePath: 'README.md'
                }
            ]
        },
        packages: [
            {
                name: packageJson.name,
                additionalPackageJsonAttributes: {
                    description: 'Explicit time and timer access for TypeScript applications'
                },
                roots: packageRoots,
                packageInterface
            }
        ]
    };
}
