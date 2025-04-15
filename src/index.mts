export { benchmarkDiffWithBaseline } from './benchmark-diff.mjs';
export { runBenchmark } from './run-benchmark.mjs';
export type {
  BenchmarkSpec,
  NormalizedBenchmarkSpec,
  BenchmarkRegisterFunction,
  BenchmarkArguments,
  BenchmarkTarget,
  SyncBenchmarkFunction,
  AsyncBenchmarkFunction,
  SyncBenchmarkRegistration,
  AsyncBenchmarkRegistration,
  BenchmarkRegistration,
  BenchmarkLogger
} from './suite-setup.mjs';
export type {
  BaselineSpec,
  ComparisonOptions,
  AnalysisResult,
  AnalysisFailure
} from './benchmark-diff.mjs';
export type {
  BenchmarkOptions
} from './run-benchmark.mjs';
