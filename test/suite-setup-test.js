delete require.cache[require.resolve('../suite-setup')];
const { SuiteSetup, commitsToSpecs, specDesc, ymd } = require('../suite-setup');
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;
const EventEmitter = require('events');
class FakeBenchmarkSuite extends EventEmitter {
  constructor(calls) {
    super();
    this.calls = calls;
  }
  add(name, fn, options) {
    this.calls.push({name, fn, options});
  }
  get length() {
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
const shouldNotBeFulfilled = (done) => {
  return (args) => {
    done(new Error('should not be fulfilled'));
  };
};

describe('benchmark-commits: Run benchmark on specified git commits', () => {
  describe('specDesc(spec)', () => {
    it('commit-id only', () => {
      const spec = {
        name: 'bench-test-1',
        git: 'bench-test-1'
      };
      assert(specDesc(spec) === 'bench-test-1');
    });
    it('name and commit-id', () => {
      const spec = {
        name: 'Regex#test',
        git: 'bench-test-1'
      };
      assert(specDesc(spec) === 'Regex#test(bench-test-1)');
    });
  });

  describe('commitsToSpecs(commits)', () => {
    it('normalize to specs', () => {
      const commits = [
        'bench-test-1',
        'bench-test-2',
        'bench-test-3',
      ];
      assert.deepEqual(commitsToSpecs(commits), [
        {
          name: 'bench-test-1',
          git: 'bench-test-1'
        },
        {
          name: 'bench-test-2',
          git: 'bench-test-2'
        },
        {
          name: 'bench-test-3',
          git: 'bench-test-3'
        }
      ]);
    });
    it('nothing to do if already in name-git form', () => {
      const commits = [
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
      assert.deepEqual(commitsToSpecs(commits), [
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
      ]);
    });
  });

  describe('SuiteSetup#run(specs, register)', () => {
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
      targetDir = path.join(os.tmpdir(), ymd());
      setup = new SuiteSetup(suite, targetDir);
    });

    afterEach(() => {
      if (fs.existsSync(targetDir)) {
        (fs.rmSync || fs.rmdirSync)(targetDir, { recursive: true, force: true });
      }
    });


    it('skip benchmark registration if tree-ish does not exist', (done) => {
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
        skipCalls.push({spec, reason});
      });
      setup.run(specsIncldingError, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 3);
        assert(skipCalls.length === 2);
        assert.deepEqual(skipCalls[0].spec, { name: 'error1', git: 'nonexistent1' });
        assert.deepEqual(skipCalls[1].spec, { name: 'error2', git: 'nonexistent2' });
        done();
      });
    });

    it('skip benchmark registration if error occurred in registration function', (done) => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({spec, reason});
      });
      setup.run(specs, ({ suite, spec, dir }) => {
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
        done();
      });
    });

    it('skip benchmark registration if async registration function rejects', (done) => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({spec, reason});
      });
      setup.run(specs, ({ suite, spec, dir }) => {
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
        done();
      });
    });

    it('skip benchmark registration if benchmark registration function does not return function', (done) => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({spec, reason});
      });
      setup.run(specs, ({ suite, spec, dir }) => {
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
        done();
      });
    });

    it('rejects if all benchmark registration failed', (done) => {
      const skipCalls = [];
      setup.on('skip', (spec, reason) => {
        skipCalls.push({spec, reason});
      });
      setup.run(specs, ({ suite, spec, dir }) => {
        throw new Error('registration error');
      }).then(shouldNotBeFulfilled(done), (err) => {
        assert(addCalls.length === 0);
        assert(skipCalls.length === 3);
        assert(err.message === 'All benchmark registrations failed');
        done();
      });
    });

    it('add benchmark for each experiment', (done) => {
      setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(addCalls.length === 3);
        done();
      });
    });

    it('register benchmark asynchronously (e.g. dynamic import)', (done) => {
      setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        const fn = () => {
          prod('Hello World!');
        };
        return delay(100, fn);
      }).then((suite) => {
        assert(addCalls.length === 3);
        done();
      });
    });
  });
});
