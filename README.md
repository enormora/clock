# @enormora/clock

Explicit time and timer access for TypeScript applications.

`@enormora/clock` provides a small dependency-injection boundary around time-related side effects:

- reading wall time as `Date`, Unix epoch milliseconds, or Unix epoch microseconds
- reading monotonic time and its Unix epoch origin
- scheduling and clearing timeouts
- scheduling and clearing intervals
- replacing real time with a deterministic clock in tests

It is not a date-time utility library or a general scheduler framework. The package keeps time access explicit so
application code does not need to call `Date.now()`, `new Date()`, `performance.now()`, `setTimeout`, or `setInterval`
directly.

## Installation

```sh
npm install @enormora/clock
```

The package is ESM-only and requires Node.js `^24.15.0 || ^26.0.0`.

The root export keeps all clocks available from one import. Prefer explicit module subpaths when code only needs one
clock:

- `@enormora/clock/clock`
- `@enormora/clock/temporal-clock`
- `@enormora/clock/deterministic-clock`

## Real Clock

Use `createClock()` at the application boundary and pass the resulting `Clock` into code that needs time.

```ts
import { createClock } from '@enormora/clock/clock';

const clock = createClock();

console.log(clock.currentUnixEpochMilliseconds);
console.log(clock.currentUnixEpochMicroseconds);
console.log(clock.currentDate.toISOString());
```

The real clock delegates to the runtime:

- `currentDate` returns a new `Date`
- `currentUnixEpochMilliseconds` uses `Date.now()`
- `currentUnixEpochMicroseconds` uses `Date.now() * 1000n`
- `monotonicTimeOriginUnixEpochMicroseconds` uses `performance.timeOrigin`
- `currentMonotonicMicroseconds` uses `performance.now()`
- timer functions call `globalThis`

`currentUnixEpochMicroseconds` communicates the unit, not a guaranteed resolution. Date-backed clocks expose
millisecond-resolution wall time in microseconds.

## Temporal Clock

Use `createTemporalClock()` when the runtime provides `Temporal`.

```ts
import { createTemporalClock } from '@enormora/clock/temporal-clock';

const clock = createTemporalClock();

console.log(clock.currentUnixEpochMicroseconds);
```

The Temporal clock implements the same `Clock` interface. It uses `Temporal.Now.instant()` for wall time and
`performance` for monotonic time. Importing the module works without Temporal, but calling `createTemporalClock()`
throws when `globalThis.Temporal` is unavailable.

## Dependency Injection

Prefer accepting a `Clock` as an explicit dependency for code that depends on time.

```ts
import type { Clock } from '@enormora/clock/clock';

type Session = {
    readonly expiresAtUnixEpochMilliseconds: number;
};

export function isSessionExpired(clock: Clock, session: Session): boolean {
    return clock.currentUnixEpochMilliseconds >= session.expiresAtUnixEpochMilliseconds;
}
```

Use wall time for calendar time, storage, and user-facing timestamps. Use monotonic values for elapsed time and
durations.

## Deterministic Clock

Use `createDeterministicClock()` in tests or deterministic environments.

```ts
import { createDeterministicClock } from '@enormora/clock/deterministic-clock';

const clock = createDeterministicClock({
    initialUnixEpochMicroseconds: 1_704_067_200_000_000n
});

console.log(clock.currentDate.toISOString());

clock.advanceByMilliseconds(1000);

console.log(clock.currentUnixEpochMilliseconds);
```

The deterministic clock implements the same `Clock` interface and adds:

- `setCurrentUnixEpochMicroseconds(nextUnixEpochMicroseconds)`
- `advanceByMicroseconds(delayInMicroseconds)`
- `advanceByMilliseconds(delayInMilliseconds)`

Wall time and monotonic time are stored in microseconds. Timers are scheduled against monotonic time, so setting wall
time does not run or delay timers.

## Testing Timers

The deterministic clock runs scheduled callbacks when monotonic time is advanced far enough.

```ts
import assert from 'node:assert';
import { createDeterministicClock } from '@enormora/clock/deterministic-clock';

const clock = createDeterministicClock({
    initialUnixEpochMicroseconds: 0n
});
const calls: string[] = [];

clock.setTimeout(
    (value) => {
        calls.push(value);
    },
    100,
    'done'
);

clock.advanceByMilliseconds(99);
assert.deepStrictEqual(calls, []);

clock.advanceByMilliseconds(1);
assert.deepStrictEqual(calls, [ 'done' ]);
```

