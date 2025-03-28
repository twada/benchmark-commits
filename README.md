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

runBenchmark(specs, ({ suite, spec, dir }) => {
  return () => {
    // Synchronous operation
    someOperation();
  };
});
```

### Asynchronous Benchmark (Promise-based pattern)

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ suite, spec, dir }) => {
  // Return a function that returns a Promise
  return async () => {
    // Using modern async/await syntax
    const result = await asyncOperation();
    // Process result...
    // Errors are automatically handled
  };
});
```

### Asynchronous Benchmark (Traditional Deferred pattern)

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ suite, spec, dir }) => {
  // Return a function that accepts a deferred object
  return (deferred) => {
    asyncOperation().then(() => {
      // Processing...
      deferred.resolve();
    }).catch(err => {
      console.error(err);
      // Abort the benchmark on error
      deferred.benchmark.abort();
    });
  };
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
  - `register` is a benchmark registration function that returns benchmark function. benchmark registration function takes { suite, spec, dir} as arguments.
    - if `register` function runs synchronously, register benchmark function immediately
    - if `register` function is an async function or returns Promise, register benchmark function asynchronously
    - benchmark function can be one of three types:
      - **Synchronous function** `() => void`: A function with no parameters that runs synchronously
      - **Deferred pattern function** `(deferred) => void`: A function with one parameter that resolves the deferred when the async operation completes
      - **Promise-returning function** `() => Promise<void>`: A function that returns a Promise which resolves when the async operation completes
    - For Promise-returning functions, errors are properly handled and will abort the benchmark
    - if benchmark function takes more than one parameter, skip benchmark registration for that `spec` since benchmark function is invalid
    - if git commit object in `commitsOrSpecs` does not exist in underlying git repository, skip benchmark registration for that `spec`
    - if error occurred while executing registration function, skip benchmark registration for that `spec`
    - if async registration function rejects, skip benchmark registration for that `spec`
    - if benchmark registration function does not return function, skip benchmark registration for that `spec`
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
