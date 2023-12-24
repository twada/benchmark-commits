/// <reference types="node" resolution-mode="require"/>
import { EventEmitter } from 'events';
import type { Suite, Deferred } from 'benchmark';
type NormalizedBenchmarkSpec = {
    name: string;
    git: string;
    prepare: string[];
    workspace?: string;
};
type BenchmarkSpec = {
    name: string;
    git: string;
    prepare?: string[];
    workspace?: string;
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
    run(specs: NormalizedBenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite>;
}
declare function normalizeSpecs(commits: BenchmarkTarget[]): NormalizedBenchmarkSpec[];
declare function benchmarkName(spec: BenchmarkSpec): string;
declare function setupSuite(suite: Suite, workDir: string): SuiteSetup;
export type { NormalizedBenchmarkSpec, BenchmarkRegisterFunction, BenchmarkTarget, BenchmarkSpec };
export { setupSuite, normalizeSpecs, benchmarkName };
