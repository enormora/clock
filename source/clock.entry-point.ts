import {
    createClock as createClockFromDependencies,
    type Clock as RuntimeClock,
    type IntervalIdentifier as RuntimeIntervalIdentifier,
    type TimeoutIdentifier as RuntimeTimeoutIdentifier
} from './clock.ts';

export type Clock = RuntimeClock;
export type TimeoutIdentifier = RuntimeTimeoutIdentifier;
export type IntervalIdentifier = RuntimeIntervalIdentifier;

export function createClock(): RuntimeClock {
    return createClockFromDependencies({
        currentDate() {
            return new Date();
        },
        currentUnixEpochMilliseconds() {
            return Date.now();
        },
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
