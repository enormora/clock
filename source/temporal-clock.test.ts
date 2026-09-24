import assert from 'node:assert';
import { suite, test } from 'mocha';

import { createTemporalClock, type TemporalClockDependencies } from './temporal-clock.ts';

function createTemporalClockDependencies(): TemporalClockDependencies {
    return {
        currentInstant() {
            return {
                epochMilliseconds: 1_704_067_200_123,
                epochNanoseconds: 1_704_067_200_123_456_789n
            };
        },
        monotonicTimeOriginMilliseconds: 5000.456,
        currentMonotonicMilliseconds() {
            return 123.456;
        },
        setTimeout() {
            return 1 as unknown as ReturnType<TemporalClockDependencies['setTimeout']>;
        },
        clearTimeout() {
            return undefined;
        },
        setInterval() {
            return 2 as unknown as ReturnType<TemporalClockDependencies['setInterval']>;
        },
        clearInterval() {
            return undefined;
        }
    };
}

suite('temporal clock', function () {
    test('returns wall time from current instant dependency', function () {
        const clock = createTemporalClock(createTemporalClockDependencies());

        assert.partialDeepStrictEqual(clock, {
            currentUnixEpochMicroseconds: 1_704_067_200_123_456n,
            currentUnixEpochMilliseconds: 1_704_067_200_123
        });
        assert.strictEqual(clock.currentDate.getTime(), 1_704_067_200_123);
    });

    test('returns monotonic time from dependencies', function () {
        const clock = createTemporalClock(createTemporalClockDependencies());

        assert.partialDeepStrictEqual(clock, {
            currentMonotonicMicroseconds: 123_456n,
            monotonicTimeOriginUnixEpochMicroseconds: 5_000_456n
        });
    });
});
