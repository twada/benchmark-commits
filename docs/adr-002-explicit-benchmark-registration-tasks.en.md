# Implementation Tasks for ADR 002: Explicit Benchmark Registration Interface

These tasks track the implementation of the explicit benchmark registration interface as described in [ADR-002](./adr-002-explicit-benchmark-registration.en.md).

## Tasks

- [x] Update type definitions
  - [x] Define `SyncBenchmarkFunction` type (already existed)
  - [x] Define `AsyncBenchmarkFunction` type (already existed)
  - [x] Update `BenchmarkArguments` interface to include `syncBench` and `asyncBench`
  - [x] Update `BenchmarkRegisterFunction` type (already matched requirements)

- [x] Implement registration functions
  - [x] Implement `syncBench` function
  - [x] Implement `asyncBench` function
  - [x] Add proper error handling for `asyncBench` (using existing `wrapPromiseBenchmark` implementation)

- [ ] Update core benchmark execution logic
  - [ ] Modify task execution to use the new explicit registration functions
  - [ ] Remove support for direct function returns
  - [ ] Remove support for Deferred pattern
  - [ ] Ensure proper error propagation

- [ ] Update tests
  - [ ] Add tests for `syncBench` function
  - [ ] Add tests for `asyncBench` function
  - [ ] Update existing tests to use the new API
  - [ ] Test error handling in asynchronous benchmarks

- [ ] Update examples
  - [ ] Update synchronous benchmark examples
  - [ ] Update asynchronous benchmark examples
  - [ ] Add migration examples from old API to new API

- [ ] Update documentation
  - [ ] Update README.md with new API examples
  - [ ] Create migration guide
  - [ ] Document breaking changes
  - [ ] Update API documentation

- [ ] Version management
  - [ ] Update package.json for major version increment
  - [ ] Update CHANGELOG.md to document breaking changes
