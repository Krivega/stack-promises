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

const creteStackPromises = <T = any>({
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
    { task: desiredTask, index: desiredIndex }: TTaskObject
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
  }) => {
    const taskRunner = tasksStack.find(({ task, index }: { task: TTask; index: number }) => {
      return desiredTask === task && desiredIndex === index;
    });

    if (taskRunner) {
      return taskRunner.promise;
    }

    return undefined;
  };

  const hasLastFromTasksStackByTask = ({ task: desiredTask }: { task: TTask }): boolean => {
    const lastTaskRunner = tasksStack[tasksStack.length - 1];
    const isLastTask = lastTaskRunner?.task === desiredTask;

    return isLastTask;
  };

  const resolveRunner = ({ task, index }: { task: TTask; index: number }) => {
    addToTasksStack({ task, index });

    return () => {
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
    reject: (result: T | Error) => void;
  }) => {
    return ({ results, isSuccessful }: { results: T[]; isSuccessful: boolean }) => {
      const sizePromises = results.length;
      const sizeStackPromises = runnersStack.length;
      const isActual = sizePromises === sizeStackPromises;

      if (isActual) {
        const lastResult = results[results.length - 1];

        if (isSuccessful) {
          return resolve(lastResult);
        }

        return reject(lastResult);
      }

      if (noRejectIsNotActual) {
        const lastResult = results[results.length - 1];

        return resolve(lastResult);
      }

      reject(promiseIsNotActualError);

      return undefined;
    };
  };

  let isCanRunTasks: boolean = false;

  const enableRunTasks = () => {
    isCanRunTasks = true;
  };

  const disableRunTasks = () => {
    isCanRunTasks = false;
  };

  const canRunTask = (): boolean => {
    return isCanRunTasks;
  };

  const runStackPromises = () => {
    enableRunTasks();

    return sequentPromisesList(runnersStack, canRunTask);
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

  const run = (task: TTask) => {
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

export default creteStackPromises;
