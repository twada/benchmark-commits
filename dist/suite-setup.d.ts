/// <reference types="node" />
import { EventEmitter } from 'events';
import type { Suite, Deferred } from 'benchmark';
type BenchmarkSpec = {
    name: string;
    git: string;
};
type BenchmarkTarget = BenchmarkSpec | string;
type BenchmarkArguments = {
    suite: Suite;
    spec: BenchmarkSpec;
    dir: string;
};
type BenchmarkFunction = (() => void) | ((deferred: Deferred) => void);
type BenchmarkRegisterFunction = (benchmarkArguments: BenchmarkArguments) => BenchmarkFunction | Promise<BenchmarkFunction>;
declare class SuiteSetup extends EventEmitter {
    readonly suite: Suite;
    readonly workDir: string;
    constructor(suite: Suite, workDir: string);
    run(specs: BenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite>;
}
declare function normalizeSpecs(commits: BenchmarkTarget[]): BenchmarkSpec[];
declare function benchmarkName(spec: BenchmarkSpec): string;
declare function setupSuite(suite: Suite, workDir: string): SuiteSetup;
export type { BenchmarkRegisterFunction, BenchmarkTarget, BenchmarkSpec };
export { setupSuite, normalizeSpecs, benchmarkName };
