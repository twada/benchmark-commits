# ADR-004: Benchmark Diff With Baseline

## Status

Proposed

## Date

2025-04-09

## Context

The `benchmark-commits` tool already provides functionality to compare benchmarks across multiple git commits, tags, or branches. However, developers often need to specifically compare the performance of their current code (HEAD or a feature branch) against a baseline reference (like main branch). This comparison is needed in various scenarios:

1. **CI automation**: Automatically detect performance regressions in pull requests
2. **Local verification**: Allow developers to verify performance before creating a pull request
3. **Optimization validation**: Verify that performance optimization changes actually improve performance

Currently, users need to manually configure benchmark specs and interpret results, which is not ideal for automated environments where we need clear pass/fail decisions based on performance degradation thresholds.

## Decision

We will add a new specialized API called `benchmarkDiffWithBaseline` with the following features:

1. Simplified API that only requires baseline branch information
2. Automatic detection of the current branch (from git or CI environment variables)
3. Automatic performance analysis against configurable thresholds
4. Process exit code control for automated environments
5. Clear, standardized reporting of performance changes

### API Design

The `benchmarkDiffWithBaseline` function will have the following signature:

```typescript
function benchmarkDiffWithBaseline(
  baseline: BaselineSpec,
  register: BenchmarkRegisterFunction,
  options?: ComparisonOptions
): Promise<{
  suite: Benchmark.Suite;
  result: AnalysisResult;
}>;

// Types
type BaselineSpec = {
  git: string;           // Baseline git reference (commit, tag, branch)
  prepare?: string[];    // Optional preparation commands 
  workdir?: string;      // Optional working directory
};

type ComparisonOptions = {
  maxDegradation?: number;  // Maximum allowed performance degradation (%)
  exitOnFail?: boolean;     // Exit process on failure
  exitCode?: number;        // Exit code to use on failure
  targetBranch?: string;    // Optional manual target branch (if auto-detection fails)
  logger?: BenchmarkLogger; // Optional custom logger (defaults to ConsoleLogger)
};
```

### Internal Structure

To ensure testability, the implementation will be split into three main components:

1. **benchmarkDiffWithBaseline**: Main function that coordinates benchmark execution, analysis, and reporting
2. **analyzePerformanceResults**: Pure function that analyzes benchmark results and determines pass/fail
3. **logComparisonResult**: Function for formatted result output

This separation allows the core analysis logic to be unit tested independently without needing to run actual benchmarks.

### Usage Example

```typescript
import { benchmarkDiffWithBaseline } from '@twada/benchmark-commits';

// Minimal configuration
const baseline = {
  git: 'main',
  prepare: ['npm install', 'npm run build'],
  workdir: 'packages/core'
};

// Current branch is automatically detected
benchmarkDiffWithBaseline(baseline, ({ suite, spec, dir, syncBench, blackhole }) => {
  return syncBench(() => {
    // Benchmark code
    const result = someOperation();
    blackhole(result);
  });
}, {
  maxDegradation: 5  // Fail if current branch is more than 5% slower
});
```

## Consequences

### Positive

1. **Simplified Performance Testing**: Users can compare performance against a baseline with minimal configuration
2. **Automated Regression Detection**: Performance degradations are automatically detected without manual analysis
3. **Easier Local Testing**: Developers can easily check performance before creating a pull request
4. **CI Integration**: Works well in CI environments for automated performance checks
5. **Testable Architecture**: Core logic can be unit tested independently
6. **Consistent Reporting**: Standardized output format for clear result communication
7. **Improved Testability**: Using BenchmarkLogger instead of direct console.log allows unit testing of output formatting

### Negative

1. **Limited Flexibility**: The specialized tool is less flexible than the general-purpose `runBenchmark` function
2. **Fixed Comparison Model**: Limited to comparing a single target branch against a single baseline branch
3. **Dependency on Environment Detection**: Auto-detection of current branch depends on git or CI environment variables

### Mitigations

- We will maintain the general-purpose `runBenchmark` function for users who need more flexibility
- The `targetBranch` option allows manual specification when auto-detection is not sufficient
- The core analysis logic is independent, allowing future extensions to different comparison models

## Implementation Notes

1. The `analyzePerformanceResults` function should be thoroughly unit tested
2. The `logComparisonResult` function should be unit tested using a mock logger
3. The tool should provide clear error messages when configuration is incomplete or incorrect
4. Documentation should include examples for both local development and CI environments (like GitHub Actions)
5. The API should remain stable, with any future enhancements being backward compatible
6. Use the existing `BenchmarkLogger` interface for logging to maintain consistency with the rest of the codebase

