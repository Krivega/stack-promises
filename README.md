# stack-promises

[![npm](https://img.shields.io/npm/v/stack-promises?style=flat-square)](https://www.npmjs.com/package/stack-promises)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/stack-promises?style=flat-square)

A stack of tasks that are executed one by one, but the result is taken from the last.
Identical functions on the stack (check by reference) are executed only once.

## Install

npm

```sh
npm install stack-promises
```

yarn

```sh
yarn add stack-promises
```

## Usage

```js
import creteStackPromises from 'stack-promises';

const stackPromises = creteStackPromises();

stackPromises.add(() => Promise.resolve(1));
stackPromises.add(() => Promise.resolve(2));

stackPromises().then(data => {
  console.log(data); /// 2
});
```

### Execute after add

```js
import creteStackPromises from 'stack-promises';

const stackPromises = creteStackPromises();

stackPromises
  .add(() => Promise.resolve(1))() // execute
  .then(data => {
    console.log(data); // 1
  });
stackPromises
  .add(() => Promise.resolve(2))() // execute
  .then(data => {
    console.log(data); // 2
  });

stackPromises().then(data => {
  console.log(data); // 2
});
```

### Add after execute

```js
import creteStackPromises, { isPromiseIsNotActualError } from 'stack-promises';
import delayPromise from 'promise-delay';

const stackPromises = creteStackPromises();

let checkQue = 0;
const request1 = () =>
  delayPromise(3000, 1).finally(() => {
    checkQue += 1;
  });
const resultAfter1 = stackPromises.add(request1)();

const request2 = () =>
  delayPromise(1000, 2).finally(() => {
    checkQue *= 2;
  });
const resultAfter2 = stackPromises.add(request2)();

Promise.allSettled([resultAfter1, resultAfter2]).then(([{ reason }, { value }]) => {
  isPromiseIsNotActualError(reason); // true
  value; // 2
  checkQue; // 2
  // request1 called 1 times
  // request2 called 1 times
});
```

### Chaining

```js
stackPromises.add(() => Promise.resolve(1)).add(() => Promise.resolve(2));
```

## Run tests

```sh
npm test
```

## Maintainer

**Krivega Dmitriy**

- Website: https://krivega.com
- Github: [@Krivega](https://github.com/Krivega)

## Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Krivega/stack-promises/issues). You can also take a look at the [contributing guide](https://github.com/Krivega/stack-promises/blob/master/CONTRIBUTING.md).

## 📝 License

Copyright © 2020 [Krivega Dmitriy](https://github.com/Krivega).<br />
This project is [MIT](https://github.com/Krivega/stack-promises/blob/master/LICENSE) licensed.
