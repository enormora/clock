const microsecondsPerMillisecond = 1000n;

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
    ) => ReturnType<typeof globalThis.setTimeout>;
    readonly clearTimeout: (timeoutIdentifier: ReturnType<typeof globalThis.setTimeout>) => void;
    readonly setInterval: <HandlerArguments extends readonly unknown[]>(
        handler: (...handlerArguments: HandlerArguments) => void,
        delayInMilliseconds: number,
        ...handlerArguments: HandlerArguments
    ) => ReturnType<typeof globalThis.setInterval>;
    readonly clearInterval: (intervalIdentifier: ReturnType<typeof globalThis.setInterval>) => void;
};

function millisecondsToMicroseconds(milliseconds: number): bigint {
    return BigInt(Math.floor(milliseconds * Number(microsecondsPerMillisecond)));
}

function performanceNowInMicroseconds(): bigint {
    return BigInt(Math.floor(globalThis.performance.now() * Number(microsecondsPerMillisecond)));
}

export function createClock(): Clock {
    return {
        get currentDate() {
            return new Date();
        },

        get currentUnixEpochMilliseconds() {
            return Date.now();
        },

        get currentUnixEpochMicroseconds() {
            return millisecondsToMicroseconds(Date.now());
        },

        get monotonicTimeOriginUnixEpochMicroseconds() {
            return millisecondsToMicroseconds(globalThis.performance.timeOrigin);
        },

        get currentMonotonicMicroseconds() {
            return performanceNowInMicroseconds();
        },

        setTimeout: globalThis.setTimeout.bind(globalThis),

        clearTimeout: globalThis.clearTimeout.bind(globalThis),

        setInterval: globalThis.setInterval.bind(globalThis),

        clearInterval: globalThis.clearInterval.bind(globalThis)
    };
}
