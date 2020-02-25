import sequentPromisesList from 'sequent-promises';

const emptyStackError = new Error('Stack is empty');
export const isEmptyStackError = error => error === emptyStackError;
const promiseIsNotActualError = new Error('Promise is not actual');
export const isPromiseIsNotActualError = error => error === promiseIsNotActualError;
const notFunctionError = new Error(
  'stackPromises only works with functions that returns a Promise'
);
const creteStackPromises = () => {
  const promisesStack = [];
  const tasksStack = [];

  const addToTasksStack = ({ task, promise, index }) => tasksStack.push({ task, promise, index });
  const getPromiseFromTasksStackByTask = ({ task: desiredTask, index: desiredIndex }) => {
    const taskRunner = tasksStack.find(
      ({ task, index }) => desiredTask === task && desiredIndex === index
    );

    if (taskRunner) {
      return taskRunner.promise;
    }

    return undefined;
  };

  const resolveTask = ({ task, index }) => () => {
    let promise = getPromiseFromTasksStackByTask({ task, index });

    if (!promise) {
      promise = task();
      addToTasksStack({ promise, task, index });
    }

    return promise;
  };

  const resolveFinishResultPromise = ({ resolve, reject }) => ({ results, errors }) => {
    const sizePromises = results.length + errors.length;
    const sizeStackPromises = promisesStack.length;

    if (sizePromises === sizeStackPromises) {
      const lastResult = results[results.length - 1];

      resolve(lastResult);
    } else {
      reject(promiseIsNotActualError);
    }
  };

  const runStackPromises = () => sequentPromisesList(promisesStack);

  const result = () => {
    if (promisesStack.length === 0) {
      return Promise.reject(emptyStackError);
    }

    return new Promise((resolve, reject) => {
      const finishResultPromise = resolveFinishResultPromise({ resolve, reject });

      runStackPromises()
        .then(finishResultPromise)
        .catch(finishResultPromise);
    });
  };

  const addTaskToStack = task => {
    if (typeof task !== 'function') {
      throw notFunctionError;
    }

    const index = promisesStack.length;

    promisesStack.push(resolveTask({ task, index }));

    return result;
  };

  result.add = addTaskToStack;

  return result;
};

export default creteStackPromises;
