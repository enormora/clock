// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const packageRoots = {
    main: {
        javaScript: 'index.js',
        declarationFile: 'index.d.ts'
    },
    clock: {
        javaScript: 'clock.entry-point.js',
        declarationFile: 'clock.entry-point.d.ts'
    },
    temporalClock: {
        javaScript: 'temporal-clock.entry-point.js',
        declarationFile: 'temporal-clock.entry-point.d.ts'
    },
    deterministicClock: {
        javaScript: 'deterministic-clock.js',
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
        githubActionsContinuousIntegration: {
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
            authentication: {
                type: 'bearer-token',
                token: npmToken
            }
        };
    }

    if (environmentVariables.GITHUB_ACTIONS === 'true') {
        return {
            authentication: {
                type: 'npm-open-identity-connect',
                provider: 'github-actions'
            }
        };
    }

    return undefined;
}

/**
@returns {NonNullable<import('@packtory/cli').PacktoryConfiguration['changelog']>}
*/
function createChangelogSettings() {
    return {
        packageTagFormat: '{packageName}@{version}',
        pullRequestLog: {
            ignoredLabels: [ 'release' ],
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update dependency (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: '$<prefix>Update dependency $<dependency> from $<from> to $<to>'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update (?:dependency )?`?(?<dependency>.+?)`? to `?(?<to>[^` ]+)`?$',
                    replace: '$<prefix>Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?(?<dependency>Lock file maintenance|Update (?:.+ dependencies|eslint))$',
                    replace: '$<prefix>$<dependency>',
                    collapse: 'same'
                }
            ]
        },
        outputs: [ { kind: 'repository-file', path: 'CHANGELOG.md' }, { kind: 'github-release' } ]
    };
}

const checks = {
    noDevelopmentDependencyImports: { enabled: true },
    noUnusedBundleDependencies: { enabled: true },
    uniqueTargetPaths: { enabled: true },
    noUnexposedExecutables: { enabled: true },
    nodeEngineCompatibility: { enabled: true },
    noDuplicatedFiles: { enabled: true },
    requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
    typeScriptIntegrity: { enabled: true, declarations: 'all' },
    noSideEffects: { enabled: true }
};

export function resolvePublishSettingsForEnvironment(environmentVariables) {
    return {
        access: 'public',
        ...environmentVariables.GITHUB_ACTIONS === 'true' ? { provenance: { type: 'automatic' } } : {}
    };
}

export async function buildConfiguration() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);
    // eslint-disable-next-line node/no-process-env -- Packtory config maps publish auth and provenance from process env.
    const environmentVariables = process.env;
    const registrySettings = resolveRegistrySettingsForEnvironment(environmentVariables);
    const publishSettings = resolvePublishSettingsForEnvironment(environmentVariables);

    return {
        ...registrySettings === undefined ? {} : { registrySettings },
        changelog: createChangelogSettings(),
        releasePullRequest: createReleasePullRequestSettings(),
        commonPackageSettings: {
            sourcesFolder,
            mainPackageManifest: packageJson,
            includeSourceMapFiles: true,
            publishSettings,
            additionalPackageManifestAttributes: {
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
                additionalPackageManifestAttributes: {
                    description: 'Explicit time and timer access for TypeScript applications'
                },
                roots: packageRoots,
                packageInterface
            }
        ],
        checks
    };
}
