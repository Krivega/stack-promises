/* eslint-disable jest/no-conditional-expect */
import delayPromise from 'promise-delay';
import creteStackPromises, { isEmptyStackError, isPromiseIsNotActualError } from '../index';

describe('creteStackPromises', () => {
  let stackPromises = creteStackPromises<number>();

  beforeEach(() => {
    stackPromises = creteStackPromises<number>();
  });

  it('empty stack', () => {
    expect.assertions(1);

    return stackPromises().catch((error) => {
      expect(isEmptyStackError(error)).toBe(true);
    });
  });

  it('add not function', () => {
    expect.assertions(1);

    expect(() => {
      // @ts-ignore
      return stackPromises.add();
    }).toThrow('stackPromises only works with functions that returns a Promise');
  });

  it('1 promise', () => {
    expect.assertions(1);

    stackPromises.add(() => {
      return delayPromise(1, 1);
    });

    return stackPromises().then((data) => {
      expect(data).toBe(1);
    });
  });

  it('2 promise with chain add: sync', () => {
    expect.assertions(1);

    stackPromises
      .add(() => {
        return delayPromise(1, 1);
      })
      .add(() => {
        return delayPromise(1, 2);
      });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('2 promise add: sync', () => {
    expect.assertions(1);

    stackPromises.add(() => {
      return delayPromise(1, 1);
    });
    stackPromises.add(() => {
      return delayPromise(1, 2);
    });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('1 promise run', () => {
    expect.assertions(1);

    return stackPromises
      .run(() => {
        return delayPromise(1, 1);
      })
      .then((data) => {
        expect(data).toBe(1);
      });
  });

  it('2 promise run: sync', () => {
    expect.assertions(2);

    const promise1 = stackPromises.run(() => {
      return delayPromise(1, 1);
    });
    const promise2 = stackPromises.run(() => {
      return delayPromise(1, 2);
    });

    return Promise.allSettled([promise1, promise2]).then((args) => {
      // @ts-ignore
      const [{ reason }, { value }] = args;

      expect(isPromiseIsNotActualError(reason)).toBe(true);
      expect(value).toBe(2);
    });
  });

  it('2 equal promise: sync', () => {
    expect.assertions(3);

    let checkQue = 0;

    const request = jest.fn(() => {
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

  it('2 promise reversed: sync', () => {
    expect.assertions(2);

    let checkQue = 0;

    stackPromises.add(() => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(() => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });

    return stackPromises().then((data) => {
      expect(data).toBe(2);
      expect(checkQue).toBe(2);
    });
  });

  it('2 promise: async', () => {
    expect.assertions(5);

    let checkQue = 0;
    const request1 = jest.fn(() => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);

    return Promise.allSettled([resultAfter1, resultAfter2]).then((args) => {
      // @ts-ignore
      const [{ reason }, { value }] = args;

      expect(isPromiseIsNotActualError(reason)).toBe(true);
      expect(value).toBe(2);
      expect(checkQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async', () => {
    expect.assertions(7);

    let checkQue = 0;
    const request1 = jest.fn(() => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      return delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      });
    });
    const request3 = jest.fn(() => {
      return delayPromise(1, 3).finally(() => {
        checkQue *= 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((args) => {
      const [result1, result2, result3] = args;

      // @ts-ignore
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-ignore
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-ignore
      expect(result3.value).toBe(3);
      expect(checkQue).toBe(6);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('2 promise: async: noRunIsNotActual', () => {
    expect.assertions(6);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(() => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);

    return Promise.allSettled([resultAfter1, resultAfter2]).then((args) => {
      const [result1, result2] = args;

      // @ts-ignore
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-ignore
      expect(result2.value).toBe(2);
      expect(checkRunQue).toBe(2);
      expect(checkResultQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('3 promise: async: noRunIsNotActual', () => {
    expect.assertions(8);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(() => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(() => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((args) => {
      const [result1, result2, result3] = args;

      // @ts-ignore
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-ignore
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-ignore
      expect(result3.value).toBe(3);
      expect(checkRunQue).toBe(3);
      expect(checkResultQue).toBe(3);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('2 promise: async: noRejectIsNotActual', () => {
    expect.assertions(5);

    let checkQue = 0;
    const request1 = jest.fn(() => {
      return delayPromise(3, 1).finally(() => {
        checkQue += 1;
      });
    });
    const request2 = jest.fn(() => {
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

  it('3 promise: async: noRunIsNotActual and noRejectIsNotActual', () => {
    expect.assertions(10);

    stackPromises = creteStackPromises<number>({
      noRunIsNotActual: true,
      noRejectIsNotActual: true,
    });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(() => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(() => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((args) => {
      const [result1, result2, result3] = args;

      // @ts-ignore
      expect(isPromiseIsNotActualError(result1.reason)).toBe(false);
      // @ts-ignore
      expect(result1.value).toBe(undefined);
      // @ts-ignore
      expect(isPromiseIsNotActualError(result2.reason)).toBe(false);
      // @ts-ignore
      expect(result2.value).toBe(undefined);
      // @ts-ignore
      expect(result3.value).toBe(3);
      expect(checkRunQue).toBe(3);
      expect(checkResultQue).toBe(3);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(1);
    });
  });

  it('1 promise rejected', () => {
    expect.assertions(1);

    const error = new Error('error');

    stackPromises.add(() => {
      return Promise.reject(error);
    });

    return stackPromises().catch((errorFromStack) => {
      expect(errorFromStack).toBe(error);
    });
  });

  it('1 promise: should be stopped', () => {
    expect.assertions(1);

    const error = new Error('Promise is not actual');

    stackPromises.add(() => {
      return delayPromise(1, 1);
    });

    const promise = stackPromises();

    stackPromises.stop();

    return promise.catch((errorFromStack) => {
      expect(errorFromStack).toEqual(error);
    });
  });

  it('2 promises: should be run correctly after stop', async () => {
    expect.assertions(2);

    let checkQue = 0;

    stackPromises.add(() => {
      return delayPromise(1, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(() => {
      return delayPromise(1, 2).finally(() => {
        checkQue += 1;
      });
    });

    const promise = stackPromises();

    stackPromises.stop();

    await promise.catch(() => {
      expect(checkQue).toEqual(0);
    });

    stackPromises.add(() => {
      return delayPromise(1, 1).finally(() => {
        checkQue += 1;
      });
    });
    stackPromises.add(() => {
      return delayPromise(1, 2).finally(() => {
        checkQue += 1;
      });
    });

    return stackPromises().then(() => {
      expect(checkQue).toEqual(2);
    });
  });

  it('3 promise: async: noRunIsNotActual: stop', () => {
    expect.assertions(8);

    stackPromises = creteStackPromises<number>({ noRunIsNotActual: true });

    let checkRunQue = 0;
    let checkResultQue = 0;
    const request1 = jest.fn(() => {
      checkRunQue += 1;

      return delayPromise(3, 1).finally(() => {
        checkResultQue += 1;
      });
    });
    const request2 = jest.fn(() => {
      checkRunQue += 2;

      return delayPromise(1, 2).finally(() => {
        checkResultQue += 2;
      });
    });
    const request3 = jest.fn(() => {
      checkRunQue += 3;

      return delayPromise(1, 3).finally(() => {
        checkResultQue += 3;
      });
    });

    const resultAfter1 = stackPromises.run(request1);
    const resultAfter2 = stackPromises.run(request2);
    const resultAfter3 = stackPromises.run(request3);

    stackPromises.stop();

    return Promise.allSettled([resultAfter1, resultAfter2, resultAfter3]).then((args) => {
      const [result1, result2, result3] = args;

      // @ts-ignore
      expect(isPromiseIsNotActualError(result1.reason)).toBe(true);
      // @ts-ignore
      expect(isPromiseIsNotActualError(result2.reason)).toBe(true);
      // @ts-ignore
      expect(isPromiseIsNotActualError(result3.reason)).toBe(true);
      expect(checkRunQue).toBe(0);
      expect(checkResultQue).toBe(0);
      expect(request1).toHaveBeenCalledTimes(0);
      expect(request2).toHaveBeenCalledTimes(0);
      expect(request3).toHaveBeenCalledTimes(0);
    });
  });
});
