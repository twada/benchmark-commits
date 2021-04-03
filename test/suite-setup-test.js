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
}

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

  let targetDir;
  beforeEach(() => {
    targetDir = path.join(os.tmpdir(), ymd());
  });
  afterEach(() => {
    if (fs.existsSync(targetDir)) {
      fs.rmdirSync(targetDir, { recursive: true });
    }
  });

  describe('SuiteSetup#run(specs, register)', () => {
    it('add benchmark for each experiment', (done) => {
      const specs = [
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
      const calls = [];
      const suite = new FakeBenchmarkSuite(calls);
      const setup = new SuiteSetup(suite, targetDir);
      setup.run(specs, ({ suite, spec, dir }) => {
        const prod = require(`${dir}/test/fixtures/prod`);
        return () => {
          prod('Hello World!');
        };
      }).then((suite) => {
        assert(calls.length === 3);
        done();
      });
    });
  });

});
