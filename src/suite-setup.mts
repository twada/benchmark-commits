import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { extract } from 'extract-git-treeish';
import type { Suite as BenchmarkSuite, Deferred } from 'benchmark';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';

/**
 * Interface for logging benchmark progress and results
 */
export type BenchmarkLogger = {
  log (message?: any, ...optionalParams: any[]): void;
  error (message?: any, ...optionalParams: any[]): void;
};

/**
 * Default console-based implementation of BenchmarkLogger
 */
export class ConsoleLogger implements BenchmarkLogger {
  log (message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
  }

  error (message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }
}

type NormalizedBenchmarkSpec = { name: string, git: string, prepare: string[], workdir?: string | undefined };
type BenchmarkSpec = { name: string, git: string, prepare?: string[] | undefined, workdir?: string | undefined };
type BenchmarkTarget = BenchmarkSpec | string;
type BenchmarkInstallation = { spec: NormalizedBenchmarkSpec, dir: string };
type SyncBenchmarkFunction = () => void;
type AsyncDeferredFunction = (deferred: Deferred) => void;
type AsyncBenchmarkFunction = () => Promise<void>;
type SyncBenchmarkRegistration = { async: false, fn: SyncBenchmarkFunction };
type AsyncBenchmarkRegistration = { async: true, fn: AsyncBenchmarkFunction };
type BenchmarkRegistration = SyncBenchmarkRegistration | AsyncBenchmarkRegistration;
type BenchmarkArguments = {
  suite: BenchmarkSuite,
  spec: NormalizedBenchmarkSpec,
  dir: string,
  syncBench: (fn: SyncBenchmarkFunction) => SyncBenchmarkRegistration,
  asyncBench: (fn: AsyncBenchmarkFunction) => AsyncBenchmarkRegistration,
  blackhole: (value: any) => void
};
type BenchmarkRegisterFunction = (benchmarkArguments: BenchmarkArguments) => BenchmarkRegistration | Promise<BenchmarkRegistration>;

/**
 * Class to setup and manage benchmark suites
 * Handles git checkout, preparation steps, and benchmark registration
 */
class SuiteSetup extends EventEmitter {
  /** The benchmark suite being configured */
  readonly suite: BenchmarkSuite;
  /** The working directory for benchmark files */
  readonly workDir: string;
  /** Logger for benchmark results and errors */
  readonly logger: BenchmarkLogger;

  /**
   * Creates a new SuiteSetup instance
   *
   * @param suite - The benchmark suite to configure
   * @param workDir - The working directory for benchmark files
   * @param logger - Optional logger for benchmark results and errors (defaults to ConsoleLogger)
   */
  constructor (suite: BenchmarkSuite, workDir: string, logger: BenchmarkLogger = new ConsoleLogger()) {
    super();
    this.suite = suite;
    this.workDir = workDir;
    this.logger = logger;
  }

  run (specs: NormalizedBenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<BenchmarkSuite> {
    return runSetup(this, specs, register);
  }
}

function spawnPromise (command: string, args: string[], options: SpawnOptionsWithoutStdio): Promise<number> {
  return new Promise((resolve, reject) => {
    spawn(command, args, options)
      .on('error', reject)
      .on('close', (code: number, _signal: NodeJS.Signals) => {
        resolve(code);
      });
  });
}

function parseCommandLine (str: string): { command: string, args: string[] } {
  const tokens = str.split(' ');
  assert(tokens[0] !== undefined, 'command should not be empty');
  return { command: tokens[0], args: tokens.slice(1) };
}

function runSetup (setup: SuiteSetup, specs: NormalizedBenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<BenchmarkSuite> {
  const destDir = setup.workDir;
  const suite = setup.suite;
  setup.emit('start', specs);

  const preparations = specs.map((spec) => {
    return new Promise<BenchmarkInstallation>((resolve, reject) => {
      extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
        const cwd = spec.workdir ? join(dir, spec.workdir) : dir;
        setup.emit('preparation:start', spec, cwd);
        const spawnOptions = {
          cwd
        };
        spec.prepare.reduce((promise: Promise<any>, nextCommand: string) => {
          return promise.then(() => {
            const { command, args } = parseCommandLine(nextCommand);
            return spawnPromise(command, args, spawnOptions);
          });
        }, Promise.resolve()).then(() => {
          setup.emit('preparation:finish', spec, cwd);
          resolve({ spec, dir: cwd });
        }).catch(reject);
      }).catch(reject);
    });
  }).map((installation) => {
    return installation.then(({ spec, dir }: BenchmarkInstallation) => {
      setup.emit('register', spec, dir);
      const syncBench = (fn: SyncBenchmarkFunction): SyncBenchmarkRegistration => {
        return { async: false, fn };
      };
      const asyncBench = (fn: AsyncBenchmarkFunction): AsyncBenchmarkRegistration => {
        return { async: true, fn };
      };
      return register({ suite, spec, dir, syncBench, asyncBench, blackhole });
    });
  });

