import type { Clock } from './clock.ts';

type TemporalInstant = {
    readonly epochMilliseconds: number;
    readonly epochNanoseconds: bigint;
};

export type TemporalClockDependencies = {
    readonly currentInstant: () => TemporalInstant;
    readonly monotonicTimeOriginMilliseconds: number;
    readonly currentMonotonicMilliseconds: () => number;
    readonly setTimeout: Clock['setTimeout'];
    readonly clearTimeout: Clock['clearTimeout'];
    readonly setInterval: Clock['setInterval'];
    readonly clearInterval: Clock['clearInterval'];
};

const microsecondsPerMillisecond = 1000;
const nanosecondsPerMicrosecond = 1000n;

function millisecondsToMicroseconds(milliseconds: number): bigint {
    return BigInt(Math.floor(milliseconds * microsecondsPerMillisecond));
}

export function createTemporalClock(dependencies: TemporalClockDependencies): Clock {
    return {
        get currentDate() {
            return new Date(dependencies.currentInstant().epochMilliseconds);
        },

        get currentUnixEpochMilliseconds() {
            return dependencies.currentInstant().epochMilliseconds;
        },

        get currentUnixEpochMicroseconds() {
            return dependencies.currentInstant().epochNanoseconds / nanosecondsPerMicrosecond;
        },

        get monotonicTimeOriginUnixEpochMicroseconds() {
            return millisecondsToMicroseconds(dependencies.monotonicTimeOriginMilliseconds);
        },

        get currentMonotonicMicroseconds() {
            return millisecondsToMicroseconds(dependencies.currentMonotonicMilliseconds());
        },

        setTimeout: dependencies.setTimeout,

        clearTimeout: dependencies.clearTimeout,

        setInterval: dependencies.setInterval,

        clearInterval: dependencies.clearInterval
    };
}
