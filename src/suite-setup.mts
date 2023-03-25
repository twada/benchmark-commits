import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { extract } from 'extract-git-treeish';
import type { Suite, Deferred } from 'benchmark';

type BenchmarkSpec = { name: string, git: string };
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

  run (specs: BenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite> {
    return runSetup(this, specs, register);
  }
}

function runSetup (setup: SuiteSetup, specs: BenchmarkSpec[], register: BenchmarkRegisterFunction): Promise<Suite> {
  const destDir = setup.workDir;
  const suite = setup.suite;
  setup.emit('start', specs);

  const preparations = specs.map((spec) => {
    return new Promise<BenchmarkInstallation>((resolve, reject) => {
      extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
        setup.emit('npm:install:start', spec, dir);
        const spawnOptions = {
          cwd: dir
        };
        spawn('npm', ['install'], spawnOptions)
          .on('error', reject)
          .on('close', (code: number, signal: NodeJS.Signals) => {
            setup.emit('npm:install:finish', spec, dir);
            resolve({ spec, dir });
          });
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
              setup.emit('skip', spec, new TypeError('Benchmark function shuold have 0 or 1 argument'));
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

function normalizeSpecs (commits: BenchmarkTarget[]): BenchmarkSpec[] {
  return commits.map((commit) => {
    if (typeof commit === 'string') {
      return {
        name: commit,
        git: commit
      };
    } else {
      return Object.assign({}, commit);
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
  BenchmarkRegisterFunction,
  BenchmarkTarget,
  BenchmarkSpec
};

export {
  setupSuite,
  normalizeSpecs,
  benchmarkName
};
