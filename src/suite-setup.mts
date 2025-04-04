import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { extract } from 'extract-git-treeish';
import type { Suite as BenchmarkSuite, Deferred } from 'benchmark';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';

type NormalizedBenchmarkSpec = { name: string, git: string, prepare: string[], workdir?: string };
type BenchmarkSpec = { name: string, git: string, prepare?: string[], workdir?: string };
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
  asyncBench: (fn: AsyncBenchmarkFunction) => AsyncBenchmarkRegistration
};
type BenchmarkRegisterFunction = (benchmarkArguments: BenchmarkArguments) => BenchmarkRegistration | Promise<BenchmarkRegistration>;

class SuiteSetup extends EventEmitter {
  readonly suite: BenchmarkSuite;
  readonly workDir: string;

  constructor (suite: BenchmarkSuite, workDir: string) {
    super();
    this.suite = suite;
    this.workDir = workDir;
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
      return register({ suite, spec, dir, syncBench, asyncBench });
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
            const wrappedFn = wrapPromiseBenchmark(registration.fn);
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

function wrapPromiseBenchmark (fn: AsyncBenchmarkFunction): AsyncDeferredFunction {
  return function (deferred: Deferred) {
    fn().then(() => {
      deferred.resolve();
    }).catch(_err => {
      // TODO: propagate error report to the suite logger
      deferred.benchmark.abort();
      deferred.resolve();
    });
  };
}

function setupSuite (suite: BenchmarkSuite, workDir: string): SuiteSetup {
  return new SuiteSetup(suite, workDir);
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
  wrapPromiseBenchmark
};
