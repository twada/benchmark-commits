# ADR 002: Explicit Benchmark Registration Interface

## Status

Accepted

## Context

The benchmark-commits library currently supports multiple patterns for registering benchmark functions:

1. Directly returning a synchronous function
2. Using the Deferred pattern for asynchronous functions
3. Promise-based asynchronous functions (added in ADR-001)

Specifically, for Promise-based asynchronous functions, the following detection logic is used to determine at runtime whether a function is asynchronous:

```javascript
function isPromiseReturning (fn: Function): boolean {
  // AsyncFunction always returns Promise
  if (isAsyncFunction(fn)) {
    return true;
  }
  
  try {
    // Test if function returns a Promise-like object by executing it with dummy values
    const result = fn();
    return Boolean(result && typeof result.then === 'function');
  } catch (error) {
    // If execution fails, assume it's not Promise-returning
    return false;
  }
}
```

This approach has several issues:

1. It requires actually executing the function
2. Errors may occur during execution
3. Functions with side effects may cause unintended behavior
4. Functions that require arguments may not work correctly as they're called without dummy values

To resolve these issues, we need to transition to an API that allows explicitly specifying the nature of the function (synchronous or asynchronous).

## Decision

We have decided to adopt the following new API design:

1. Provide two explicit functions: `syncBench` and `asyncBench`
2. Discontinue support for the Deferred pattern and the traditional method of directly returning functions (breaking change)
3. Release as a major version upgrade, following semantic versioning

Specific type definitions:

```typescript
// Benchmark function type definitions
type SyncBenchmarkFunction = () => void;
type AsyncBenchmarkFunction = () => Promise<void>;

// Execution environment type definition
interface BenchmarkArguments {
  suite: BenchmarkSuite;
  spec: NormalizedBenchmarkSpec;
  dir: string;
  syncBench: (fn: SyncBenchmarkFunction) => BenchmarkFunction;
  asyncBench: (fn: AsyncBenchmarkFunction) => BenchmarkFunction;
}

// Benchmark registration function type definition
type BenchmarkRegisterFunction = (
  benchmarkArguments: BenchmarkArguments
) => BenchmarkFunction | Promise<BenchmarkFunction>;
```

## Usage Examples

### Synchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ syncBench, suite, spec, dir }) => {
  return syncBench(() => {
    // Synchronous operation
    someOperation();
  });
});
```

### Asynchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

runBenchmark(specs, ({ asyncBench, suite, spec, dir }) => {
  return asyncBench(async () => {
    // Asynchronous operation
    const result = await asyncOperation();
    // Processing...
  });
});
```

## Positive Consequences

1. **Consistency and symmetry in design**: Providing explicit methods for both synchronous and asynchronous operations improves API consistency.
2. **Enhanced type safety**: TypeScript's type checking becomes more effective, preventing misuse at compile time.
3. **Self-documenting code**: Intentions become clearer, improving code readability.
4. **Simplified implementation**: No need to determine the function type at runtime, making the implementation simpler.
5. **Future extensibility**: Other types of benchmarking methods can be added using the same pattern.

## Negative Consequences

1. **Breaking changes**: Existing code will need to be migrated to the new API.
2. **Learning curve**: Users will need to learn the new API.

## Implementation Notes

1. Add `syncBench` and `asyncBench` functions to `BenchmarkArguments`
2. Remove support for the Deferred pattern
3. Remove support for directly returning functions
4. Implement appropriate error handling
5. Update documentation and provide migration guides

## Migration Path

1. Update the major version according to semantic versioning
2. Provide a migration guide (update README.md)
3. Provide concrete examples for migrating existing code to the new API

This design improves API consistency and implementation simplicity while ensuring future extensibility. By including breaking changes, we can minimize design compromises.
