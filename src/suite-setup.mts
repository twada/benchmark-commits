import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { extract } from 'extract-git-treeish';
import type { Suite, Deferred } from 'benchmark';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';

type NormalizedBenchmarkSpec = { name: string, git: string, prepare: string[], workspace?: string };
type BenchmarkSpec = { name: string, git: string, prepare?: string[], workspace?: string };
type BenchmarkTarget = BenchmarkSpec | string;
type BenchmarkInstallation = { spec: BenchmarkSpec, dir: string };
type BenchmarkArguments = { suite: Suite, spec: BenchmarkSpec, dir: string };
type BenchmarkFunction = (() => void) | ((deferred: Deferred) => void);
type BenchmarkRegisterFunction = (benchmarkArguments: BenchmarkArguments) => BenchmarkFunction | Promise<BenchmarkFunction>;

class SuiteSetup extends EventEmitter {
  readonly suite: Suite;
  readonly workDir: string;

  constructor (suite: Suite, workDir: string) {
    super();
    this.suite = suite;
    this.workDir = workDir;
  }

  run (specs: NormalizedBenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite> {
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

function parseLine (str: string): { command: string, args: string[] } {
  const tokens = str.split(' ');
  return { command: tokens[0], args: tokens.slice(1) };
}

function runSetup (setup: SuiteSetup, specs: NormalizedBenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite> {
  const destDir = setup.workDir;
  const suite = setup.suite;
  setup.emit('start', specs);

  const preparations = specs.map((spec) => {
    return new Promise<BenchmarkInstallation>((resolve, reject) => {
      extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
        setup.emit('preparation:start', spec, dir);
        const spawnOptions = {
          cwd: spec.workspace ? join(dir, spec.workspace) : dir
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spec.prepare.reduce((promise: Promise<any>, nextCommand: string) => {
          return promise.then(() => {
            const { command, args } = parseLine(nextCommand);
            return spawnPromise(command, args, spawnOptions);
          });
        }, Promise.resolve()).then(() => {
          setup.emit('preparation:finish', spec, dir);
          resolve({ spec, dir });
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

function setupSuite (suite: Suite, workDir: string): SuiteSetup {
  return new SuiteSetup(suite, workDir);
}

export type {
  NormalizedBenchmarkSpec,
  BenchmarkRegisterFunction,
  BenchmarkTarget,
  BenchmarkSpec
};

export {
  setupSuite,
  normalizeSpecs,
  benchmarkName
};
