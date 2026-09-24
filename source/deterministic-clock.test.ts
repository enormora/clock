import assert from 'node:assert';
import { suite, test } from 'mocha';

import { createDeterministicClock } from './deterministic-clock.ts';

function createCallRecorder() {
    const calls: unknown[][] = [];

    return {
        calls,
        record(...handlerArguments: unknown[]) {
            calls.push(handlerArguments);
        }
    };
}

suite('deterministic clock', function () {
    test('starts with the provided Unix epoch timestamp in microseconds', function () {
        const expectedUnixEpochMicroseconds = 1_704_067_200_123_456n;
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: expectedUnixEpochMicroseconds
        });

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 0n,
            currentUnixEpochMicroseconds: expectedUnixEpochMicroseconds,
            currentUnixEpochMilliseconds: 1_704_067_200_123,
            monotonicTimeOriginUnixEpochMicroseconds: expectedUnixEpochMicroseconds
        });
        assert.strictEqual(clock.currentDate.getTime(), 1_704_067_200_123);
    });

    test('rejects initial Unix epoch timestamps outside the Date range', function () {
        assert.throws(function () {
            createDeterministicClock({
                initialUnixEpochMicroseconds: 9_000_000_000_000_000_000n
            });
        }, RangeError);
    });

    test('sets the current Unix epoch timestamp in microseconds without changing monotonic time', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 1_000_000n
        });

        clock.advanceByMicroseconds(500n);
        clock.setCurrentUnixEpochMicroseconds(2_123_456n);

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 500n,
            currentUnixEpochMicroseconds: 2_123_456n,
            currentUnixEpochMilliseconds: 2123,
            monotonicTimeOriginUnixEpochMicroseconds: 1_000_000n
        });
    });

    test('rejects set Unix epoch timestamps outside the Date range', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });

        assert.throws(function () {
            clock.setCurrentUnixEpochMicroseconds(9_000_000_000_000_000_000n);
        }, RangeError);
    });

    test('advances current time by microseconds', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 10_000_000n
        });

        clock.advanceByMicroseconds(1500n);

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 1500n,
            currentUnixEpochMicroseconds: 10_001_500n,
            currentUnixEpochMilliseconds: 10_001
        });
    });

    test('advances current time by milliseconds', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 10_000_000n
        });

        clock.advanceByMilliseconds(1.5);

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 1500n,
            currentUnixEpochMicroseconds: 10_001_500n,
            currentUnixEpochMilliseconds: 10_001
        });
    });

    test('returns a new date instance for each call', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 100_000n
        });

        const firstCurrentDate = clock.currentDate;
        const secondCurrentDate = clock.currentDate;

        assert.notStrictEqual(firstCurrentDate, secondCurrentDate);
        assert.strictEqual(firstCurrentDate.getTime(), 100);
        assert.strictEqual(secondCurrentDate.getTime(), 100);
    });

    test('executes timeout callback once when monotonic time reaches the delay', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const timeoutRecorder = createCallRecorder();

        clock.setTimeout(timeoutRecorder.record, 100, 'timeout argument');
        clock.setCurrentUnixEpochMicroseconds(10_000_000n);
        clock.advanceByMilliseconds(100);
        clock.advanceByMilliseconds(500);

        assert.deepStrictEqual(timeoutRecorder.calls, [ [ 'timeout argument' ] ]);
    });

    test('does not execute timeout callback before the delay', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const timeoutRecorder = createCallRecorder();

        clock.setTimeout(timeoutRecorder.record, 100);
        clock.advanceByMilliseconds(99);

        assert.deepStrictEqual(timeoutRecorder.calls, []);
    });

    test('stops executing timeout callback after clearTimeout', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const timeoutRecorder = createCallRecorder();

        const timeoutIdentifier = clock.setTimeout(timeoutRecorder.record, 100);
        clock.clearTimeout(timeoutIdentifier);
        clock.advanceByMilliseconds(100);

        assert.deepStrictEqual(timeoutRecorder.calls, []);
    });

    test('executes due timeout callbacks in monotonic time and registration order', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const executionOrder: string[] = [];

        clock.setTimeout(function () {
            executionOrder.push('second timeout');
        }, 100);
        clock.setTimeout(function () {
            executionOrder.push('first timeout');
        }, 50);
        clock.setTimeout(function () {
            executionOrder.push('third timeout');
        }, 100);

        clock.advanceByMilliseconds(100);

        assert.deepStrictEqual(executionOrder, [ 'first timeout', 'second timeout', 'third timeout' ]);
    });

    test('executes interval callbacks repeatedly when monotonic time advances', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const intervalRecorder = createCallRecorder();

        clock.setInterval(intervalRecorder.record, 100, 'interval argument');
        clock.advanceByMilliseconds(250);

        assert.deepStrictEqual(intervalRecorder.calls, [ [ 'interval argument' ], [ 'interval argument' ] ]);
    });

    test('stops executing interval callbacks after clearInterval', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });
        const intervalRecorder = createCallRecorder();

        const intervalIdentifier = clock.setInterval(intervalRecorder.record, 100);
        clock.advanceByMilliseconds(100);
        clock.clearInterval(intervalIdentifier);
        clock.advanceByMilliseconds(300);

        assert.deepStrictEqual(intervalRecorder.calls, [ [] ]);
    });

    test('rejects invalid timeout delays', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });

        assert.throws(function () {
            clock.setTimeout(function () {
                return undefined;
            }, -1);
        }, RangeError);
        assert.throws(function () {
            clock.setTimeout(function () {
                return undefined;
            }, Number.NaN);
        }, TypeError);
    });

    test('rejects invalid interval delays', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });

        assert.throws(function () {
            clock.setInterval(function () {
                return undefined;
            }, 0);
        }, RangeError);
        assert.throws(function () {
            clock.setInterval(function () {
                return undefined;
            }, 0.0005);
        }, RangeError);
        assert.throws(function () {
            clock.setInterval(function () {
                return undefined;
            }, Number.POSITIVE_INFINITY);
        }, TypeError);
    });

    test('rejects invalid advance delays', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 0n
        });

        assert.throws(function () {
            clock.advanceByMicroseconds(-1n);
        }, RangeError);
        assert.throws(function () {
            clock.advanceByMilliseconds(Number.NaN);
        }, TypeError);
    });

    test('rejects advances outside the Date range', function () {
        const clock = createDeterministicClock({
            initialUnixEpochMicroseconds: 8_640_000_000_000_000_000n
        });

        assert.throws(function () {
            clock.advanceByMicroseconds(1000n);
        }, RangeError);
        assert.strictEqual(clock.currentUnixEpochMicroseconds, 8_640_000_000_000_000_000n);
    });
});
