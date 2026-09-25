export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

compile:
    tsc --build

eslint *OPTIONS:
    eslint . --cache --cache-location "./target/eslintcache" --cache-strategy content --max-warnings 0 {{OPTIONS}}

eslint-fix: (eslint '--fix')

lint: eslint

lint-fix: eslint-fix

test-unit:
    mocha --config mocha.config.json

test-unit-coverage:
    c8 just test-unit

test: lint test-unit-coverage packtory-dry-run

packtory-dry-run: compile
    packtory publish

release-plan: compile
    packtory release

release-diff: compile
    packtory release-diff

changelog: compile
    packtory changelog

prepare-release: compile
    packtory release-pr maintain --no-dry-run

validate-release-pr:
    packtory release-pr validate

authorize-release-publish *OPTIONS:
    packtory release-pr authorize-publish {{OPTIONS}}

publish-release: compile
    packtory release --publish --tag --push --github-release --no-dry-run
