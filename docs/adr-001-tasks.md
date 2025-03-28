# Implementation Tasks for ADR 001: Promise-Based Asynchronous Benchmarks

These tasks track the implementation of the Promise-based async benchmarks feature as described in [ADR-001](./adr-001-promise-based-async-benchmarks.en.md).

## Tasks

- [x] Create type definitions for benchmark functions
  - [x] Define `SyncBenchmarkFunction` type
  - [x] Define `AsyncBenchmarkFunction` type
  - [x] Define composite `BenchmarkFunction` type

- [x] Implement utility functions
  - [x] Implement `isAsyncFunction` function to detect async functions
  - [x] Implement `isPromiseReturning` function to detect functions that return Promises

- [x] Implement Promise wrapper functionality
  - [x] Create `wrapPromiseBenchmark` function to convert Promise-returning functions to Deferred pattern
  - [x] Add proper error handling with `deferred.benchmark.abort()`
  - [x] Support both synchronous and asynchronous errors

- [x] Update core benchmark execution logic
  - [x] Modify task execution to detect and handle Promise-returning functions
  - [x] Maintain backward compatibility with Deferred pattern
  - [x] Ensure proper error propagation

- [ ] Add tests
  - [ ] Test synchronous benchmarks still work
  - [ ] Test async functions with Promise return
  - [ ] Test error handling in Promise-based benchmarks
  - [ ] Test backward compatibility with Deferred pattern

- [ ] Update examples
  - [ ] Create example for Promise-based async benchmarks
  - [ ] Update existing examples to show both patterns

- [ ] Update documentation
  - [ ] Update README with new Promise-based pattern examples
  - [ ] Document error handling behavior
  - [ ] Update API documentation