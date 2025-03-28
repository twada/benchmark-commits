# ADR 001: Promise-Based Asynchronous Benchmarks

## Status

Accepted

## Context

Currently, the benchmark-commits library uses the `Deferred` pattern from [Benchmark.js](https://benchmarkjs.com/) for asynchronous benchmarks. This pattern is implemented as follows:

```javascript
return (deferred) => {
  asyncOperation().then(() => {
    // processing...
    deferred.resolve();
  }).catch(err => {
    console.error(err);
    deferred.resolve(); // problematic part
  });
};
```

This implementation has the following issues:

1. **Outdated Pattern**: The `Deferred` pattern is an older pattern that predates the widespread adoption of Promises.
2. **Inappropriate Error Handling**: Calling `deferred.resolve()` even in case of errors can lead to failed operations being incorrectly measured as "fast".
3. **Verbose Syntax**: The code is verbose and less readable compared to modern JavaScript's async/await.
4. **Learning Curve**: Users need to learn a special pattern that differs from standard Promise patterns.

## Decision

We have decided to implement the following changes:

1. **Add Promise-based Interface**: Accept functions in the form of `() => Promise<void>` as benchmark functions.
2. **Internal Conversion to Deferred**: Convert Promise-returning functions internally to the Deferred pattern to maintain compatibility with Benchmark.js.
3. **Proper Error Handling**: When an error occurs in asynchronous processing, call `deferred.benchmark.abort()` to abort the benchmark.
4. **Maintain Backward Compatibility**: Continue to support functions in the traditional Deferred format.

Specific implementation:

```typescript
// New type definitions
type SyncBenchmarkFunction = () => void;
type AsyncBenchmarkFunction = () => Promise<void>;
type BenchmarkFunction = SyncBenchmarkFunction | AsyncBenchmarkFunction;

// Function to wrap Promises
function wrapPromiseBenchmark(fn: () => Promise<void>): (deferred: Deferred) => void {
  return function(deferred: Deferred) {
    try {
      fn().then(() => {
        deferred.resolve();
      }).catch(err => {
        console.error('Benchmark error:', err);
        deferred.benchmark.abort(); // Abort benchmark on error
      });
    } catch (err) {
      console.error('Benchmark execution error:', err);
      deferred.benchmark.abort(); // Also abort on synchronous errors
    }
  };
}
```

## Consequences

### Positive Impact

1. **Modern Code**: Users can write modern asynchronous benchmark code using async/await.
2. **Clearer Error Handling**: Benchmark errors are handled appropriately, preventing misleading results.
3. **Intuitive API**: Design aligned with JavaScript's standard patterns reduces learning costs.
4. **Improved Maintainability**: Code becomes clearer and easier to understand, facilitating future extensions.

### Negative Impact

1. **Impact on Existing Code**: Existing Deferred pattern code will continue to work, but error handling behavior may change (though this is considered an improvement).
2. **Implementation Complexity**: Internally, conversion logic is needed to support both patterns.

### Usage Examples

**Previous Pattern**:
```javascript
runBenchmark(specs, async ({ suite, spec, dir }) => {
  return (deferred) => {
    asyncOperation().then(() => {
      // processing...
      deferred.resolve();
    }).catch(err => {
      console.error(err);
      deferred.resolve(); // problematic part
    });
  };
});
```

**New Pattern**:
```javascript
runBenchmark(specs, async ({ suite, spec, dir }) => {
  return async () => {
    const result = await asyncOperation();
    // processing...
    // Errors automatically become Promise.reject and deferred.benchmark.abort() is called internally
  };
});
```

## Implementation Notes

1. Implement `isAsyncFunction` and `isPromiseReturning` functions to detect whether a function returns a Promise.
2. Errors during benchmarking are logged and the benchmark is aborted.
3. Document both the new Promise-based pattern and the traditional Deferred pattern in the README.
