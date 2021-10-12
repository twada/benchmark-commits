delete require.cache[require.resolve('..')];
const { runBenchmark } = require('..');
const assert = require('assert').strict;
const shouldNotBeFulfilled = (done) => {
  return (args) => {
    done(new Error('should not be fulfilled'));
  };
};

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

describe('runBenchmark rejects if all benchmark executions have failed', () => {
  const specs = [
    'bench-test-1',
    'bench-test-2'
  ];
  it('runBenchmark(specs, register) with failure', (done) => {
    runBenchmark(specs, ({ suite, spec, dir }) => {
      require(`${dir}/test/fixtures/prod`);
      return () => {
        throw new Error(`execution error ${spec.git}`);
      };
    }).then(shouldNotBeFulfilled(done), (err) => {
      assert(err instanceof Error);
      assert(err.message === 'All benchmarks failed');
      done();
    });
  });
});
