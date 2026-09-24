import assert from 'node:assert';
import timers from 'node:timers/promises';
import { suite, test } from 'mocha';

import { createClock } from './clock.ts';

suite('clock', () => {
    test('returns the current Unix epoch timestamp in milliseconds', function () {
        const lowerTimestampBound = Date.now();
        const clock = createClock();

        const actualCurrentUnixEpochMilliseconds = clock.currentUnixEpochMilliseconds;

        const upperTimestampBound = Date.now();
        assert.strictEqual(typeof actualCurrentUnixEpochMilliseconds, 'number');
        assert.strictEqual(actualCurrentUnixEpochMilliseconds >= lowerTimestampBound, true);
        assert.strictEqual(actualCurrentUnixEpochMilliseconds <= upperTimestampBound, true);
    });

    test('returns the current Unix epoch timestamp in microseconds', function () {
        const lowerTimestampBound = BigInt(Date.now()) * 1000n;
        const clock = createClock();

        const actualCurrentUnixEpochMicroseconds = clock.currentUnixEpochMicroseconds;

        const upperTimestampBound = BigInt(Date.now()) * 1000n;
        assert.strictEqual(typeof actualCurrentUnixEpochMicroseconds, 'bigint');
        assert.strictEqual(actualCurrentUnixEpochMicroseconds >= lowerTimestampBound, true);
        assert.strictEqual(actualCurrentUnixEpochMicroseconds <= upperTimestampBound, true);
        assert.strictEqual(actualCurrentUnixEpochMicroseconds % 1000n, 0n);
    });

    test('returns a new current date instance', async function () {
        const clock = createClock();

        const firstCurrentDate = clock.currentDate;
        await timers.setTimeout(1);
        const secondCurrentDate = clock.currentDate;

        assert.notStrictEqual(firstCurrentDate, secondCurrentDate);
        assert.strictEqual(secondCurrentDate.getTime() >= firstCurrentDate.getTime(), true);
    });

    test('returns monotonic time origin in Unix epoch microseconds', function () {
        const clock = createClock();
        const expectedTimeOrigin = BigInt(Math.floor(globalThis.performance.timeOrigin * 1000));

        assert.strictEqual(clock.monotonicTimeOriginUnixEpochMicroseconds, expectedTimeOrigin);
    });

    test('returns current monotonic time in microseconds', function () {
        const lowerTimestampBound = BigInt(Math.floor(globalThis.performance.now() * 1000));
        const clock = createClock();

        const actualCurrentMonotonicMicroseconds = clock.currentMonotonicMicroseconds;

        const upperTimestampBound = BigInt(Math.floor(globalThis.performance.now() * 1000));
        assert.strictEqual(typeof actualCurrentMonotonicMicroseconds, 'bigint');
        assert.strictEqual(actualCurrentMonotonicMicroseconds >= lowerTimestampBound, true);
        assert.strictEqual(actualCurrentMonotonicMicroseconds <= upperTimestampBound, true);
    });

    test('binds setTimeout to globalThis', () => {
        const originalSetTimeout = globalThis.setTimeout;
        const timeoutIdentifier = 123 as unknown as ReturnType<typeof globalThis.setTimeout>;
        const invocationContexts: unknown[] = [];

        function setTimeoutStub(this: unknown) {
            invocationContexts.push(this);
            return timeoutIdentifier;
        }

        globalThis.setTimeout = setTimeoutStub as unknown as typeof globalThis.setTimeout;

        try {
            const clock = createClock();

            const actualTimeoutIdentifier = clock.setTimeout(function () {
                return undefined;
            }, 1);

            assert.strictEqual(actualTimeoutIdentifier, timeoutIdentifier);
            assert.strictEqual(invocationContexts[0], globalThis);
        } finally {
            globalThis.setTimeout = originalSetTimeout;
        }
    });

    test('binds clearTimeout to globalThis', () => {
        const originalClearTimeout = globalThis.clearTimeout;
        const timeoutIdentifier = 123 as unknown as ReturnType<typeof globalThis.setTimeout>;
        const invocationContexts: unknown[] = [];
        const actualTimeoutIdentifiers: ReturnType<typeof globalThis.setTimeout>[] = [];

        function clearTimeoutStub(this: unknown, providedTimeoutIdentifier: ReturnType<typeof globalThis.setTimeout>) {
            invocationContexts.push(this);
            actualTimeoutIdentifiers.push(providedTimeoutIdentifier);
        }

        globalThis.clearTimeout = clearTimeoutStub as unknown as typeof globalThis.clearTimeout;

        try {
            const clock = createClock();

            clock.clearTimeout(timeoutIdentifier);

            assert.strictEqual(invocationContexts[0], globalThis);
            assert.deepStrictEqual(actualTimeoutIdentifiers, [ timeoutIdentifier ]);
        } finally {
            globalThis.clearTimeout = originalClearTimeout;
        }
    });

    test('binds setInterval to globalThis', () => {
        const originalSetInterval = globalThis.setInterval;
        const intervalIdentifier = 123 as unknown as ReturnType<typeof globalThis.setInterval>;
        const invocationContexts: unknown[] = [];

        function setIntervalStub(this: unknown) {
            invocationContexts.push(this);
            return intervalIdentifier;
        }

        globalThis.setInterval = setIntervalStub as unknown as typeof globalThis.setInterval;

        try {
            const clock = createClock();

            const actualIntervalIdentifier = clock.setInterval(function () {
                return undefined;
            }, 1);

            assert.strictEqual(actualIntervalIdentifier, intervalIdentifier);
            assert.strictEqual(invocationContexts[0], globalThis);
        } finally {
            globalThis.setInterval = originalSetInterval;
        }
    });

    test('binds clearInterval to globalThis', () => {
        const originalClearInterval = globalThis.clearInterval;
        const intervalIdentifier = 123 as unknown as ReturnType<typeof globalThis.setInterval>;
        const invocationContexts: unknown[] = [];
        const actualIntervalIdentifiers: ReturnType<typeof globalThis.setInterval>[] = [];

        function clearIntervalStub(
            this: unknown,
            providedIntervalIdentifier: ReturnType<typeof globalThis.setInterval>
        ) {
            invocationContexts.push(this);
            actualIntervalIdentifiers.push(providedIntervalIdentifier);
        }

        globalThis.clearInterval = clearIntervalStub as unknown as typeof globalThis.clearInterval;

        try {
            const clock = createClock();

            clock.clearInterval(intervalIdentifier);

            assert.strictEqual(invocationContexts[0], globalThis);
            assert.deepStrictEqual(actualIntervalIdentifiers, [ intervalIdentifier ]);
        } finally {
            globalThis.clearInterval = originalClearInterval;
        }
    });
});
