import { setupSuite, normalizeSpecs, benchmarkName } from '../suite-setup.mjs';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { tmpdir } from 'node:os';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import type { Suite as BenchmarkSuite, Options as BenchmarkOptions } from 'benchmark';
import type { BenchmarkFunction, NormalizedBenchmarkSpec } from '../suite-setup.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const zf = (n: number, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

type BenchmarkAddCall = {
  name: string,
  fn: Function | string,
  options: BenchmarkOptions | undefined
};
type SkipCall = {
  spec: NormalizedBenchmarkSpec,
  reason: Error
};

class FakeBenchmarkSuite extends EventEmitter {
  readonly calls: BenchmarkAddCall[];
  constructor (calls: BenchmarkAddCall[]) {
    super();
    this.calls = calls;
  }

  add (name: string, fn: Function | string, options?: BenchmarkOptions) {
    this.calls.push({ name, fn, options });
  }

  get length () {
    return this.calls.length;
  }
}

const delay = (millis: number, val: any): Promise<any> => {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(val);
    }, millis);
  });
};
const rejectLater = (millis: number, err: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(err);
    }, millis);
  });
};
const shouldNotBeFulfilled = () => {
  assert(false, 'should not be fulfilled');
};

describe('runBenchmark(commitsOrSpecs, register): run benchmark for given `commitsOrSpecs`. Each benchmark function is registered via `register` function', () => {
  describe('`commitsOrSpecs` is an array of either (1) string specifying git tag/branch/commit or (2) object having `name`, `git`, `prepare` and `workdir` properties, pointing to git object to be checked out for the benchmark', () => {
    describe('internally, each item in `commitsOrSpecs` is normalized to `spec` object in {name, git, prepare} form', () => {
      describe('if `commitsOrSpecs` is an array of string specifying git tag/branch/commit', () => {
        describe('converts each string to object in {name, git, prepare} form.', () => {
          const testBody = () => {
            const commits = [
              'bench-test-1',
              'bench-test-2',
              'bench-test-3'
            ];
            assert.deepEqual(normalizeSpecs(commits), [
              { name: 'bench-test-1', git: 'bench-test-1', prepare: ['npm install'] },
              { name: 'bench-test-2', git: 'bench-test-2', prepare: ['npm install'] },
              { name: 'bench-test-3', git: 'bench-test-3', prepare: ['npm install'] }
            ]);
          };
          it('name === git in this case.', testBody);
          it('prepare is an array containing default command string ["npm install"]', testBody);
          it('workdir is undefined', testBody);
        });
        it('use git object name as benchmark name', () => {
          const spec = { name: 'bench-test-1', git: 'bench-test-1', prepare: ['npm install'] };
          assert(benchmarkName(spec) === 'bench-test-1');
        });
      });

      describe('if `commitsOrSpecs` is already an array of `spec` object having {name, git} form', () => {
        const testBody = () => {
          const commits = [
            { name: 'Regex#test', git: 'bench-test-1' },
            { name: 'String#indexOf', git: 'bench-test-2' },
            { name: 'String#match', git: 'bench-test-3' }
          ];
          assert.deepEqual(normalizeSpecs(commits), [
            { name: 'Regex#test', git: 'bench-test-1', prepare: ['npm install'] },
            { name: 'String#indexOf', git: 'bench-test-2', prepare: ['npm install'] },
            { name: 'String#match', git: 'bench-test-3', prepare: ['npm install'] }
          ]);
        };
        it('name and git is used as-is', testBody);
        it('prepare is an array containing default command string ["npm install"]', testBody);
        it('workdir is undefined', testBody);
        it('generated benchmark name is `name(git)`', () => {
          const spec = { name: 'Regex#test', git: 'bench-test-1' };
          assert(benchmarkName(spec) === 'Regex#test(bench-test-1)');
        });
      });

      describe('if `commitsOrSpecs` is already an array of `spec` object having {name, git, prepare} form', () => {
        const testBody = () => {
          const commits = [
            {
              name: 'Regex#test',
              git: 'bench-test-1',
              prepare: [
                'npm ci',
                'npm run build'
              ]
            },
            { name: 'String#indexOf', git: 'bench-test-2' },
            { name: 'String#match', git: 'bench-test-3' }
          ];
          assert.deepEqual(normalizeSpecs(commits), [
            { name: 'Regex#test', git: 'bench-test-1', prepare: ['npm ci', 'npm run build'] },
            { name: 'String#indexOf', git: 'bench-test-2', prepare: ['npm install'] },
            { name: 'String#match', git: 'bench-test-3', prepare: ['npm install'] }
          ]);
        };
        it('name, git and prepare is used as-is', testBody);
      });

      // - TODO: prepare
      // - TODO: workdir
    });
  });

  describe('`register` is a benchmark registration function that returns benchmark function. benchmark registration function takes { suite, spec, dir} as arguments.', () => {
    let targetDir: string;
    let addCalls: BenchmarkAddCall[];
    let setup: ReturnType<typeof setupSuite>;
    let specs: NormalizedBenchmarkSpec[];

    beforeEach(() => {
      specs = [
        {
          name: 'Regex#test',
          git: 'bench-test-1',
          prepare: ['npm install']
        },
        {
          name: 'String#indexOf',
          git: 'bench-test-2',
          prepare: ['npm install']
        },
        {
          name: 'String#match',
          git: 'bench-test-3',
          prepare: ['npm install']
        }
      ];
      addCalls = [];
      const suite: BenchmarkSuite = new FakeBenchmarkSuite(addCalls) as unknown as BenchmarkSuite;
      targetDir = join(tmpdir(), timestampString());
      setup = setupSuite(suite, targetDir);
    });

    afterEach(() => {
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('if `register` function runs synchronously, register benchmark function immediately ', () => {
      return setup.run(specs, ({ suite: _suite, spec: _spec, dir, syncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 3);
      });
    });

    it('if `register` function is an async function or returns Promise, register benchmark function asynchronously', () => {
      return setup.run(specs, ({ suite: _suite, spec: _spec, dir, syncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        const fn = () => {
          prod('Hello World!');
        };
        return delay(100, syncBench(fn));
      }).then((_suite) => {
        assert(addCalls.length === 3);
      });
    });

    it('sync benchmark functions will be executed synchronously', () => {
      return setup.run(specs, ({ suite: _suite, spec: _spec, dir, syncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 3);
        assert(addCalls[0]?.options?.defer === false);
        assert(addCalls.every((call) => call.options?.defer === false));
      });
    });

    it('async benchmark functions will be executed with deferred option', () => {
      return setup.run(specs, ({ suite: _suite, spec: _spec, dir, asyncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return asyncBench(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 3);
        assert(addCalls[0]?.options?.defer === true);
        assert(addCalls.every((call) => call.options?.defer === true));
      });
    });

    it('if invalid benchmark registration object is returned, skip benchmark registration for that `spec`', () => {
      const skipCalls: SkipCall[] = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite: _suite, spec, dir, syncBench, asyncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        if (spec.git === 'bench-test-2') {
          // Return an invalid object (not a valid BenchmarkRegistration)
          return { invalid: true } as any;
        }
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        const skipped = skipCalls[0];
        assert(skipped !== undefined);
        assert.deepEqual(skipped.spec, specs[1]);
        assert.equal(skipped.reason.message, 'Benchmark registration function should return a valid registration object');
      });
    });

    it('if git commit object in `commitsOrSpecs` does not exist in underlying git repository, skip benchmark registration for that `spec`', () => {
      const specsIncldingError = [
        {
          name: 'error1',
          git: 'nonexistent1',
          prepare: ['npm install']
        },
        ...specs,
        {
          name: 'error2',
          git: 'nonexistent2',
          prepare: ['npm install']
        }
      ];
      const skipCalls: SkipCall[] = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specsIncldingError, ({ suite: _suite, spec: _spec, dir, syncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 3);
        assert(skipCalls.length === 2);
        assert(skipCalls[0] !== undefined);
        assert.deepEqual(skipCalls[0].spec, { name: 'error1', git: 'nonexistent1', prepare: ['npm install'] });
        assert(skipCalls[1] !== undefined);
        assert.deepEqual(skipCalls[1].spec, { name: 'error2', git: 'nonexistent2', prepare: ['npm install'] });
      });
    });

    it('if error occurred while executing registration function, skip benchmark registration for that `spec`', () => {
      const skipCalls: SkipCall[] = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite: _suite, spec, dir, syncBench }) => {
        if (spec.git === 'bench-test-2') {
          throw new Error('Some Error');
        }
        const prod = require(`${dir}/test/fixtures/prod`);
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert(skipCalls[0] !== undefined);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2',
          prepare: ['npm install']
        });
      });
    });

    it('if async registration function rejects, skip benchmark registration for that `spec`', () => {
      const skipCalls: SkipCall[] = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite: _suite, spec, dir, syncBench }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        const fn = () => {
          prod('Hello World!');
        };
        if (spec.git === 'bench-test-2') {
          return rejectLater(100, new Error('Rejection'));
        }
        return delay(100, syncBench(fn));
      }).then((_suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert(skipCalls[0] !== undefined);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2',
          prepare: ['npm install']
        });
      });
    });

    it('if benchmark registration function does not return function, skip benchmark registration for that `spec`', () => {
      const skipCalls: SkipCall[] = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite: _suite, spec, dir, syncBench }) => {
        if (spec.git === 'bench-test-2') {
          return 'not a valid registration object' as any;
        }
        const prod = require(`${dir}/test/fixtures/prod`);
        return syncBench(() => {
          prod('Hello World!');
        });
      }).then((_suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert(skipCalls[0] !== undefined);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2',
          prepare: ['npm install']
        });
      });
    });

    it('if all benchmark registrations have skipped, rejects with Error', () => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite: _suite, spec: _spec, dir: _dir }) => {
        throw new Error('registration error');
      }).then(shouldNotBeFulfilled, (err) => {
        assert(addCalls.length === 0);
        assert(skipCalls.length === 3);
        assert(err.message === 'All benchmark registrations failed');
      });
    });
  });
});
