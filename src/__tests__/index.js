/* eslint-disable jest/no-conditional-expect */
import delayPromise from 'promise-delay';
import creteStackPromises, { isEmptyStackError, isPromiseIsNotActualError } from '../index';

describe('toLocaleDateString', () => {
  let stackPromises;

  beforeEach(() => {
    stackPromises = creteStackPromises();
  });

  it('empty stack', () => {
    expect.assertions(1);

    return stackPromises().catch((error) => {
      expect(isEmptyStackError(error)).toBe(true);
    });
  });

  it('add not function', () => {
    expect.assertions(1);

    expect(() => stackPromises.add()).toThrow(
      'stackPromises only works with functions that returns a Promise'
    );
  });

  it('1 promise', () => {
    expect.assertions(1);

    stackPromises.add(() => delayPromise(1, 1));

    return stackPromises().then((data) => {
      expect(data).toBe(1);
    });
  });

  it('2 promise with chain add: sync', () => {
    expect.assertions(1);

    stackPromises.add(() => delayPromise(1, 1)).add(() => delayPromise(1, 2));

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('2 promise: sync', () => {
    expect.assertions(1);

    stackPromises.add(() => delayPromise(1, 1));
    stackPromises.add(() => delayPromise(1, 2));

    return stackPromises().then((data) => {
      expect(data).toBe(2);
    });
  });

  it('2 equal promise: sync', () => {
    expect.assertions(3);

    let checkQue = 0;

    const request = jest.fn(() =>
      delayPromise(1, 1).finally(() => {
        checkQue += 1;
      })
    );

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

    stackPromises.add(() =>
      delayPromise(3, 1).finally(() => {
        checkQue += 1;
      })
    );
    stackPromises.add(() =>
      delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      })
    );

    return stackPromises().then((data) => {
      expect(data).toBe(2);
      expect(checkQue).toBe(2);
    });
  });

  it('2 promise: async', () => {
    expect.assertions(5);

    let checkQue = 0;
    const request1 = jest.fn(() =>
      delayPromise(3, 1).finally(() => {
        checkQue += 1;
      })
    );
    const request2 = jest.fn(() =>
      delayPromise(1, 2).finally(() => {
        checkQue *= 2;
      })
    );

    const resultAfter1 = stackPromises.add(request1)();
    const resultAfter2 = stackPromises.add(request2)();

    return Promise.allSettled([resultAfter1, resultAfter2]).then(([{ reason }, { value }]) => {
      expect(isPromiseIsNotActualError(reason)).toBe(true);
      expect(value).toBe(2);
      expect(checkQue).toBe(2);
      expect(request1).toHaveBeenCalledTimes(1);
      expect(request2).toHaveBeenCalledTimes(1);
    });
  });

  it('1 promise rejected', () => {
    expect.assertions(1);

    const error = new Error('error');

    stackPromises.add(() => Promise.reject(error));

    return stackPromises().catch((errorFromStack) => {
      expect(errorFromStack).toBe(error);
    });
  });
});
