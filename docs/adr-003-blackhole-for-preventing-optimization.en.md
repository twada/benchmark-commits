# ADR 003: Introducing Blackhole Functionality to Prevent Optimization

## Status

Accepted

## Context

When using the benchmark-commits library, JIT compiler optimizations can interfere with accurate measurements. In particular, if the results of benchmarked calculations are not actually used, there is a risk that code may be eliminated or aggressively optimized through "dead code elimination".

Currently, to avoid this problem, the following comment and corresponding code are necessary:

```javascript
runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  return syncBench(() => {
    // Synchronous operation to benchmark
    const result = someOperation();
    // Use result to avoid dead code elimination
    // Need to use the result in some way
  });
});
```

While this pattern is mentioned in the documentation, the optimal implementation method is not clear to users. Saving results to global variables or "using" them inappropriately may compromise the accuracy of the benchmark itself.

## Decision

We will introduce a "blackhole" feature to explicitly and efficiently prevent optimization of benchmark results. This feature will be added to the `BenchmarkArguments` interface and can be used as follows:

```javascript
runBenchmark(specs, ({ suite, spec, dir, syncBench, blackhole }) => {
  return syncBench(() => {
    const result = someOperation();
    // Explicitly "consume" the result
    blackhole(result);
  });
});
```

The implementation of the blackhole function is as follows:

```javascript
const blackhole = (() => {
  // Use a structure that is difficult to statically analyze
  const sink = new WeakMap();
  const keys = [];
  let keyIndex = 0;
  
  // Generate multiple keys at initialization
  for (let i = 0; i < 32; i++) {
    keys.push({});
  }
  
  return (value) => {
    // Use cycling keys (memory efficient)
    const key = keys[keyIndex];
    keyIndex = (keyIndex + 1) & 31; // Cycle in the range 0-31
    
    // Store in WeakMap (shows the JIT that the value is being used)
    sink.set(key, value);
  };
})();
```

## Rationale

This implementation approach has the following advantages:

1. **Reliable optimization prevention**: The internal workings of WeakMap are difficult for JavaScript engines to statically analyze and optimize, effectively preventing code elimination.

2. **Minimal overhead**: 
   - Avoids time-dependent or random operations (such as `new Date()`, `Math.random()`, etc.)
   - Efficient memory management through key reuse
   - Fast implementation using bit operations

3. **Simple implementation**: The code is simple and easy to understand, making future maintenance easier.

4. **Memory efficiency**: Uses only a small number of fixed objects and minimizes impact on garbage collection through WeakMap.

5. **Deterministic behavior**: Lacks randomness, ensuring consistency in benchmark results between different runs.

### Relationship with Benchmark.js

Even if Benchmark.js already implements internal measures against optimization, providing the blackhole feature still has significant value:

1. **Explicit interface**: Provides users with an explicit, standardized interface for consuming benchmark result values. This makes the code's intention clear, improving readability and maintainability.

2. **Minimal overhead**: The proposed implementation is highly efficient; even if Benchmark.js internally has similar functionality, the additional overhead would be negligible.

3. **Future compatibility**: Considering the possibility of migrating to a different benchmark tool in the future, providing the blackhole feature as an explicit API allows changing the internal implementation without affecting user code.

4. **Educational value**: Providing the blackhole feature and explaining its purpose in documentation has educational value in deepening users' understanding of JIT compiler optimizations and their impact.

## Consequences

### Positive Consequences

1. **Improved benchmark accuracy**: Prevents code elimination through optimization, enabling more realistic performance measurements.

2. **Standardized usage**: Users can prevent optimization in a standard way, making the interface clearer.

3. **Code readability**: Benchmark code will be written with explicit intent, improving readability.

### Negative Consequences

1. **API extension**: A new property needs to be added to the `BenchmarkArguments` interface, requiring type definition updates.

2. **Slight overhead**: The blackhole feature itself has an execution cost, though this is minimized.

## Implementation Plan

1. Add the `blackhole` function to the `BenchmarkArguments` interface in `suite-setup.mts`

2. Add the blackhole function implementation to `suite-setup.mts`

3. Update README and documentation to explain the usage and purpose of the blackhole feature

4. Add tests to verify that blackhole can actually prevent optimization

### Detailed Testing Plan

#### Integration Testing Plan
To verify that the blackhole feature effectively prevents JIT compiler optimization, we will conduct the following tests:

- Create test cases with typical code patterns that are prone to optimization (e.g., unnecessary calculations or functions that don't use their results)
- Run the same code in two versions:
  1. A version without the blackhole feature
  2. A version using the blackhole feature
- Compare execution times and performance metrics to verify that the version without blackhole isn't "artificially fast" due to code elimination through optimization

#### Effectiveness Demonstration Plan
To demonstrate the effectiveness of the blackhole feature visually and quantitatively, we will create the following comparison:

- Prepare benchmark cases with these characteristics:
  - Includes calculations whose results are clearly needed but not used
  - Simple algorithms that are easily optimized by JIT
  
- Compare three versions:
  1. A version that doesn't use the results at all (likely to be optimized)
  2. A version that uses the results in an intentionally inappropriate way (e.g., assigning to a global variable)
  3. A version using the blackhole feature
  
- Measure execution times and cycle counts for these versions, and visualize them with graphs if possible
- If possible, use V8 optimization traces or profiling tools to show the differences in JIT compiler behavior between versions

## Related Decisions

- ADR-002 (Explicit Benchmark Registration Interface): This change further extends that design.
