delete require.cache[require.resolve('..')];
const { runBench } = require('..');
const assert = require('assert').strict;

describe('benchmark-commits: Run benchmark on specified git commits', () => {
  it('runBench(specs, register, benchmarkOptions)', (done) => {
    const logs = [];
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
    runBench(specs, ({ suite, spec, dir }) => {
      const prod = require(`${dir}/test/fixtures/prod`);
      return () => {
        prod('Hello World!');
      };
    }, {
      onStart: function (event) {
        logs.push(`onStart`);
      },
      onCycle: function (event) {
        logs.push(`onCycle`);
      },
      onComplete: function (event) {
        logs.push(`onComplete`);
        assert.deepStrictEqual(logs, [
          'onStart',
          'onCycle',
          'onCycle',
          'onCycle',
          'onComplete'
        ]);
        done();
      }
    });
  });
});
