import { createTemporalClock as createTemporalClockFromDependencies } from './temporal-clock.ts';
import type {
    Clock,
    IntervalIdentifier as RuntimeIntervalIdentifier,
    TimeoutIdentifier as RuntimeTimeoutIdentifier
} from './clock.ts';

type TemporalInstant = {
    readonly epochMilliseconds: number;
    readonly epochNanoseconds: bigint;
};

type TemporalClockApi = {
    readonly Now: {
        readonly instant: () => TemporalInstant;
    };
};

type TemporalRuntimeGlobal = Readonly<typeof globalThis> & {
    readonly Temporal?: TemporalClockApi;
};

function readTemporalClockApi(): TemporalClockApi {
    const temporalClockApi = (globalThis as TemporalRuntimeGlobal).Temporal;

    if (temporalClockApi === undefined) {
        throw new ReferenceError('Temporal is not available');
    }

    return temporalClockApi;
}

export function createTemporalClock(): Clock {
    const temporalClockApi = readTemporalClockApi();

    return createTemporalClockFromDependencies({
        currentInstant: temporalClockApi.Now.instant.bind(temporalClockApi.Now),
        monotonicTimeOriginMilliseconds: globalThis.performance.timeOrigin,
        currentMonotonicMilliseconds: globalThis.performance.now.bind(globalThis.performance),
        setTimeout(handler, delayInMilliseconds, ...handlerArguments) {
            return globalThis.setTimeout(
                handler,
                delayInMilliseconds,
                ...handlerArguments
            ) as unknown as RuntimeTimeoutIdentifier;
        },
        clearTimeout(timeoutIdentifier) {
            globalThis.clearTimeout(timeoutIdentifier as unknown as ReturnType<typeof globalThis.setTimeout>);
        },
        setInterval(handler, delayInMilliseconds, ...handlerArguments) {
            return globalThis.setInterval(
                handler,
                delayInMilliseconds,
                ...handlerArguments
            ) as unknown as RuntimeIntervalIdentifier;
        },
        clearInterval(intervalIdentifier) {
            globalThis.clearInterval(intervalIdentifier as unknown as ReturnType<typeof globalThis.setInterval>);
        }
    });
}
