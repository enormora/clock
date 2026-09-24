import type { Clock } from './clock.ts';
import { validateIntervalDelayInMilliseconds, validateTimeoutDelayInMilliseconds } from './timer-delay.ts';

export type DeterministicClock = Clock & {
    readonly setCurrentUnixEpochMicroseconds: (nextUnixEpochMicroseconds: bigint) => void;
    readonly advanceByMicroseconds: (delayInMicroseconds: bigint) => void;
    readonly advanceByMilliseconds: (delayInMilliseconds: number) => void;
};

export type DeterministicClockOptions = {
    readonly initialUnixEpochMicroseconds: bigint;
};

const microsecondsPerMillisecond = 1000n;
const minimumDelayInMicroseconds = 0n;

type TimeoutRegistration = {
    readonly execute: () => void;
    readonly executionMonotonicMicroseconds: bigint;
};

type IntervalRegistration = {
    readonly delayInMicroseconds: bigint;
    readonly execute: () => void;
    readonly nextExecutionMonotonicMicroseconds: bigint;
};

type TimeoutController = {
    readonly runDueTimeoutRegistrations: () => void;
    readonly setTimeout: Clock['setTimeout'];
    readonly clearTimeout: Clock['clearTimeout'];
};

type IntervalController = {
    readonly runDueIntervalRegistrations: () => void;
    readonly setInterval: Clock['setInterval'];
    readonly clearInterval: Clock['clearInterval'];
};

type CurrentMonotonicMicrosecondsReader = () => bigint;
type TimeoutEntry = readonly [number, TimeoutRegistration];

function compareMicroseconds(firstMicroseconds: bigint, secondMicroseconds: bigint): number {
    if (firstMicroseconds < secondMicroseconds) {
        return -1;
    }

    if (firstMicroseconds > secondMicroseconds) {
        return 1;
    }

    return 0;
}

function compareTimeoutEntries(firstTimeoutEntry: TimeoutEntry, secondTimeoutEntry: TimeoutEntry): number {
    const [ firstTimeoutIdentifier, firstTimeoutRegistration ] = firstTimeoutEntry;
    const [ secondTimeoutIdentifier, secondTimeoutRegistration ] = secondTimeoutEntry;
    const timeoutExecutionOrder = compareMicroseconds(
        firstTimeoutRegistration.executionMonotonicMicroseconds,
        secondTimeoutRegistration.executionMonotonicMicroseconds
    );

    if (timeoutExecutionOrder !== 0) {
        return timeoutExecutionOrder;
    }

    return firstTimeoutIdentifier - secondTimeoutIdentifier;
}

function millisecondsToMicroseconds(milliseconds: number): bigint {
    return BigInt(Math.floor(milliseconds * Number(microsecondsPerMillisecond)));
}

function unixEpochMillisecondsFromMicroseconds(unixEpochMicroseconds: bigint): number {
    return Number(unixEpochMicroseconds / microsecondsPerMillisecond);
}

function ensureValidDateUnixEpochMicroseconds(unixEpochMicroseconds: bigint): void {
    const unixEpochMilliseconds = unixEpochMillisecondsFromMicroseconds(unixEpochMicroseconds);
    const date = new Date(unixEpochMilliseconds);

    if (Number.isNaN(date.getTime())) {
        throw new RangeError('Invalid Unix epoch microseconds, must be representable as a Date');
    }
}

function validateDelayInMicroseconds(delayInMicroseconds: bigint): void {
    if (delayInMicroseconds < minimumDelayInMicroseconds) {
        throw new RangeError(
            `Invalid delay ${delayInMicroseconds.toString()}, must be greater than or equal to 0`
        );
    }
}

function createTimeoutController(currentMonotonicMicroseconds: CurrentMonotonicMicrosecondsReader): TimeoutController {
    let nextTimeoutIdentifier = 0;
    const timeoutRegistrations = new Map<number, TimeoutRegistration>();

    function runDueTimeoutRegistrations(): void {
        const dueTimeoutEntries = Array
            .from(timeoutRegistrations)
            .filter(function ([ , timeoutRegistration ]) {
                return timeoutRegistration.executionMonotonicMicroseconds <= currentMonotonicMicroseconds();
            })
            .toSorted(compareTimeoutEntries);

        dueTimeoutEntries.forEach(function ([ timeoutIdentifier, timeoutRegistration ]) {
            timeoutRegistrations.delete(timeoutIdentifier);
            timeoutRegistration.execute();
        });
    }

    return {
        runDueTimeoutRegistrations,

        setTimeout(handler, delayInMilliseconds, ...handlerArguments) {
            validateTimeoutDelayInMilliseconds(delayInMilliseconds);

            const timeoutIdentifier = nextTimeoutIdentifier;
            nextTimeoutIdentifier += 1;
            const delayInMicroseconds = millisecondsToMicroseconds(delayInMilliseconds);

            timeoutRegistrations.set(timeoutIdentifier, {
                execute() {
                    handler(...handlerArguments);
                },
                executionMonotonicMicroseconds: currentMonotonicMicroseconds() + delayInMicroseconds
            });

            return timeoutIdentifier as unknown as ReturnType<Clock['setTimeout']>;
        },

        clearTimeout(timeoutIdentifier) {
            timeoutRegistrations.delete(timeoutIdentifier as unknown as number);
        }
    };
}

