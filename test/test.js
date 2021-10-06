delete require.cache[require.resolve('..')];
const { runBenchmark } = require('..');
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
      name: 'to-be-skipped',
      git: 'nonexistent1'
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
});
