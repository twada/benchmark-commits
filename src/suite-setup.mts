import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { extract } from 'extract-git-treeish';
import type { Suite as BenchmarkSuite, Deferred } from 'benchmark';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';

type NormalizedBenchmarkSpec = { name: string, git: string, prepare: string[], workspace?: string };
type BenchmarkSpec = { name: string, git: string, prepare?: string[], workspace?: string };
type BenchmarkTarget = BenchmarkSpec | string;
type BenchmarkInstallation = { spec: NormalizedBenchmarkSpec, dir: string };
type BenchmarkArguments = { suite: BenchmarkSuite, spec: NormalizedBenchmarkSpec, dir: string };
type BenchmarkFunction = (() => void) | ((deferred: Deferred) => void);
type BenchmarkRegisterFunction = (benchmarkArguments: BenchmarkArguments) => BenchmarkFunction | Promise<BenchmarkFunction>;

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
        const cwd = spec.workspace ? join(dir, spec.workspace) : dir;
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
      return register({ suite, spec, dir });
    });
  });

  return Promise.allSettled(preparations).then(results => {
    specs.forEach((spec, i) => {
      const result = results[i];
      assert(result !== undefined, 'result should not be undefined');
      if (result.status === 'fulfilled') {
        const fn = result.value;
        if (typeof fn === 'function') {
          switch (fn.length) {
            case 0:
              suite.add(benchmarkName(spec), fn, { defer: false });
              break;
            case 1:
              suite.add(benchmarkName(spec), fn, { defer: true });
              break;
            default:
              setup.emit('skip', spec, new Error('Benchmark function shuold have 0 or 1 parameter'));
          }
        } else {
          setup.emit('skip', spec, new TypeError('Benchmark registration function should return function'));
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

function setupSuite (suite: BenchmarkSuite, workDir: string): SuiteSetup {
  return new SuiteSetup(suite, workDir);
}

export type {
  NormalizedBenchmarkSpec,
  BenchmarkRegisterFunction,
  BenchmarkArguments,
  BenchmarkTarget,
  BenchmarkFunction
};

export {
  setupSuite,
  parseCommandLine,
  normalizeSpecs,
  benchmarkName
};
