# Implementation Tasks for ADR 002: Explicit Benchmark Registration Interface

These tasks track the implementation of the explicit benchmark registration interface as described in [ADR-002](./adr-002-explicit-benchmark-registration.en.md).

## Tasks

- [x] Update type definitions
  - [x] Define `SyncBenchmarkFunction` type (already existed)
  - [x] Define `AsyncBenchmarkFunction` type (already existed)
  - [x] Update `BenchmarkArguments` interface to include `syncBench` and `asyncBench`
  - [x] Update `BenchmarkRegisterFunction` type
  - [x] Define return type for `syncBench` and `asyncBench` with explicit metadata

- [x] Implement registration functions
  - [x] Implement `syncBench` function to return `{ async: false, fn: SyncBenchmarkFunction }` 
  - [x] Implement `asyncBench` function to return `{ async: true, fn: AsyncBenchmarkFunction }` 
  - [x] Add proper error handling for `asyncBench` (using existing `wrapPromiseBenchmark` implementation)

- [x] Update core benchmark execution logic
  - [x] Modify execution to detect benchmark type based on returned value metadata (`async` flag)
  - [x] Remove function parameter counting logic (`fn.length` checks)
  - [x] Remove support for direct function returns
  - [x] Remove support for Deferred pattern
  - [x] Ensure proper error propagation

- [x] Update tests
  - [x] Add tests for `syncBench` function and its return value
  - [x] Add tests for `asyncBench` function and its return value
  - [x] Test detection of benchmark type based on metadata
  - [x] Update existing tests to use the new API
  - [x] Test error handling in asynchronous benchmarks

- [x] Update examples
  - [x] Update synchronous benchmark examples
  - [x] Update asynchronous benchmark examples
  - [x] Add migration examples from old API to new API

- [x] Update documentation
  - [x] Update README.md with new API examples
  - [x] Create migration guide
  - [x] Document breaking changes
  - [x] Update API documentation

- [x] Version management
  - [x] Update CHANGELOG.md to document breaking changes
