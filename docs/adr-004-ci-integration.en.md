# ADR-004: CI Integration for Performance Testing

## Status

Accepted

## Date

2025-04-08

## Context

The `benchmark-commits` tool already provides functionality to compare benchmarks across multiple git commits, tags, or branches. However, using it in CI (Continuous Integration) environments requires additional features to automatically validate that performance has not degraded in a pull request compared to the baseline branch.

The main scenarios we want to support are:

1. **CI automation**: Automatically detect performance regressions in pull requests
2. **Local verification**: Allow developers to verify performance before creating a pull request

Currently, users need to manually configure benchmark specs and interpret results, which is not ideal for CI environments where we need automated pass/fail decisions.

## Decision

We will add a new specialized API for CI integration called `runCIBenchmark` with the following features:

1. Simplified API that only requires baseline branch information
2. Automatic detection of the PR branch (from CI environment variables)
3. Automatic performance analysis against configurable thresholds
4. Process exit code control for CI integration
5. Clear, standardized reporting of performance changes

### API Design

The `runCIBenchmark` function will have the following signature:

```typescript
function runCIBenchmark(
  baseline: CIBaseline,
  register: BenchmarkRegisterFunction,
  options?: CIOptions
): Promise<{
  suite: Benchmark.Suite;
  result: AnalysisResult;
}>;

// Types
type CIBaseline = {
  git: string;           // Baseline git reference (commit, tag, branch)
  prepare?: string[];    // Optional preparation commands 
  workdir?: string;      // Optional working directory
};

type CIOptions = {
  maxDegradation?: number;  // Maximum allowed performance degradation (%)
  exitOnFail?: boolean;     // Exit process on failure
  exitCode?: number;        // Exit code to use on failure
  prBranch?: string;        // Optional manual PR branch (if auto-detection fails)
  logger?: BenchmarkLogger; // Optional custom logger (defaults to ConsoleLogger)
};
```

### Internal Structure

To ensure testability, the implementation will be split into three main components:

1. **runCIBenchmark**: Main function that coordinates benchmark execution, analysis, and reporting
2. **analyzeCIBenchmarkResults**: Pure function that analyzes benchmark results and determines pass/fail
3. **logCIResult**: Function for formatted result output

This separation allows the core analysis logic to be unit tested independently without needing to run actual benchmarks.

### Usage Example

```typescript
import { runCIBenchmark } from '@twada/benchmark-commits';

// Minimal configuration
const baseline = {
  git: 'main',
  prepare: ['npm install', 'npm run build'],
  workdir: 'packages/core'
};

// PR branch is automatically detected
runCIBenchmark(baseline, ({ suite, spec, dir, syncBench, blackhole }) => {
  return syncBench(() => {
    // Benchmark code
    const result = someOperation();
    blackhole(result);
  });
}, {
  maxDegradation: 5  // Fail if PR is more than 5% slower
});
```

## Consequences

### Positive

1. **Simplified CI Integration**: Users can integrate performance testing into CI pipelines with minimal configuration
2. **Automated Regression Detection**: Performance degradations are automatically detected without manual analysis
3. **Easier Local Testing**: Developers can easily check performance before creating a pull request
4. **Testable Architecture**: Core logic can be unit tested independently
5. **Consistent Reporting**: Standardized output format for clear result communication
6. **Improved Testability**: Using BenchmarkLogger instead of direct console.log allows unit testing of output formatting

### Negative

1. **Limited Flexibility**: The specialized CI tool is less flexible than the general-purpose `runBenchmark` function
2. **Fixed Comparison Model**: Limited to comparing a single PR branch against a single baseline branch
3. **Dependency on CI Environment Variables**: Auto-detection of PR branches depends on specific environment variables

### Mitigations

- We will maintain the general-purpose `runBenchmark` function for users who need more flexibility
- The `prBranch` option allows manual specification when environment variables are not available
- The core analysis logic is independent, allowing future extensions to different comparison models

## Implementation Notes

1. The `analyzeCIBenchmarkResults` function should be thoroughly unit tested
2. The `logCIResult` function should be unit tested using a mock logger
3. The CI tool should provide clear error messages when configuration is incomplete or incorrect
4. Documentation should include examples for popular CI systems (GitHub Actions, CircleCI, etc.)
5. The API should remain stable, with any future enhancements being backward compatible
6. Use the existing `BenchmarkLogger` interface for logging to maintain consistency with the rest of the codebase

## Reference Implementation

Below is a reference implementation showing the detailed structure of the three main components:

