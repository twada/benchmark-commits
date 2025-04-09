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
  pass: boolean;           // Whether the performance check passed
  degradation?: number;    // Performance degradation percentage (positive = degradation)
  baselineHz?: number;     // Operations per second for baseline
  targetHz?: number;       // Operations per second for target
  message: string;         // Human-readable result message
  baselineName?: string;   // Name of baseline benchmark
  targetName?: string;     // Name of target benchmark
};
