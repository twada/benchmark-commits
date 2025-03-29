benchmark-commits
================================

Run benchmark on specified git commits.

[![Build Status][ci-image]][ci-url]
[![NPM version][npm-image]][npm-url]
[![Code Style][style-image]][style-url]
[![License][license-image]][license-url]
![Supported Node Version](https://img.shields.io/node/v/%40twada%2Fbenchmark-commits)


INSTALL
---------------------------------------

```sh
$ npm install @twada/benchmark-commits
```

USAGE
---------------------------------------

### Synchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  return syncBench(() => {
    // Synchronous operation
    someOperation();
  });
});
```

### Asynchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  return asyncBench(async () => {
    // Using modern async/await syntax
    const result = await asyncOperation();
    // Process result...
    // Errors are automatically handled
  });
});
```

MIGRATION GUIDE
---------------------------------------

### From v0.3.x to v0.4.x

Version 0.4.0 introduces a breaking change in the API for registering benchmark functions. 
The main changes are:

1. Explicit registration functions `syncBench` and `asyncBench` are now required
2. Traditional Deferred pattern is no longer supported
3. Direct function returns are no longer supported

#### Migrating Synchronous Benchmarks

Before:
```javascript
runBenchmark(specs, ({ suite, spec, dir }) => {
  return () => {
    // Synchronous operation
  };
});
```

After:
```javascript
runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  return syncBench(() => {
    // Synchronous operation
  });
});
```

#### Migrating Deferred Pattern Async Benchmarks

Before:
```javascript
runBenchmark(specs, ({ suite, spec, dir }) => {
  return (deferred) => {
    setTimeout(() => {
      // Async operation
      deferred.resolve();
    }, 100);
  };
});
```

After:
```javascript
runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  return asyncBench(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    // Async operation
  });
});
```

#### Migrating Promise-based Async Benchmarks

Before:
```javascript
runBenchmark(specs, ({ suite, spec, dir }) => {
  return async () => {
    // Async operation
    await someAsyncOperation();
  };
});
```

After:
```javascript
runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  return asyncBench(async () => {
    // Async operation
    await someAsyncOperation();
  });
});
```


SPEC
---------------------------------------

### runBenchmark(commitsOrSpecs, register): run benchmark for given `commitsOrSpecs`. Each benchmark function is registered via `register` function
  - if all benchmark executions have finished (at least one benchmark was successful), output benchmark result then resolve with benchmark suite
  - if all benchmark executions have failed, reject with Error

  - `commitsOrSpecs` is an array of either (1) string specifying git tag/branch/commit or (2) object having `name`, `git`, `prepare` and `workdir` properties, pointing to git object to be checked out for the benchmark
    - internally, each item in `commitsOrSpecs` is normalized to `spec` object in {name, git, prepare} form
      - if `commitsOrSpecs` is an array of string specifying git tag/branch/commit
        - converts each string to {name, git, prepare} form. name === git in this case.
        - use git object name as benchmark name
      - if `commitsOrSpecs` is already an array of `spec` object having {name, git} form
        - use them as `spec` object with default prepare
        - generated benchmark name is `name(git)`
  - `register` is a benchmark registration function that returns a benchmark registration object. benchmark registration function takes { suite, spec, dir, syncBench, asyncBench} as arguments.
    - `syncBench` and `asyncBench` are functions provided to explicitly register synchronous or asynchronous benchmarks
    - if `register` function runs synchronously, register benchmark function immediately
    - if `register` function is an async function or returns Promise, register benchmark function asynchronously
    - benchmark function must be registered using one of two methods:
      - **syncBench** `syncBench(() => void)`: For registering synchronous benchmark functions
      - **asyncBench** `asyncBench(async () => Promise<void>)`: For registering asynchronous benchmark functions that return Promises
    - Errors in asynchronous benchmarks are properly handled and will abort the benchmark
    - if git commit object in `commitsOrSpecs` does not exist in underlying git repository, skip benchmark registration for that `spec`
    - if error occurred while executing registration function, skip benchmark registration for that `spec`
    - if async registration function rejects, skip benchmark registration for that `spec`
    - if benchmark registration function does not return a valid registration object, skip benchmark registration for that `spec`
    - if all benchmark registrations have skipped, rejects with Error


AUTHOR
---------------------------------------
* [Takuto Wada](https://github.com/twada)


LICENSE
---------------------------------------
Licensed under the [MIT](https://twada.mit-license.org) license.

[ci-image]: https://github.com/twada/benchmark-commits/workflows/Node.js%20CI/badge.svg
[ci-url]: https://github.com/twada/benchmark-commits/actions?query=workflow%3A%22Node.js+CI%22

[npm-url]: https://npmjs.org/package/@twada/benchmark-commits
[npm-image]: https://badge.fury.io/js/%40twada%2Fbenchmark-commits.svg

[style-url]: https://github.com/neostandard/neostandard
[style-image]: https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat

[license-url]: https://twada.mit-license.org
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg
