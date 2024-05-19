import { sequentPromises } from 'sequent-promises';

const emptyStackError = new Error('Stack is empty');

const getLastItem = <T>(stack: T[]): T | undefined => {
  return stack[stack.length - 1];
};

export const isEmptyStackError = (error: Error) => {
  return error === emptyStackError;
};

export const promiseIsNotActualError = new Error('Promise is not actual');

export const isPromiseIsNotActualError = (error: Error) => {
  return error === promiseIsNotActualError;
};

const notFunctionError = new Error(
  'stackPromises only works with functions that returns a Promise',
);

export const createStackPromises = <T>({
  noRejectIsNotActual = false,
  noRunIsNotActual = false,
}: {
  noRejectIsNotActual?: boolean;
  noRunIsNotActual?: boolean;
} = {}) => {
  type TPromise = Promise<T>;
  type TTask = ({ isActual }: { isActual: boolean }) => TPromise;
  type TRunner = () => TPromise;

  type TTaskObject = {
    task: TTask;
    promise?: TPromise;
    index: number;
  };

  const runnersStack: TRunner[] = [];
  const tasksStack: TTaskObject[] = [];

  const addToTasksStack = ({ task, index }: TTaskObject) => {
    tasksStack.push({ task, index });
  };

  const addPromiseToTasksStack = (
    promise: TPromise,
    { task: desiredTask, index: desiredIndex }: TTaskObject,
  ) => {
    const taskRunner = tasksStack.find(({ task, index }: { task: TTask; index: number }) => {
      return desiredTask === task && desiredIndex === index;
    });

    if (!taskRunner) {
      throw new Error('Task not found');
    }

    if (taskRunner.promise) {
      throw new Error('Task is already running');
    }

    taskRunner.promise = promise;
  };

  const getPromiseFromTasksStackByTask = ({
    task: desiredTask,
    index: desiredIndex,
  }: {
    task: TTask;
    index: number;
    // eslint-disable-next-line @typescript-eslint/promise-function-async
  }) => {
    const taskRunner = tasksStack.find(({ task, index }: { task: TTask; index: number }) => {
      return desiredTask === task && desiredIndex === index;
    });

    if (taskRunner) {
      return taskRunner.promise;
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    return undefined;
  };

  const hasLastFromTasksStackByTask = ({ task: desiredTask }: { task: TTask }): boolean => {
    const lastTaskRunner = getLastItem(tasksStack);
    const isLastTask = lastTaskRunner?.task === desiredTask;

    return isLastTask;
  };

  const resolveRunner = ({ task, index }: { task: TTask; index: number }) => {
    addToTasksStack({ task, index });

    return async () => {
      let promise = getPromiseFromTasksStackByTask({ task, index });
      const isActual = hasLastFromTasksStackByTask({ task });

      if (!promise && noRunIsNotActual && !isActual) {
        return Promise.resolve() as TPromise;
      }

      if (!promise) {
        promise = task({ isActual });
        addPromiseToTasksStack(promise, { task, index });
      }

      return promise;
    };
  };

  const resolveFinishResultPromise = ({
    resolve,
    reject,
  }: {
    resolve: (result: T) => void;
    reject: (result: Error | T) => void;
  }) => {
    return ({ results, isSuccessful }: { results: T[]; isSuccessful: boolean }) => {
      const sizePromises = results.length;
      const sizeStackPromises = runnersStack.length;
      const isActual = sizePromises === sizeStackPromises;

      if (isActual) {
        const lastResult = getLastItem(results);

        if (isSuccessful) {
          resolve(lastResult as T);

          return;
        }

        reject(lastResult as T);

        return;
      }

      if (noRejectIsNotActual) {
        const lastResult = getLastItem(results);

        resolve(lastResult as T);

        return;
      }

      reject(promiseIsNotActualError);
    };
  };

  let isCanRunTasks = false;

  const enableRunTasks = () => {
    isCanRunTasks = true;
  };

  const disableRunTasks = () => {
    isCanRunTasks = false;
  };

  const canRunTask = (): boolean => {
    return isCanRunTasks;
  };

  const runStackPromises = async () => {
    enableRunTasks();

    return sequentPromises(runnersStack, canRunTask);
  };

  const result = async () => {
    if (runnersStack.length === 0) {
      throw emptyStackError;
    }

    return new Promise<T>((resolve, reject) => {
      const finishResultPromise = resolveFinishResultPromise({ resolve, reject });

      runStackPromises()
        .then(finishResultPromise)
        .catch((error: unknown) => {
          finishResultPromise(error as { results: T[]; isSuccessful: boolean });
        });
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

  const run = async (task: TTask) => {
    addTaskToStack(task);

    return result();
  };

  const clearStacks = () => {
    runnersStack.length = 0;
    tasksStack.length = 0;
  };

  const stop = () => {
    disableRunTasks();
    clearStacks();
  };

  result.add = addTaskToStack;
  result.run = run;
  result.stop = stop;

  return result;
};