  return Promise.allSettled(preparations).then(results => {
    specs.forEach((spec, i) => {
      const result = results[i];
      assert(result !== undefined, 'result should not be undefined');
      if (result.status === 'fulfilled') {
        const registration = result.value;
        if (typeof registration === 'object' && registration !== null && Object.hasOwn(registration, 'async') && Object.hasOwn(registration, 'fn') && typeof registration.fn === 'function') {
          if (registration.async) {
            // Async benchmark
            const wrappedFn = wrapPromiseBenchmark(registration.fn, setup.logger);
            suite.add(benchmarkName(spec), wrappedFn, { defer: true });
          } else {
            // Sync benchmark
            suite.add(benchmarkName(spec), registration.fn, { defer: false });
          }
        } else {
          setup.emit('skip', spec, new TypeError('Benchmark registration function should return a valid registration object'));
        }
      } else if (result.status === 'rejected') {
        setup.emit('skip', spec, result.reason);
      }
    });
    if (suite.length === 0) {
      throw new Error('All benchmark registrations failed');
    } else {
      setup.emit('finish', suite);
      return suite;
    }
  });
}

function normalizeSpecs (commits: BenchmarkTarget[]): NormalizedBenchmarkSpec[] {
  return commits.map((commit) => {
    if (typeof commit === 'string') {
      return {
        name: commit,
        git: commit,
        prepare: ['npm install']
      };
    } else {
      return Object.assign({
        prepare: ['npm install']
      }, commit);
    }
  });
}

function benchmarkName (spec: BenchmarkSpec): string {
  if (spec.name !== spec.git) {
    return `${spec.name}(${spec.git})`;
  } else {
    return spec.git;
  }
}

/**
 * Wraps an async benchmark function that returns a Promise for use with deferred benchmark
 *
 * @param fn - The async benchmark function to wrap
 * @param logger - The logger to use for error reporting
 * @returns A function compatible with deferred benchmarks
 */
function wrapPromiseBenchmark (fn: AsyncBenchmarkFunction, logger: BenchmarkLogger): AsyncDeferredFunction {
  return function (deferred: Deferred) {
    fn().then(() => {
      deferred.resolve();
    }).catch(err => {
      // Propagate error to the logger
      logger.error(`Benchmark execution error: ${err.message}`, err);
      deferred.benchmark.abort();
      deferred.resolve();
    });
  };
}

const blackhole = (() => {
  // Use a structure that is difficult to statically analyze
  const sink = new WeakMap<object, any>();
  // Create an array of 32 objects upfront
  const keys = Array.from({ length: 32 }, () => ({}));
  let keyIndex = 0;

  return (value: any) => {
    // Use cycling keys (memory efficient)
    const key = keys[keyIndex]!; // Using non-null assertion since we know the array has 32 items
    keyIndex = (keyIndex + 1) & 31; // Cycle in the range 0-31

    // Store in WeakMap (shows the JIT that the value is being used)
    sink.set(key, value);
  };
})();

/**
 * Creates and configures a new benchmark suite setup
 *
 * @param suite - The benchmark suite to configure
 * @param workDir - The working directory for benchmark files
 * @param logger - Optional logger for benchmark results and errors
 * @returns A configured SuiteSetup instance
 */
function setupSuite (suite: BenchmarkSuite, workDir: string, logger?: BenchmarkLogger): SuiteSetup {
  return new SuiteSetup(suite, workDir, logger);
}

export type {
  BenchmarkSpec,
  NormalizedBenchmarkSpec,
  BenchmarkRegisterFunction,
  BenchmarkArguments,
  BenchmarkTarget,
  SyncBenchmarkFunction,
  AsyncDeferredFunction,
  AsyncBenchmarkFunction,
  SyncBenchmarkRegistration,
  AsyncBenchmarkRegistration,
  BenchmarkRegistration
};

export {
  setupSuite,
  parseCommandLine,
  normalizeSpecs,
  benchmarkName,
  wrapPromiseBenchmark,
  blackhole
};
