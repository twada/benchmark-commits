# ADR-005: Error Logging in Suite Setup - Implementation Tasks

This document outlines the tasks required to implement the error logging functionality in the `SuiteSetup` class as described in [ADR-005](./adr-005-error-logging-in-suite-setup.en.md).

## Implementation Tasks

The implementation is divided into two phases:
1. Type-level refactoring - moving and reorganizing logger types
2. Functional implementation - adding error logging to async benchmarks

### Phase 1: Type-level Refactoring

#### 1.1. Update `suite-setup.mts`

- [x] Add `BenchmarkLogger` interface definition
- [x] Add `ConsoleLogger` class implementation
- [x] Add logger property to `SuiteSetup` class
- [x] Update `SuiteSetup` constructor to accept optional logger parameter (with default implementation)
- [x] Update `setupSuite` function to accept optional logger parameter
- [x] Export `BenchmarkLogger` type and `ConsoleLogger` class

#### 1.2. Update `run-benchmark.mts`

- [ ] Remove local `BenchmarkLogger` interface definition
- [ ] Remove local `ConsoleLogger` class implementation
- [ ] Import `BenchmarkLogger` and `ConsoleLogger` from `suite-setup.mts`
- [ ] Update `setupSuite` call to pass the logger
- [ ] Keep `BenchmarkOptions` type that references the imported `BenchmarkLogger`

#### 1.3. Update `benchmark-diff.mts`

- [ ] Remove local `ConsoleLogger` class if present
- [ ] Import `ConsoleLogger` from `suite-setup.mts`
- [ ] Keep references to `BenchmarkLogger` updated with the new import

#### 1.4. Update `index.mts`

- [ ] Export `BenchmarkLogger` type from `suite-setup.mts`

#### 1.5. Verify type-level changes

- [ ] Run TypeScript compiler to verify no type errors
- [ ] Run existing tests to ensure they still pass
- [ ] Run linting to ensure code style compliance

### Phase 2: Implementing Error Logging Functionality

#### 2.1. Update `wrapPromiseBenchmark` in `suite-setup.mts`

- [ ] Modify signature to accept a logger parameter
- [ ] Implement error logging in the catch block
- [ ] Update all calls to `wrapPromiseBenchmark` to pass the logger

#### 2.2. Update `runSetup` function in `suite-setup.mts`

- [ ] Ensure `wrapPromiseBenchmark` is called with the logger

#### 2.3. Create tests for error logging

- [ ] Create a mock logger for testing
- [ ] Add tests for asynchronous benchmark failures
- [ ] Verify error messages are properly logged

#### 2.4. Documentation

- [ ] Update API documentation to reflect error logging capability
- [ ] Add examples of custom error logging implementation
- [ ] Document error handling improvements

#### 2.5. Final Review

- [ ] Check for any circular dependencies
- [ ] Verify backward compatibility
- [ ] Ensure tests are passing
- [ ] Prepare pull request with description referencing ADR-005

## Notes

- The approach of separating type refactoring from functional implementation minimizes risks
- Each phase should be verified independently before moving to the next
- Make sure error messages are informative and actionable
- Ensure existing functionality remains working after each change
- Follow existing coding style and conventions