## Reference Implementation

Below is a reference implementation showing the detailed structure of the three main components:

```typescript
// Analysis function - Core logic for result analysis
function analyzePerformanceResults(suite: Benchmark.Suite, options: {
  maxDegradation?: number;
  baselinePrefix?: string;
  targetPrefix?: string;
} = {}): {
  pass: boolean;
  degradation?: number;
  baselineHz?: number;
  targetHz?: number;
  message: string;
  baselineName?: string;
  targetName?: string;
} {
  // Default options
  const defaults = {
    maxDegradation: 5,
    baselinePrefix: 'Baseline',
    targetPrefix: 'Target'
  };
  
  const opts = { ...defaults, ...options };
  
  // Initialize result object
  const result = {
    pass: true,
    message: 'Performance check passed'
  };
  
  // Identify baseline and target benchmarks
  const baselineBench = suite.filter(bench => bench.name.includes(opts.baselinePrefix))[0];
  const targetBench = suite.filter(bench => bench.name.includes(opts.targetPrefix))[0];
  
  // Check if benchmarks completed successfully
  if (!baselineBench || !targetBench) {
    return {
      pass: false,
      message: 'One or more benchmarks failed to complete',
      baselineName: baselineBench?.name,
      targetName: targetBench?.name
    };
  }
  
  // Performance comparison
  const baselineHz = baselineBench.hz;
  const targetHz = targetBench.hz;
  const degradation = ((baselineHz - targetHz) / baselineHz) * 100;
  
  // Set result details
  const analysisResult = {
    pass: true,
    degradation,
    baselineHz,
    targetHz,
    message: '',
    baselineName: baselineBench.name,
    targetName: targetBench.name
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
function logComparisonResult(result: {
  pass: boolean;
  degradation?: number;
  baselineHz?: number;
  targetHz?: number;
  message: string;
  baselineName?: string;
  targetName?: string;
}, baselineGit: string, targetBranch: string, logger: BenchmarkLogger): void {
  logger.log('\n============================================');
  logger.log('          PERFORMANCE CHECK RESULTS          ');
  logger.log('============================================');
  
  logger.log(`Baseline: ${baselineGit} (${result.baselineName || 'N/A'})`);
  logger.log(`Target: ${targetBranch} (${result.targetName || 'N/A'})`);
  
  if (result.degradation !== undefined) {
    const changeSymbol = result.degradation > 0 ? '▼' : '▲';
    const changeColor = result.degradation > 0 ? '❌' : '✅';
    
    logger.log(`\nPerformance change: ${changeColor} ${changeSymbol} ${Math.abs(result.degradation).toFixed(2)}%`);
    logger.log(`  - Baseline: ${result.baselineHz?.toFixed(2) || 'N/A'} ops/sec`);
    logger.log(`  - Target:   ${result.targetHz?.toFixed(2) || 'N/A'} ops/sec`);
  }
  
  logger.log(`\nResult: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);
  logger.log(`Message: ${result.message}`);
  logger.log('============================================\n');
}

// Main benchmark comparison function
function benchmarkDiffWithBaseline(
  baseline: BaselineSpec,
  register: BenchmarkRegisterFunction,
  options: ComparisonOptions = {}
): Promise<{
  suite: Benchmark.Suite;
  result: ReturnType<typeof analyzePerformanceResults>;
}> {
  // Default options
  const comparisonOptions: ComparisonOptions = {
    maxDegradation: 5,
    exitOnFail: true,
    exitCode: 1,
    ...options
  };
  
  // Auto-detect target branch
  const targetBranch = options.targetBranch || 
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
      name: `Target (${targetBranch})`,
      git: targetBranch,
      prepare: baseline.prepare || ['npm install'],
      workdir: baseline.workdir
    }
  ];
  
  // Get logger (default: ConsoleLogger)
  const logger = options.logger || new ConsoleLogger();
  
  // Run benchmarks and analyze
  return runBenchmark(specs, register).then(suite => {
    // Call analysis function
    const result = analyzePerformanceResults(suite, {
      maxDegradation: comparisonOptions.maxDegradation
    });
    
    // Output results
    logComparisonResult(result, baseline.git, targetBranch, logger);
    
    // Set exit code on failure
    if (!result.pass && comparisonOptions.exitOnFail) {
      process.exit(comparisonOptions.exitCode);
    }
    
    return { suite, result };
  });
}
```

## References

- See [benchmark-commits](https://github.com/twada/benchmark-commits) README.md
- [ADR-003-blackhole-for-preventing-optimization.en.md](./adr-003-blackhole-for-preventing-optimization.en.md)
