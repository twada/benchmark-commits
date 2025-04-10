import type Benchmark from 'benchmark';
import type { BenchmarkLogger } from './index.mjs';

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

export type AnalysisFailure = {
  type: 'AnalysisFailure';
  message: string;
};

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
