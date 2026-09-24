import assert from 'node:assert';
import { suite, test } from 'mocha';

import { createClock, type ClockDependencies } from './clock.ts';

type TimeoutInvocation = {
    readonly context: unknown;
    readonly handler: unknown;
    readonly delayInMilliseconds: number;
    readonly handlerArguments: readonly unknown[];
};

type IntervalInvocation = {
    readonly context: unknown;
    readonly handler: unknown;
    readonly delayInMilliseconds: number;
    readonly handlerArguments: readonly unknown[];
};

type ClearTimeoutInvocation = {
    readonly context: unknown;
    readonly timeoutIdentifier: ReturnType<ClockDependencies['setTimeout']>;
};

type ClearIntervalInvocation = {
    readonly context: unknown;
    readonly intervalIdentifier: ReturnType<ClockDependencies['setInterval']>;
};

function createClockDependencies(): ClockDependencies {
    return {
        currentDate() {
            return new Date(1_704_067_200_123);
        },
        currentUnixEpochMilliseconds() {
            return 1_704_067_200_123.456;
        },
        monotonicTimeOriginMilliseconds: 5000.456,
        currentMonotonicMilliseconds() {
            return 123.456;
        },
        setTimeout() {
            return 1 as unknown as ReturnType<ClockDependencies['setTimeout']>;
        },
        clearTimeout() {
            return undefined;
        },
        setInterval() {
            return 2 as unknown as ReturnType<ClockDependencies['setInterval']>;
        },
        clearInterval() {
            return undefined;
        }
    };
}

suite('clock', () => {
    test('returns wall time from dependencies', function () {
        const clock = createClock(createClockDependencies());

        assert.partialDeepStrictEqual(clock, {
            currentUnixEpochMicroseconds: 1_704_067_200_123_456n,
            currentUnixEpochMilliseconds: 1_704_067_200_123.456
        });
        assert.strictEqual(clock.currentDate.getTime(), 1_704_067_200_123);
    });

    test('returns monotonic time from dependencies', function () {
        const clock = createClock(createClockDependencies());

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 123_456n,
            monotonicTimeOriginUnixEpochMicroseconds: 5_000_456n
        });
    });

    test('delegates timeout scheduling to dependencies', function () {
        const setTimeoutCalls: TimeoutInvocation[] = [];
        const clearTimeoutCalls: ClearTimeoutInvocation[] = [];
        const timeoutIdentifier = 123 as unknown as ReturnType<ClockDependencies['setTimeout']>;
        function timeoutHandler(value: string): void {
            assert.strictEqual(value, 'payload');
        }
        function setTimeoutDependency<HandlerArguments extends readonly unknown[]>(
            this: unknown,
            handler: (...handlerArguments: HandlerArguments) => void,
            delayInMilliseconds: number,
            ...handlerArguments: HandlerArguments
        ): ReturnType<ClockDependencies['setTimeout']> {
            setTimeoutCalls.push({ context: this, handler, delayInMilliseconds, handlerArguments });
            return timeoutIdentifier;
        }
        function clearTimeoutDependency(
            this: unknown,
            providedTimeoutIdentifier: ReturnType<ClockDependencies['setTimeout']>
        ): void {
            clearTimeoutCalls.push({ context: this, timeoutIdentifier: providedTimeoutIdentifier });
        }
        const clock = createClock({
            ...createClockDependencies(),
            setTimeout: setTimeoutDependency,
            clearTimeout: clearTimeoutDependency
        });

        const actualTimeoutIdentifier = clock.setTimeout(timeoutHandler, 100, 'payload');
        clock.clearTimeout(timeoutIdentifier);

        assert.strictEqual(actualTimeoutIdentifier, timeoutIdentifier);
        assert.deepStrictEqual(setTimeoutCalls, [
            {
                context: clock,
                delayInMilliseconds: 100,
                handler: timeoutHandler,
                handlerArguments: [ 'payload' ]
            }
        ]);
        assert.deepStrictEqual(clearTimeoutCalls, [
            {
                context: clock,
                timeoutIdentifier
            }
        ]);
    });

    test('delegates interval scheduling to dependencies', function () {
        const setIntervalCalls: IntervalInvocation[] = [];
        const clearIntervalCalls: ClearIntervalInvocation[] = [];
        const intervalIdentifier = 456 as unknown as ReturnType<ClockDependencies['setInterval']>;
        function intervalHandler(value: string): void {
            assert.strictEqual(value, 'payload');
        }
        function setIntervalDependency<HandlerArguments extends readonly unknown[]>(
            this: unknown,
            handler: (...handlerArguments: HandlerArguments) => void,
            delayInMilliseconds: number,
            ...handlerArguments: HandlerArguments
        ): ReturnType<ClockDependencies['setInterval']> {
            setIntervalCalls.push({ context: this, handler, delayInMilliseconds, handlerArguments });
            return intervalIdentifier;
        }
        function clearIntervalDependency(
            this: unknown,
            providedIntervalIdentifier: ReturnType<ClockDependencies['setInterval']>
        ): void {
            clearIntervalCalls.push({ context: this, intervalIdentifier: providedIntervalIdentifier });
        }
        const clock = createClock({
            ...createClockDependencies(),
            setInterval: setIntervalDependency,
            clearInterval: clearIntervalDependency
        });

        const actualIntervalIdentifier = clock.setInterval(intervalHandler, 200, 'payload');
        clock.clearInterval(intervalIdentifier);

        assert.strictEqual(actualIntervalIdentifier, intervalIdentifier);
        assert.deepStrictEqual(setIntervalCalls, [
            {
                context: clock,
                delayInMilliseconds: 200,
                handler: intervalHandler,
                handlerArguments: [ 'payload' ]
            }
        ]);
        assert.deepStrictEqual(clearIntervalCalls, [
            {
                context: clock,
                intervalIdentifier
            }
        ]);
    });
});
