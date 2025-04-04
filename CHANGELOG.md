## Unreleased


### Features

* Implement explicit benchmark registration interface ([ADR-002](./docs/adr-002-explicit-benchmark-registration.en.md))
  * Added explicit `syncBench` and `asyncBench` functions to register benchmark functions
  * Updated all examples and documentation
  * Added migration guide

### BREAKING CHANGES

* Removed support for direct function returns
* Removed support for Deferred pattern


### Migration Guide From v0.3.x to v0.4.x

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


### [0.3.1](http://github.com/twada/benchmark-commits/releases/tag/v0.3.1) (2023-12-30)


#### Bug Fixes

* wait for rmSync finish removing work dir ([931ef957](http://github.com/twada/benchmark-commits/commit/931ef957d76cbc5eb344b16b6ea239bd3c12b7ca))


## [0.3.0](http://github.com/twada/benchmark-commits/releases/tag/v0.3.0) (2023-12-24)


#### Features

* `prepare` option to configure multi-step preparations ([e9953743](http://github.com/twada/benchmark-commits/commit/e995374385c17f33d60986d89bd6b9d9987f0a21))
* `workspace` option to work with monorepo ([c89fc8f5](http://github.com/twada/benchmark-commits/commit/c89fc8f5c595c495c8249d28fa25f0ba2074a0d4))
  * now `dir` points to workspace when workspace option is provided ([8aaa1688](http://github.com/twada/benchmark-commits/commit/8aaa1688deb9fac77a9afc7aff7ce34e50fe8dc4))


## [0.2.0](http://github.com/twada/benchmark-commits/releases/tag/v0.2.0) (2023-12-18)


#### Features

* [Move codebase to TypeScript](https://github.com/twada/benchmark-commits/pull/2)
* [Support deferred function](https://github.com/twada/benchmark-commits/pull/3)
* strict arity check of parameters ([4573abcd](http://github.com/twada/benchmark-commits/commit/4573abcde6127a6c4b62ded7605b2f6be5681814))
* **tsconfig:** set compilerOptions.module and compilerOptions.moduleResolution to "node16" ([a4b8eb5d](http://github.com/twada/benchmark-commits/commit/a4b8eb5dc0d0c469539e61c2d2a1cc6a3f270a69))


## [0.1.0](http://github.com/twada/benchmark-commits/releases/tag/v0.1.0) (2022-07-25)


#### Features

* first release
