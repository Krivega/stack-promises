/// <reference types="jest" />

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable jest/no-conditional-expect */
import { creteStackPromises, isEmptyStackError, isPromiseIsNotActualError } from '../index';

const noop = () => {};
const deferred = <T = void>() => {
  let resolveDeferred: (data: T) => void = noop;
  let rejectDeferred: (error: Error) => void = noop;

  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
};

const delayPromise = async <T = void>(timeout: number, data: T): Promise<T> => {
  const { promise, resolve } = deferred<T>();

  setTimeout(() => {
    resolve(data);
  }, timeout);

  return promise;
};

describe('creteStackPromises', () => {
  let stackPromises = creteStackPromises<number>();

  beforeEach(() => {
    stackPromises = creteStackPromises<number>();
  });

  it('empty stack', async () => {
    expect.assertions(1);

    return stackPromises().catch((error: unknown) => {
      expect(isEmptyStackError(error as Error)).toBe(true);
    });
  });

  it('add not function', () => {
    expect.assertions(1);

    expect(() => {
      // @ts-expect-error
      return stackPromises.add();
    }).toThrow('stackPromises only works with functions that returns a Promise');
  });

  it('1 promise', async () => {
    expect.assertions(1);

    stackPromises.add(async () => {
      return delayPromise(1, 1);
    });

    return stackPromises().then((data) => {
      expect(data).toBe(1);
    });
  });

  it('2 promise with chain add: sync', async () => {
    expect.assertions(1);

    stackPromises
      .add(async () => {
        return delayPromise(1, 1);
      })
      .add(async () => {
        return delayPromise(1, 2);
      });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('2 promise add: sync', async () => {
    expect.assertions(1);

    stackPromises.add(async () => {
      return delayPromise(1, 1);
    });
    stackPromises.add(async () => {
      return delayPromise(1, 2);
    });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('1 promise run', async () => {
    expect.assertions(1);

    return stackPromises
      .run(async () => {
        return delayPromise(1, 1);
      })
      .then((data) => {
        expect(data).toBe(1);
      });
  });

  it('2 promise run: sync', async () => {
    expect.assertions(2);

    const promise1 = stackPromises.run(async () => {
      return delayPromise(1, 1);
    });
    const promise2 = stackPromises.run(async () => {
      return delayPromise(1, 2);
    });

    return Promise.allSettled([promise1, promise2]).then((arguments_) => {
      // @ts-expect-error
      const [{ reason }, { value }] = arguments_;

      expect(isPromiseIsNotActualError(reason)).toBe(true);
      expect(value).toBe(2);
    });
  });

  it('2 equal promise: sync', async () => {
    expect.assertions(3);

    let checkQue = 0;

    const request = jest.fn(async () => {
      return delayPromise(1, 1).finally(() => {
        checkQue += 1;
      });
    });

    stackPromises.add(request);
    stackPromises.add(request);

    return stackPromises().then((data) => {
      expect(data).toBe(1);
      expect(checkQue).toBe(2);
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  it('2 promise reversed: sync', async () => {
    expect.assertions(2);

    let checkQue = 0;

    stackPromises.add(async () => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
      expect(checkQue).toBe(2);
    });
  });

  it('2 promise: async', async () => {
    expect.assertions(5);

    let checkQue = 0;
    const request1 = jest.fn(async () => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);

    return Promise.allSettled([resultAfter1, resultAfter2]).then((arguments_) => {
      // @ts-expect-error
      const [{ reason }, { value }] = arguments_;

      expect(isPromiseIsNotActualError(reason)).toBe(true);
      expect(value).toBe(2);
      expect(checkQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async', async () => {
    expect.assertions(7);

    let checkQue = 0;
    const request1 = jest.fn(async () => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });
    const request3 = jest.fn(async () => {
      return delayPromise(1, 3).finally(() => {
        checkQue *= 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((arguments_) => {
      const [result1, result2, result3] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-expect-error
      expect(result3.value).toBe(3);
      expect(checkQue).toBe(6);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('2 promise: async: noRunIsNotActual', async () => {
    expect.assertions(6);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(async () => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);

    return Promise.allSettled([resultAfter1, resultAfter2]).then((arguments_) => {
      const [result1, result2] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-expect-error
      expect(result2.value).toBe(2);
      expect(checkRunQue).toBe(2);
      expect(checkResultQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async: noRunIsNotActual', async () => {
    expect.assertions(8);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(async () => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(async () => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((arguments_) => {
      const [result1, result2, result3] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-expect-error
      expect(result3.value).toBe(3);
      expect(checkRunQue).toBe(3);
      expect(checkResultQue).toBe(3);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async: pass isNotActual', async () => {
    expect.assertions(11);

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(async () => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(async () => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((arguments_) => {
      const [result1, result2, result3] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-expect-error
      expect(result3.value).toBe(3);
      expect(checkRunQue).toBe(6);
      expect(checkResultQue).toBe(6);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request1).toHaveBeenCalledWith({ isActual: false });
      expect(request2).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledWith({ isActual: false });
      expect(request3).toHaveBeenCalledTimes(1);
      expect(request3).toHaveBeenCalledWith({ isActual: true });
    });
  });

  it('2 promise: async: noRejectIsNotActual', async () => {
    expect.assertions(5);

    let checkQue = 0;
    const request1 = jest.fn(async () => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });

    stackPromises = creteStackPromises<number>({ noRejectIsNotActual: true });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);

    return Promise.all([resultAfter1, resultAfter2]).then(([value1, value2]) => {
      expect(value1).toBe(1);
      expect(value2).toBe(2);
      expect(checkQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async: noRunIsNotActual and noRejectIsNotActual', async () => {
    expect.assertions(10);

    stackPromises = creteStackPromises<number>({
      noRunIsNotActual: true,
      noRejectIsNotActual: true,
    });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(async () => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(async () => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((arguments_) => {
      const [result1, result2, result3] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(false);
      // @ts-expect-error
      expect(result1.value).toBe(undefined);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result2.reason)).toBe(false);
      // @ts-expect-error
      expect(result2.value).toBe(undefined);
      // @ts-expect-error
      expect(result3.value).toBe(3);
      expect(checkRunQue).toBe(3);
      expect(checkResultQue).toBe(3);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('1 promise rejected', async () => {
    expect.assertions(1);

    const error = new Error('error');

    stackPromises.add(async () => {
      throw error;
    });

    return stackPromises().catch((error_: unknown) => {
      expect(error_).toBe(error);
    });
  });

  it('1 promise: should be stopped', async () => {
    expect.assertions(1);

    const error = new Error('Promise is not actual');

    stackPromises.add(async () => {
      return delayPromise(1, 1);
    });

    const promise = stackPromises();

    stackPromises.stop();

    return promise.catch((error_: unknown) => {
      expect(error_).toEqual(error);
    });
  });

  it('2 promises: should be run correctly after stop', async () => {
    expect.assertions(2);

    let checkQue = 0;

    stackPromises.add(async () => {
      return delayPromise(1, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue += 1;
      });
    });

    const promise = stackPromises();

    stackPromises.stop();

    await promise.catch(() => {
      expect(checkQue).toEqual(0);
    });

    stackPromises.add(async () => {
      return delayPromise(1, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(async () => {
      return delayPromise(1, 2).finally(() => {
        checkQue += 1;
      });
    });

    return stackPromises().then(() => {
      expect(checkQue).toEqual(2);
    });
  });

  it('3 promise: async: noRunIsNotActual: stop', async () => {
    expect.assertions(8);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(async () => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(async () => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(async () => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    stackPromises.stop();

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((arguments_) => {
      const [result1, result2, result3] = arguments_;

      // @ts-expect-error
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-expect-error
      expect(isPromiseIsNotActualError(result3.reason)).toBe(true);
      expect(checkRunQue).toBe(0);
      expect(checkResultQue).toBe(0);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(0);
    });
  });
});
