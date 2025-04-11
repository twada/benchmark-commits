# Performance Testing in Local Development

This guide shows how to use `benchmarkDiffWithBaseline` for performance testing during local development.

## Basic Local Testing

When developing performance-sensitive features, you can use the following workflow to ensure your changes don't introduce performance regressions:

1. Create a performance test script (e.g., `perf-test.mjs`):

```javascript
import { benchmarkDiffWithBaseline } from '@twada/benchmark-commits';

// Compare current branch against main
const baseline = {
  git: 'main',
  prepare: ['npm install', 'npm run build']
};

// Run the benchmark
benchmarkDiffWithBaseline(baseline, ({ syncBench, blackhole }) => {
  return syncBench(() => {
    // Your benchmark code here
    const result = yourFunction();
    blackhole(result);
  });
}, {
  maxDegradation: 5,  // Allow up to 5% performance degradation
  exitOnFail: false   // Don't exit, just show results during development
});
```

2. Run the test:

```bash
node perf-test.mjs
```

## Testing Different Implementations

You can also compare multiple implementations side-by-side:

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

// Define branches to test
const specs = [
  { name: 'Current Implementation', git: 'HEAD' },
  { name: 'Original Implementation', git: 'main' },
  { name: 'Alternative Approach', git: 'feature/alternative-algorithm' }
];

// Run benchmarks
runBenchmark(specs, ({ syncBench, blackhole, dir }) => {
  // Import the module from each checked-out version
  const module = require(`${dir}/dist/index.js`);
  
  return syncBench(() => {
    const result = module.performOperation();
    blackhole(result);
  });
});
```

## Creating a Pre-Commit Hook

To automatically check performance before committing changes, create a Git pre-commit hook:

1. Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "Running performance tests..."
node perf-test.mjs
```

2. Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Tips for Effective Local Performance Testing

1. **Consistent Environment**: Close other applications that might affect benchmark results
2. **Multiple Runs**: Run benchmarks multiple times to account for variance
3. **Realistic Workloads**: Test with realistic data that matches production usage
4. **Isolated Tests**: Test specific functions in isolation to pinpoint performance issues
5. **Match CI**: Configure your local tests to match CI tests for consistency