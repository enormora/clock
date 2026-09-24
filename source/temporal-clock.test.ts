import assert from 'node:assert';
import { suite, test } from 'mocha';

import { createTemporalClock } from './temporal-clock.ts';

function replaceTemporal(temporal: unknown): () => void {
    const hadTemporal = Reflect.has(globalThis, 'Temporal');
    const originalTemporal = Reflect.get(globalThis, 'Temporal') as unknown;

    Reflect.set(globalThis, 'Temporal', temporal);

    return function restoreTemporal() {
        if (hadTemporal) {
            Reflect.set(globalThis, 'Temporal', originalTemporal);
            return;
        }

        Reflect.deleteProperty(globalThis, 'Temporal');
    };
}

suite('temporal clock', function () {
    test('throws when Temporal is unavailable', function () {
        const restoreTemporal = replaceTemporal(undefined);

        try {
            assert.throws(function () {
                createTemporalClock();
            }, /^ReferenceError: Temporal is not available$/u);
        } finally {
            restoreTemporal();
        }
    });

    test('returns wall time from Temporal instant', function () {
        const restoreTemporal = replaceTemporal({
            Now: {
                instant() {
                    return {
                        epochMilliseconds: 1_704_067_200_123,
                        epochNanoseconds: 1_704_067_200_123_456_789n
                    };
                }
            }
        });

        try {
            const clock = createTemporalClock();

            assert.partialDeepStrictEqual(clock, {
                currentUnixEpochMicroseconds: 1_704_067_200_123_456n,
                currentUnixEpochMilliseconds: 1_704_067_200_123
            });
            assert.strictEqual(clock.currentDate.getTime(), 1_704_067_200_123);
        } finally {
            restoreTemporal();
        }
    });

    test('returns monotonic time from performance', function () {
        const restoreTemporal = replaceTemporal({
            Now: {
                instant() {
                    return {
                        epochMilliseconds: 0,
                        epochNanoseconds: 0n
                    };
                }
            }
        });

        try {
            const clock = createTemporalClock();
            const expectedTimeOrigin = BigInt(Math.floor(globalThis.performance.timeOrigin * 1000));
            const lowerTimestampBound = BigInt(Math.floor(globalThis.performance.now() * 1000));

            const actualCurrentMonotonicMicroseconds = clock.currentMonotonicMicroseconds;

            const upperTimestampBound = BigInt(Math.floor(globalThis.performance.now() * 1000));
            assert.strictEqual(clock.monotonicTimeOriginUnixEpochMicroseconds, expectedTimeOrigin);
            assert.strictEqual(actualCurrentMonotonicMicroseconds >= lowerTimestampBound, true);
            assert.strictEqual(actualCurrentMonotonicMicroseconds <= upperTimestampBound, true);
        } finally {
            restoreTemporal();
        }
    });
});