```typescript
// Analysis function - Core logic for result analysis
function analyzeCIBenchmarkResults(suite: Benchmark.Suite, options: {
  maxDegradation?: number;
  baselinePrefix?: string;
  prPrefix?: string;
} = {}): {
  pass: boolean;
  degradation?: number;
  baselineHz?: number;
  prHz?: number;
  message: string;
  baselineName?: string;
  prName?: string;
} {
  // Default options
  const defaults = {
    maxDegradation: 5,
    baselinePrefix: 'Baseline',
    prPrefix: 'PR'
  };
  
  const opts = { ...defaults, ...options };
  
  // Initialize result object
  const result = {
    pass: true,
    message: 'Performance check passed'
  };
  
  // Identify baseline and PR benchmarks
  const baselineBench = suite.filter(bench => bench.name.includes(opts.baselinePrefix))[0];
  const prBench = suite.filter(bench => bench.name.includes(opts.prPrefix))[0];
  
  // Check if benchmarks completed successfully
  if (!baselineBench || !prBench) {
    return {
      pass: false,
      message: 'One or more benchmarks failed to complete',
      baselineName: baselineBench?.name,
      prName: prBench?.name
    };
  }
  
  // Performance comparison
  const baselineHz = baselineBench.hz;
  const prHz = prBench.hz;
  const degradation = ((baselineHz - prHz) / baselineHz) * 100;
  
  // Set result details
  const analysisResult = {
    pass: true,
    degradation,
    baselineHz,
    prHz,
    message: '',
    baselineName: baselineBench.name,
    prName: prBench.name
  };
  
  // Check if degradation exceeds threshold
  if (degradation > opts.maxDegradation) {
    analysisResult.pass = false;
    analysisResult.message = `Performance degradation of ${degradation.toFixed(2)}% exceeds maximum allowed ${opts.maxDegradation}%`;
  } else if (degradation > 0) {
    analysisResult.message = `Performance changed by -${degradation.toFixed(2)}% (within acceptable range of ${opts.maxDegradation}%)`;
  } else {
    analysisResult.message = `Performance improved by ${Math.abs(degradation).toFixed(2)}%`;
  }
  
  return analysisResult;
}

// Result reporting function
function logCIResult(result: {
  pass: boolean;
  degradation?: number;
  baselineHz?: number;
  prHz?: number;
  message: string;
  baselineName?: string;
  prName?: string;
}, baselineGit: string, prBranch: string, logger: BenchmarkLogger): void {
  logger.log('\n============================================');
  logger.log('          PERFORMANCE CHECK RESULTS          ');
  logger.log('============================================');
  
  logger.log(`Baseline: ${baselineGit} (${result.baselineName || 'N/A'})`);
  logger.log(`PR branch: ${prBranch} (${result.prName || 'N/A'})`);
  
  if (result.degradation !== undefined) {
    const changeSymbol = result.degradation > 0 ? '▼' : '▲';
    const changeColor = result.degradation > 0 ? '❌' : '✅';
    
    logger.log(`\nPerformance change: ${changeColor} ${changeSymbol} ${Math.abs(result.degradation).toFixed(2)}%`);
    logger.log(`  - Baseline: ${result.baselineHz?.toFixed(2) || 'N/A'} ops/sec`);
    logger.log(`  - PR:       ${result.prHz?.toFixed(2) || 'N/A'} ops/sec`);
  }
  
  logger.log(`\nResult: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);
  logger.log(`Message: ${result.message}`);
  logger.log('============================================\n');
}

// Main CI benchmark function
function runCIBenchmark(
  baseline: CIBaseline,
  register: BenchmarkRegisterFunction,
  options: CIOptions = {}
): Promise<{
  suite: Benchmark.Suite;
  result: ReturnType<typeof analyzeCIBenchmarkResults>;
}> {
  // Default options
  const ciOptions: CIOptions = {
    maxDegradation: 5,
    exitOnFail: true,
    exitCode: 1,
    ...options
  };
  
  // Auto-detect PR branch
  const prBranch = options.prBranch || 
                  process.env.GITHUB_HEAD_REF || 
                  process.env.CI_COMMIT_REF_NAME ||
                  'HEAD';
  
  // Create benchmark specs
  const specs = [
    {
      name: 'Baseline',
      git: baseline.git,
      prepare: baseline.prepare || ['npm install'],
      workdir: baseline.workdir
    },
    {
      name: `PR (${prBranch})`,
      git: prBranch,
      prepare: baseline.prepare || ['npm install'],
      workdir: baseline.workdir
    }
  ];
  
  // Run benchmarks and analyze
  // Get logger (default: ConsoleLogger)
  const logger = options.logger || new ConsoleLogger();
  
  return runBenchmark(specs, register).then(suite => {
    // Call analysis function
    const result = analyzeCIBenchmarkResults(suite, {
      maxDegradation: ciOptions.maxDegradation
    });
    
    // Output results
    logCIResult(result, baseline.git, prBranch, logger);
    
    // Set exit code on failure
    if (!result.pass && ciOptions.exitOnFail) {
      process.exit(ciOptions.exitCode);
    }
    
    return { suite, result };
  });
}
```

## References

- See [benchmark-commits](https://github.com/twada/benchmark-commits) README.md
- [ADR-003-blackhole-for-preventing-optimization.en.md](./adr-003-blackhole-for-preventing-optimization.en.md)