function createIntervalController(
    currentMonotonicMicroseconds: CurrentMonotonicMicrosecondsReader
): IntervalController {
    let nextIntervalIdentifier = 0;
    const intervalRegistrations = new Map<number, IntervalRegistration>();

    function runDueIntervalRegistrations(): void {
        intervalRegistrations.forEach(function (intervalRegistration, intervalIdentifier) {
            const { delayInMicroseconds, execute } = intervalRegistration;
            let { nextExecutionMonotonicMicroseconds } = intervalRegistration;

            while (nextExecutionMonotonicMicroseconds <= currentMonotonicMicroseconds()) {
                execute();

                if (!intervalRegistrations.has(intervalIdentifier)) {
                    return;
                }

                nextExecutionMonotonicMicroseconds += delayInMicroseconds;
                intervalRegistrations.set(intervalIdentifier, {
                    delayInMicroseconds,
                    execute,
                    nextExecutionMonotonicMicroseconds
                });
            }
        });
    }

    return {
        runDueIntervalRegistrations,

        setInterval(handler, delayInMilliseconds, ...handlerArguments) {
            validateIntervalDelayInMilliseconds(delayInMilliseconds);

            const intervalIdentifier = nextIntervalIdentifier;
            nextIntervalIdentifier += 1;
            const delayInMicroseconds = millisecondsToMicroseconds(delayInMilliseconds);

            if (delayInMicroseconds <= minimumDelayInMicroseconds) {
                throw new RangeError(
                    `Invalid interval delay ${delayInMilliseconds}, must be at least 1 microsecond`
                );
            }

            intervalRegistrations.set(intervalIdentifier, {
                delayInMicroseconds,
                execute() {
                    handler(...handlerArguments);
                },
                nextExecutionMonotonicMicroseconds: currentMonotonicMicroseconds() + delayInMicroseconds
            });

            return intervalIdentifier as unknown as ReturnType<Clock['setInterval']>;
        },

        clearInterval(intervalIdentifier) {
            intervalRegistrations.delete(intervalIdentifier as unknown as number);
        }
    };
}

export function createDeterministicClock(options: DeterministicClockOptions): DeterministicClock {
    const { initialUnixEpochMicroseconds } = options;

    ensureValidDateUnixEpochMicroseconds(initialUnixEpochMicroseconds);

    let currentUnixEpochMicroseconds = initialUnixEpochMicroseconds;
    let currentMonotonicMicroseconds = minimumDelayInMicroseconds;
    function currentMonotonicMicrosecondsReader(): bigint {
        return currentMonotonicMicroseconds;
    }
    const timeoutController = createTimeoutController(currentMonotonicMicrosecondsReader);
    const intervalController = createIntervalController(currentMonotonicMicrosecondsReader);
    function advanceClockByMicroseconds(delayInMicroseconds: bigint): void {
        validateDelayInMicroseconds(delayInMicroseconds);

        const nextUnixEpochMicroseconds = currentUnixEpochMicroseconds + delayInMicroseconds;
        ensureValidDateUnixEpochMicroseconds(nextUnixEpochMicroseconds);

        currentUnixEpochMicroseconds = nextUnixEpochMicroseconds;
        currentMonotonicMicroseconds += delayInMicroseconds;
        intervalController.runDueIntervalRegistrations();
        timeoutController.runDueTimeoutRegistrations();
    }

    return {
        get currentDate() {
            return new Date(unixEpochMillisecondsFromMicroseconds(currentUnixEpochMicroseconds));
        },

        get currentUnixEpochMilliseconds() {
            return unixEpochMillisecondsFromMicroseconds(currentUnixEpochMicroseconds);
        },

        get currentUnixEpochMicroseconds() {
            return currentUnixEpochMicroseconds;
        },

        get monotonicTimeOriginUnixEpochMicroseconds() {
            return initialUnixEpochMicroseconds;
        },

        get currentMonotonicMicroseconds() {
            return currentMonotonicMicroseconds;
        },

        setCurrentUnixEpochMicroseconds(nextUnixEpochMicroseconds) {
            ensureValidDateUnixEpochMicroseconds(nextUnixEpochMicroseconds);
            currentUnixEpochMicroseconds = nextUnixEpochMicroseconds;
        },

        advanceByMicroseconds: advanceClockByMicroseconds,

        advanceByMilliseconds(delayInMilliseconds) {
            validateTimeoutDelayInMilliseconds(delayInMilliseconds);

            advanceClockByMicroseconds(millisecondsToMicroseconds(delayInMilliseconds));
        },

        setTimeout: timeoutController.setTimeout,

        clearTimeout: timeoutController.clearTimeout,

        setInterval: intervalController.setInterval,

        clearInterval: intervalController.clearInterval
    };
}
