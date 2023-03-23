import Benchmark from 'benchmark';
import type { BenchmarkRegisterFunction, BenchmarkTarget } from './suite-setup.mjs';
type BenchmarkLogger = {
    log(str: string): void;
    error(err: any): void;
};
type BenchmarkOptions = {
    logger?: BenchmarkLogger;
};
declare function runBenchmark(commitsOrSpecs: BenchmarkTarget[], register: BenchmarkRegisterFunction, options?: BenchmarkOptions): Promise<Benchmark.Suite>;
export { runBenchmark };
