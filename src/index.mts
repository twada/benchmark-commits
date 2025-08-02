export { benchmarkDiffWithBaseline } from './benchmark-diff.mts';
export { runBenchmark } from './run-benchmark.mts';
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
} from './suite-setup.mts';
export type {
  BaselineSpec,
  ComparisonOptions,
  AnalysisResult,
  AnalysisFailure
} from './benchmark-diff.mts';
export type {
  BenchmarkOptions
} from './run-benchmark.mts';
