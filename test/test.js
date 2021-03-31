delete require.cache[require.resolve('..')];
const { runBenchmark } = require('..');
const { SuiteSetup, ymd } = require('../prepare');
const Benchmark = require('benchmark');
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

  it('runBenchmark(specs, register)', (done) => {
    runBenchmark(specs, ({ suite, spec, dir }) => {
      const prod = require(`${dir}/test/fixtures/prod`);
      return () => {
        prod('Hello World!');
      };
    }).then((suite) => {
      assert(suite.length === 3);
      assert(suite.aborted === false);
      done();
    });
  });

  describe('SuiteSetup#run(specs, register)', () => {
    let targetDir;
    beforeEach(() => {
      targetDir = path.join(os.tmpdir(), ymd());
    });
    afterEach(() => {
      if (fs.existsSync(targetDir)) {
        fs.rmdirSync(targetDir, { recursive: true });
      }
    });
    it('add benchmark for each experiment', (done) => {
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
