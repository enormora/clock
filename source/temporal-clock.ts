import type { Clock } from './clock.ts';

type TemporalInstant = {
    readonly epochMilliseconds: number;
    readonly epochNanoseconds: bigint;
};

type TemporalClockApi = {
    readonly Now: {
        readonly instant: () => TemporalInstant;
    };
};

const microsecondsPerMillisecond = 1000;
const nanosecondsPerMicrosecond = 1000n;

function readTemporalClockApi(): TemporalClockApi {
    const temporalClockApi = Reflect.get(globalThis, 'Temporal') as unknown;

    if (temporalClockApi === undefined) {
        throw new ReferenceError('Temporal is not available');
    }

    return temporalClockApi as TemporalClockApi;
}

function readCurrentInstant(): TemporalInstant {
    return readTemporalClockApi().Now.instant();
}

function currentPerformanceMicroseconds(): bigint {
    return BigInt(Math.floor(globalThis.performance.now() * microsecondsPerMillisecond));
}

function performanceTimeOriginMicroseconds(): bigint {
    return BigInt(Math.floor(globalThis.performance.timeOrigin * microsecondsPerMillisecond));
}

export function createTemporalClock(): Clock {
    readTemporalClockApi();

    return {
        get currentDate() {
            return new Date(readCurrentInstant().epochMilliseconds);
        },

        get currentUnixEpochMilliseconds() {
            return readCurrentInstant().epochMilliseconds;
        },

        get currentUnixEpochMicroseconds() {
            return readCurrentInstant().epochNanoseconds / nanosecondsPerMicrosecond;
        },

        get monotonicTimeOriginUnixEpochMicroseconds() {
            return performanceTimeOriginMicroseconds();
        },

        get currentMonotonicMicroseconds() {
            return currentPerformanceMicroseconds();
        },

        setTimeout: globalThis.setTimeout.bind(globalThis),

        clearTimeout: globalThis.clearTimeout.bind(globalThis),

        setInterval: globalThis.setInterval.bind(globalThis),

        clearInterval: globalThis.clearInterval.bind(globalThis)
    };
}
