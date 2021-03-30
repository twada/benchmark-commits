delete require.cache[require.resolve('..')];
const { runBenchmark, prepareSuite } = require('..');
const Benchmark = require('benchmark');
const assert = require('assert').strict;

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

  it('prepareSuite(suite, specs, register)', (done) => {
    const logs = [];
    const suite = new Benchmark.Suite('benchmark-commits', {
      onStart: function (event) {
        logs.push(`onStart`);
      },
      onCycle: function (event) {
        logs.push(`onCycle`);
      },
      onComplete: function (event) {
        logs.push(`onComplete`);
      }
    });
    prepareSuite(suite, specs, ({ suite, spec, dir }) => {
      const prod = require(`${dir}/test/fixtures/prod`);
      return () => {
        prod('Hello World!');
      };
    }).then((suite) => {
      logs.push(`before calling suite.run`);
      suite.run({ async: true });
      logs.push(`after calling suite.run`);
      suite.on('complete', function () {
        assert.deepStrictEqual(logs, [
          'before calling suite.run',
          'onStart',
          'after calling suite.run',
          'onCycle',
          'onCycle',
          'onCycle',
          'onComplete'
        ]);
        done();
      });
    });
  });
});
