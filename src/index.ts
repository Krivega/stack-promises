import sequentPromisesList from 'sequent-promises';

const emptyStackError = new Error('Stack is empty');
export const isEmptyStackError = (error: Error) => {
  return error === emptyStackError;
};
export const promiseIsNotActualError = new Error('Promise is not actual');
export const isPromiseIsNotActualError = (error: Error) => {
  return error === promiseIsNotActualError;
};
const notFunctionError = new Error(
  'stackPromises only works with functions that returns a Promise'
);

const creteStackPromises = <T = any>() => {
  type TPromise = Promise<T>;
  type TTask = () => TPromise;
  type TRunner = () => TPromise;

  type TTaskObject = {
    task: TTask;
    promise: TPromise;
    index: number;
  };

  const runnersStack: TRunner[] = [];
  const tasksStack: TTaskObject[] = [];

  const addToTasksStack = ({ task, promise, index }: TTaskObject) => {
    tasksStack.push({ task, promise, index });
  };
  const getPromiseFromTasksStackByTask = ({
    task: desiredTask,
    index: desiredIndex,
  }: {
    task: TTask;
    index: number;
  }) => {
    const taskRunner = tasksStack.find(({ task, index }: { task: TTask; index: number }) => {
      return desiredTask === task && desiredIndex === index;
    });

    if (taskRunner) {
      return taskRunner.promise;
    }

    return undefined;
  };

  const resolveRunner = ({ task, index }: { task: TTask; index: number }) => {
    return () => {
      let promise = getPromiseFromTasksStackByTask({ task, index });

      if (!promise) {
        promise = task();
        addToTasksStack({ promise, task, index });
      }

      return promise;
    };
  };

  const resolveFinishResultPromise = ({
    resolve,
    reject,
  }: {
    resolve: (result: T) => void;
    reject: (result: T | Error) => void;
  }) => {
    return ({ results, isSuccessful }: { results: T[]; isSuccessful: boolean }) => {
      const sizePromises = results.length;
      const sizeStackPromises = runnersStack.length;

      if (sizePromises === sizeStackPromises) {
        const lastResult = results[results.length - 1];

        if (isSuccessful) {
          resolve(lastResult);
        } else {
          reject(lastResult);
        }
      } else {
        reject(promiseIsNotActualError);
      }
    };
  };

  const runStackPromises = () => {
    return sequentPromisesList(runnersStack);
  };

  const result = () => {
    if (runnersStack.length === 0) {
      return Promise.reject(emptyStackError);
    }

    return new Promise<T | Error>((resolve, reject) => {
      const finishResultPromise = resolveFinishResultPromise({ resolve, reject });

      runStackPromises().then(finishResultPromise).catch(finishResultPromise);
    });
  };

  const addTaskToStack = (task: TTask) => {
    if (typeof task !== 'function') {
      throw notFunctionError;
    }

    const index = runnersStack.length;

    runnersStack.push(resolveRunner({ task, index }));

    return result;
  };

  result.add = addTaskToStack;

  return result;
};

export default creteStackPromises;
