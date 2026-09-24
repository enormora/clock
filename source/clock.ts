const microsecondsPerMillisecond = 1000n;

declare const timeoutIdentifierBrand: unique symbol;
declare const intervalIdentifierBrand: unique symbol;

export type TimeoutIdentifier = {
    readonly [timeoutIdentifierBrand]: 'TimeoutIdentifier';
};

export type IntervalIdentifier = {
    readonly [intervalIdentifierBrand]: 'IntervalIdentifier';
};

export type Clock = {
    readonly currentDate: Date;
    readonly currentUnixEpochMilliseconds: number;
    readonly currentUnixEpochMicroseconds: bigint;
    readonly monotonicTimeOriginUnixEpochMicroseconds: bigint;
    readonly currentMonotonicMicroseconds: bigint;
    readonly setTimeout: <HandlerArguments extends readonly unknown[]>(
        handler: (...handlerArguments: HandlerArguments) => void,
        delayInMilliseconds: number,
        ...handlerArguments: HandlerArguments
    ) => TimeoutIdentifier;
    readonly clearTimeout: (timeoutIdentifier: TimeoutIdentifier) => void;
    readonly setInterval: <HandlerArguments extends readonly unknown[]>(
        handler: (...handlerArguments: HandlerArguments) => void,
        delayInMilliseconds: number,
        ...handlerArguments: HandlerArguments
    ) => IntervalIdentifier;
    readonly clearInterval: (intervalIdentifier: IntervalIdentifier) => void;
};

export type ClockDependencies = {
    readonly currentDate: () => Date;
    readonly currentUnixEpochMilliseconds: () => number;
    readonly monotonicTimeOriginMilliseconds: number;
    readonly currentMonotonicMilliseconds: () => number;
    readonly setTimeout: Clock['setTimeout'];
    readonly clearTimeout: Clock['clearTimeout'];
    readonly setInterval: Clock['setInterval'];
    readonly clearInterval: Clock['clearInterval'];
};

function millisecondsToMicroseconds(milliseconds: number): bigint {
    return BigInt(Math.floor(milliseconds * Number(microsecondsPerMillisecond)));
}

export function createClock(dependencies: ClockDependencies): Clock {
    return {
        get currentDate() {
            return dependencies.currentDate();
        },

        get currentUnixEpochMilliseconds() {
            return dependencies.currentUnixEpochMilliseconds();
        },

        get currentUnixEpochMicroseconds() {
            return millisecondsToMicroseconds(dependencies.currentUnixEpochMilliseconds());
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