Intervals run once for each elapsed interval.

```ts
import assert from 'node:assert';
import { createDeterministicClock } from '@enormora/clock/deterministic-clock';

const clock = createDeterministicClock({
    initialUnixEpochMicroseconds: 0n
});
let count = 0;

const intervalIdentifier = clock.setInterval(() => {
    count += 1;
}, 100);

clock.advanceByMilliseconds(250);
assert.strictEqual(count, 2);

clock.clearInterval(intervalIdentifier);
clock.advanceByMilliseconds(500);
assert.strictEqual(count, 2);
```

## Timer Behavior

Timeouts:

- execute once
- execute only after the clock reaches their scheduled monotonic time
- execute in scheduled monotonic time order
- execute in registration order when multiple timeouts share the same scheduled time
- can use a delay of `0`
- reject negative and non-finite delays

Intervals:

- execute repeatedly
- execute once per elapsed interval when time advances
- stop after `clearInterval`
- reject `0`, negative, non-finite, and sub-microsecond delays

The deterministic clock rejects intervals that would round down to zero microseconds because they cannot advance safely.

## API

```ts
declare const timeoutIdentifierBrand: unique symbol;
declare const intervalIdentifierBrand: unique symbol;

export type TimeoutIdentifier = {
    readonly [timeoutIdentifierBrand]: 'TimeoutIdentifier';
};

export type IntervalIdentifier = {
    readonly [intervalIdentifierBrand]: 'IntervalIdentifier';
};

export type Clock = {
    readonly currentDate: Date;
    readonly currentUnixEpochMilliseconds: number;
    readonly currentUnixEpochMicroseconds: bigint;
    readonly monotonicTimeOriginUnixEpochMicroseconds: bigint;
    readonly currentMonotonicMicroseconds: bigint;
    readonly setTimeout: <HandlerArguments extends readonly unknown[]>(
        handler: (...handlerArguments: HandlerArguments) => void,
        delayInMilliseconds: number,
        ...handlerArguments: HandlerArguments
    ) => TimeoutIdentifier;
    readonly clearTimeout: (timeoutIdentifier: TimeoutIdentifier) => void;
    readonly setInterval: <HandlerArguments extends readonly unknown[]>(
        handler: (...handlerArguments: HandlerArguments) => void,
        delayInMilliseconds: number,
        ...handlerArguments: HandlerArguments
    ) => IntervalIdentifier;
    readonly clearInterval: (intervalIdentifier: IntervalIdentifier) => void;
};
```

```ts
export type DeterministicClock = Clock & {
    readonly setCurrentUnixEpochMicroseconds: (nextUnixEpochMicroseconds: bigint) => void;
    readonly advanceByMicroseconds: (delayInMicroseconds: bigint) => void;
    readonly advanceByMilliseconds: (delayInMilliseconds: number) => void;
};
```

```ts
export function createClock(): Clock;
```

```ts
export function createTemporalClock(): Clock;
```

```ts
export function createDeterministicClock(options: {
    readonly initialUnixEpochMicroseconds: bigint;
}): DeterministicClock;
```

## Development

Install dependencies:

```sh
npm clean-install
```

Compile:

```sh
just compile
```

Run lint checks:

```sh
just lint
```

Run tests:

```sh
just test
```

Run a Packtory dry-run:

```sh
just packtory-dry-run
```

## Publishing

Pull requests that should appear in the changelog need exactly one changelog label. Supported labels:

- `breaking`
- `bug`
- `feature`
- `enhancement`
- `documentation`
- `upgrade`
- `refactor`
- `build`

The package is released through a release pull request:

1. Go to GitHub Actions -> Release -> Run workflow.
2. The workflow creates or updates a `Prepare release` pull request with the generated `CHANGELOG.md` changes.
3. Review and merge the release pull request through the normal merge queue.
4. After the release pull request is merged, the publish workflow publishes to npm, pushes the package tag, and creates
   the GitHub Release.

The dry-run command validates the package shape without publishing.

```sh
just packtory-dry-run
```

Inspect the next release plan:

```sh
just release-plan
```
