# ADR-005: Error Logging in Suite Setup

## Status

Accepted

## Context

Currently, the `wrapPromiseBenchmark` function in `suite-setup.mts` has a TODO comment:

```typescript
function wrapPromiseBenchmark (fn: AsyncBenchmarkFunction): AsyncDeferredFunction {
  return function (deferred: Deferred) {
    fn().then(() => {
      deferred.resolve();
    }).catch(_err => {
      // TODO: propagate error report to the suite logger
      deferred.benchmark.abort();
      deferred.resolve();
    });
  };
}
```

This function catches errors in asynchronous benchmarks but does not log them appropriately. The issue is that `suite-setup.mts` doesn't have access to a logger.

Other modules like `run-benchmark.mts` and `benchmark-diff.mts` use a `BenchmarkLogger` interface to decouple from direct console dependencies, which improves testability. We want to extend this pattern to `suite-setup.mts` as well.

However, we need to be careful about dependencies. The current dependency direction is:
- `run-benchmark.mts` -> `suite-setup.mts`
- `benchmark-diff.mts` -> `run-benchmark.mts` -> `suite-setup.mts`

Adding a dependency from `suite-setup.mts` to `run-benchmark.mts` would create a circular dependency, which must be avoided.

## Decision

We will:

1. Move the `BenchmarkLogger` interface definition to `suite-setup.mts` and have other modules import it from there
2. Add a `logger` parameter to the `SuiteSetup` constructor and the `setupSuite` function
3. Implement error logging in the `wrapPromiseBenchmark` function
4. Update `index.mts` to export the `BenchmarkLogger` type

### Changes in `suite-setup.mts`:

```typescript
/**
 * Interface for logging benchmark progress and results
 */
export type BenchmarkLogger = {
  log (message?: any, ...optionalParams: any[]): void;
  error (message?: any, ...optionalParams: any[]): void;
};

/**
 * Default console-based implementation of BenchmarkLogger
 */
export class ConsoleLogger implements BenchmarkLogger {
  log (message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
  }

  error (message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }
}

class SuiteSetup extends EventEmitter {
  readonly suite: BenchmarkSuite;
  readonly workDir: string;
  readonly logger: BenchmarkLogger;

  constructor (suite: BenchmarkSuite, workDir: string, logger: BenchmarkLogger = new ConsoleLogger()) {
    super();
    this.suite = suite;
    this.workDir = workDir;
    this.logger = logger;
  }

  // ...
}

function wrapPromiseBenchmark (fn: AsyncBenchmarkFunction, logger: BenchmarkLogger): AsyncDeferredFunction {
  return function (deferred: Deferred) {
    fn().then(() => {
      deferred.resolve();
    }).catch(err => {
      // Propagate error to the logger
      logger.error(`Benchmark execution error: ${err.message}`, err);
      deferred.benchmark.abort();
      deferred.resolve();
    });
  };
}

// Update setupSuite function to accept logger
function setupSuite (suite: BenchmarkSuite, workDir: string, logger?: BenchmarkLogger): SuiteSetup {
  return new SuiteSetup(suite, workDir, logger);
}
```

### Changes in `run-benchmark.mts` and `benchmark-diff.mts`:

Remove the local `BenchmarkLogger` definition and import it from `suite-setup.mts`.

### Changes in `index.mts`:

```typescript
export type {
  // ...existing types
  BenchmarkLogger // Add this
} from './suite-setup.mjs';
```

## Consequences

### Positive:

1. Proper error logging for benchmark failures, improving debuggability
2. Consistent logger interface across all components
3. Improved testability by allowing injection of mock loggers
4. No circular dependencies
5. Single source of truth for the `BenchmarkLogger` interface
6. Backward compatibility maintained through default parameters

### Negative:

1. Minor refactoring required in multiple files
2. Module boundaries are slightly shifted as `suite-setup.mts` now has more responsibilities

### Neutral:

1. The dependency direction is now more appropriately aligned with the conceptual architecture, with `suite-setup.mts` providing core functionality

## Implementation Strategy

The implementation will be divided into two phases to minimize risk and ensure stability:

### Phase 1: Type-level Refactoring

First, we will focus on moving and reorganizing the logger types:

1. Move the `BenchmarkLogger` interface definition to `suite-setup.mts`
2. Add the `ConsoleLogger` implementation to `suite-setup.mts`
3. Update the `SuiteSetup` class to include logger property
4. Update imports across all modules
5. Export the `BenchmarkLogger` type from `index.mts`

After completing Phase 1, we will run type checking, linting, and existing tests to ensure that the refactoring didn't introduce any issues.

### Phase 2: Implementing Error Logging

Once Phase 1 is stable, we will:

1. Update the `wrapPromiseBenchmark` function to accept and use a logger
2. Implement proper error logging in the catch block
3. Create tests to verify the error logging functionality
4. Update documentation to reflect these changes

## Implementation Notes

When implementing this change, make sure to:

1. Update all tests to use mock loggers when appropriate
2. Ensure error messages are informative and actionable
3. Verify that no circular dependencies are introduced
4. Maintain backward compatibility at each step
