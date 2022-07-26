import { setupSuite, normalizeSpecs, benchmarkName } from '../src/suite-setup.mjs';
import { tmpdir } from 'os';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { strict as assert } from 'assert';
import { EventEmitter } from 'events';
// import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const zf = (n, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;
class FakeBenchmarkSuite extends EventEmitter {
  constructor (calls) {
    super();
    this.calls = calls;
  }

  add (name, fn, options) {
    this.calls.push({ name, fn, options });
  }

  get length () {
    return this.calls.length;
  }
}
const delay = (millis, val) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(val);
    }, millis);
  });
};
const rejectLater = (millis, err) => {
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
  describe('`commitsOrSpecs` is an array of either (1) string specifying git tag/branch/commit or (2) object having `name` and `git` properties, pointing to git object to be checked out for the benchmark', () => {
    describe('internally, each item in `commitsOrSpecs` is normalized to `spec` object in {name, git} form', () => {
      describe('if `commitsOrSpecs` is an array of string specifying git tag/branch/commit', () => {
        it('converts each string to {name, git} form. name === git in this case.', () => {
          const commits = [
            'bench-test-1',
            'bench-test-2',
            'bench-test-3'
          ];
          assert.deepEqual(normalizeSpecs(commits), [
            { name: 'bench-test-1', git: 'bench-test-1' },
            { name: 'bench-test-2', git: 'bench-test-2' },
            { name: 'bench-test-3', git: 'bench-test-3' }
          ]);
        });
        it('use git object name as benchmark name', () => {
          const spec = { name: 'bench-test-1', git: 'bench-test-1' };
          assert(benchmarkName(spec) === 'bench-test-1');
        });
      });
      describe('if `commitsOrSpecs` is already an array of `spec` object having {name, git} form', () => {
        it('use them as `spec` object', () => {
          const commits = [
            { name: 'Regex#test', git: 'bench-test-1' },
            { name: 'String#indexOf', git: 'bench-test-2' },
            { name: 'String#match', git: 'bench-test-3' }
          ];
          assert.deepEqual(normalizeSpecs(commits), [
            { name: 'Regex#test', git: 'bench-test-1' },
            { name: 'String#indexOf', git: 'bench-test-2' },
            { name: 'String#match', git: 'bench-test-3' }
          ]);
        });
        it('generated benchmark name is `name(git)`', () => {
          const spec = { name: 'Regex#test', git: 'bench-test-1' };
          assert(benchmarkName(spec) === 'Regex#test(bench-test-1)');
        });
      });
    });
  });

  describe('`register` is a benchmark registration function that returns benchmark function. benchmark registration function takes { suite, spec, dir} as arguments. benchmark function takes no arguments.', () => {
    let targetDir;
    let addCalls;
    let setup;
    let specs;

    beforeEach(() => {
      specs = [
        {
          name: 'Regex#test',
          git: 'bench-test-1'
        },
        {
          name: 'String#indexOf',
          git: 'bench-test-2'
        },
        {
          name: 'String#match',
          git: 'bench-test-3'
        }
      ];
      addCalls = [];
      const suite = new FakeBenchmarkSuite(addCalls);
      targetDir = join(tmpdir(), timestampString());
      setup = setupSuite(suite, targetDir);
    });

    afterEach(() => {
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('if `register` function runs synchronously, register benchmark function immediately ', () => {
      return setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 3);
      });
    });

    it('if `register` function is an async function or returns Promise, register benchmark function asynchronously', () => {
      return setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        const fn = () => {
          prod('Hello World!');
        };
        return delay(100, fn);
      }).then((suite) => {
        assert(addCalls.length === 3);
      });
    });

    it('if git commit object in `commitsOrSpecs` does not exist in underlying git repository, skip benchmark registration for that `spec`', () => {
      const specsIncldingError = [
        {
          name: 'error1',
          git: 'nonexistent1'
        },
        ...specs,
        {
          name: 'error2',
          git: 'nonexistent2'
        }
      ];
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specsIncldingError, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 3);
        assert(skipCalls.length === 2);
        assert.deepEqual(skipCalls[0].spec, { name: 'error1', git: 'nonexistent1' });
        assert.deepEqual(skipCalls[1].spec, { name: 'error2', git: 'nonexistent2' });
      });
    });

    it('if error occurred while executing registration function, skip benchmark registration for that `spec`', () => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite, spec, dir }) => {
        if (spec.git === 'bench-test-2') {
          throw new Error('Some Error');
        }
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2'
        });
      });
    });

    it('if async registration function rejects, skip benchmark registration for that `spec`', () => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        const fn = () => {
          prod('Hello World!');
        };
        if (spec.git === 'bench-test-2') {
          return rejectLater(100, new Error('Rejection'));
        }
        return delay(100, fn);
      }).then((suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2'
        });
      });
    });

    it('if benchmark registration function does not return function, skip benchmark registration for that `spec`', () => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite, spec, dir }) => {
        if (spec.git === 'bench-test-2') {
          return 'not a function';
        }
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 2);
        assert(skipCalls.length === 1);
        assert.deepEqual(skipCalls[0].spec, {
          name: 'String#indexOf',
          git: 'bench-test-2'
        });
      });
    });

    it('if all benchmark registrations have skipped, rejects with Error', () => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({ spec, reason });
      });
      return setup.run(specs, ({ suite, spec, dir }) => {
        throw new Error('registration error');
      }).then(shouldNotBeFulfilled, (err) => {
        assert(addCalls.length === 0);
        assert(skipCalls.length === 3);
        assert(err.message === 'All benchmark registrations failed');
      });
    });
  });
});
