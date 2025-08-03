import type Benchmark from 'benchmark';
import { runBenchmark } from './run-benchmark.mts';
import { ConsoleLogger } from './suite-setup.mts';
import type { BenchmarkRegisterFunction, BenchmarkTarget, BenchmarkLogger } from './suite-setup.mts';

/**
 * Specification for the baseline branch to compare against
 */
export type BaselineSpec = {
  git: string;          // Baseline git reference (commit, tag, branch)
  prepare?: string[];   // Optional preparation commands
  workdir?: string;     // Optional working directory
};

/**
 * Options for performance comparison
 */
export type ComparisonOptions = {
  maxDegradation?: number;  // Maximum allowed performance degradation (%)
  exitOnFail?: boolean;     // Exit process on failure
  exitCode?: number;        // Exit code to use on failure
  targetBranch?: string;    // Optional manual target branch (if auto-detection fails)
  logger?: BenchmarkLogger; // Optional custom logger
};

/**
 * Result of performance analysis
 */
export type AnalysisResult = {
  type: 'AnalysisResult';  // Type of analysis result
  pass: boolean;           // Whether the performance check passed
  message: string;         // Human-readable result message
  degradation: number;    // Performance degradation percentage (positive = degradation)
  baselineHz: number;     // Operations per second for baseline
  targetHz: number;       // Operations per second for target
  baselineName: string;   // Name of baseline benchmark
  targetName: string;     // Name of target benchmark
};

/**
 * Represents a failure in the performance analysis process
 */
export type AnalysisFailure = {
  type: 'AnalysisFailure';  // Type discriminator
  message: string;          // Human-readable failure message
};

// ConsoleLogger is now imported from suite-setup.mts

/**
 * Logs the comparison result in a formatted way
 *
 * @param result - The analysis result to log
 * @param baselineGit - The git reference for the baseline
 * @param targetBranch - The git reference for the target
 * @param logger - The logger to use
 */
export function logComparisonResult (
  result: AnalysisResult | AnalysisFailure,
  baselineGit: string,
  targetBranch: string,
  logger: BenchmarkLogger
): void {
  logger.log('\n============================================');
  logger.log('          PERFORMANCE CHECK RESULTS          ');
  logger.log('============================================');

  if (result.type === 'AnalysisFailure') {
    logger.log(`Baseline: ${baselineGit}`);
    logger.log(`Target: ${targetBranch}`);
    logger.log('\nResult: ❌ FAIL');
    logger.log(`Message: ${result.message}`);
    logger.log('============================================\n');
    return;
  }

  logger.log(`Baseline: ${baselineGit} (${result.baselineName})`);
  logger.log(`Target: ${targetBranch} (${result.targetName})`);

  const changeSymbol = result.degradation > 0 ? '▼' : '▲';
  const changeColor = result.pass ? '✅' : '❌';

  logger.log(`\nPerformance change: ${changeColor} ${changeSymbol} ${Math.abs(result.degradation).toFixed(2)}%`);
  logger.log(`  - Baseline: ${result.baselineHz.toFixed(2)} ops/sec`);
  logger.log(`  - Target:   ${result.targetHz.toFixed(2)} ops/sec`);

  logger.log(`\nResult: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);
  logger.log(`Message: ${result.message}`);
  logger.log('============================================\n');
}

/**
 * Analyzes performance results to determine if the target branch meets the performance criteria
 *
 * @param suite - The benchmark suite containing both baseline and target benchmarks
 * @param options - Configuration options for analysis
 * @returns Analysis result with performance information and pass/fail status
 */
export function analyzePerformanceResults (suite: Benchmark.Suite, options: {
  maxDegradation?: number;
  baselinePrefix?: string;
  targetPrefix?: string;
} = {}): AnalysisResult | AnalysisFailure {
  // Default options
  const defaults = {
    maxDegradation: 5,
    baselinePrefix: 'Baseline',
    targetPrefix: 'Target'
  };

  const opts = { ...defaults, ...options };
  // Identify baseline and target benchmarks
  const baselineBenchCandidates: Benchmark.Suite = suite.filter((bench: Benchmark) => bench.name?.includes(opts.baselinePrefix));
  const targetBenchCandidates: Benchmark.Suite = suite.filter((bench: Benchmark) => bench.name?.includes(opts.targetPrefix));
  if (baselineBenchCandidates.length === 0 || targetBenchCandidates.length === 0) {
    return {
      type: 'AnalysisFailure',
      message: `No benchmarks found with prefixes "${opts.baselinePrefix}" or "${opts.targetPrefix}"`
    };
  }
  const baselineBench = baselineBenchCandidates.pop() as unknown as Benchmark;
  const targetBench = targetBenchCandidates.pop() as unknown as Benchmark;

  // Performance comparison
  const baselineHz = baselineBench.hz;
  const targetHz = targetBench.hz;
  const degradation = ((baselineHz - targetHz) / baselineHz) * 100;

  // Set result details with type safety for optional string properties
  const analysisResult: AnalysisResult = {
    type: 'AnalysisResult',
    pass: true,
    baselineName: baselineBench.name || 'Baseline',
    targetName: targetBench.name || 'Target',
    degradation,
    baselineHz,
    targetHz,
    message: ''
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

/**
 * Compares performance between baseline and target branches
 *
 * @param baseline - Specification for the baseline branch to compare against
 * @param register - Function to register benchmarks
 * @param options - Configuration options for the comparison
 * @returns Promise resolving to the benchmark suite and analysis result
 */
export function benchmarkDiffWithBaseline (
  baseline: BaselineSpec,
  register: BenchmarkRegisterFunction,
  options: ComparisonOptions = {}
): Promise<{
  suite: Benchmark.Suite;
  result: AnalysisResult | AnalysisFailure;
}> {
  // Auto-detect target branch if not specified
  const targetBranch = options.targetBranch ||
                  process.env.GITHUB_HEAD_REF ||
                  process.env.CI_COMMIT_REF_NAME ||
                  'HEAD';

  // Default options
  const comparisonOptions: Required<ComparisonOptions> = {
    maxDegradation: 5,
    exitOnFail: true,
    exitCode: 1,
    targetBranch,
    logger: new ConsoleLogger(),
    ...options
  };

  // Create benchmark specs
  const baselineSpec: BenchmarkTarget = {
    name: 'Baseline',
    git: baseline.git,
    prepare: baseline.prepare,
    workdir: baseline.workdir
  };

  const targetSpec: BenchmarkTarget = {
    name: 'Target',
    git: targetBranch,
    prepare: baseline.prepare,
    workdir: baseline.workdir
  };

  const specs: BenchmarkTarget[] = [baselineSpec, targetSpec];

  // Get logger
  const logger = comparisonOptions.logger;

  // Run benchmarks and analyze
  return runBenchmark(specs, register, { logger }).then(suite => {
    // Call analysis function
    const result = analyzePerformanceResults(suite, {
      maxDegradation: comparisonOptions.maxDegradation
    });

    // Output results
    logComparisonResult(result, baseline.git, targetBranch, logger);

    // Set exit code on failure
    if ((result.type === 'AnalysisResult' && !result.pass) ||
        (result.type === 'AnalysisFailure')) {
      if (comparisonOptions.exitOnFail) {
        process.exit(comparisonOptions.exitCode);
      }
    }

    return { suite, result };
  });
}
