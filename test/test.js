delete require.cache[require.resolve('..')];
const { runBenchmark } = require('..');
const assert = require('assert').strict;
const shouldNotBeFulfilled = () => {
  assert(false, 'should not be fulfilled');
};
class SpyLogger {
  constructor () {
    this.logCalls = [];
    this.errorCalls = [];
  }

  log (str) {
    this.logCalls.push(str);
  }

  error (err) {
    this.errorCalls.push(err);
  }
}
const sorted = (ary) => {
  const a = ary.slice();
  a.sort();
  return a;
};
const take = (ary, len) => {
  return ary.splice(0, len);
};

describe('runBenchmark(commitsOrSpecs, register): run benchmark for given `commitsOrSpecs`. Each benchmark function is registered via `register` function', () => {
  it('if all benchmark executions have finished (at least one benchmark was successful), output benchmark result then resolve with benchmark suite', () => {
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
    const spyLogger = new SpyLogger();
    const config = {
      logger: spyLogger
    };
    return runBenchmark(specs, ({ suite, spec, dir }) => {
      const prod = require(`${dir}/test/fixtures/prod`);
      return () => {
        prod('Hello World!');
      };
    }, config).then((suite) => {
      assert(suite.length === 3);
      assert(suite.aborted === false);
      const logs = spyLogger.logCalls;
      assert(logs.shift() === 'start preparation of 4 benchmarks');
      assert.deepEqual(sorted(take(logs, 9)), sorted([
        'start npm install of Regex#test(bench-test-1)',
        'start npm install of String#indexOf(bench-test-2)',
        'start npm install of String#match(bench-test-3)',
        'finish npm install of Regex#test(bench-test-1)',
        'register benchmark of Regex#test(bench-test-1)',
        'finish npm install of String#indexOf(bench-test-2)',
        'register benchmark of String#indexOf(bench-test-2)',
        'finish npm install of String#match(bench-test-3)',
        'register benchmark of String#match(bench-test-3)'
      ]));
      assert(logs.shift() === 'skip benchmark of to-be-skipped(nonexistent1), reason: [Error: Specified <tree-ish> does not exist [nonexistent1]]');
      assert.deepEqual(take(logs, 2), [
        'finish preparation of 3 benchmarks',
        'start suite of 3 benchmarks'
      ]);
      const finishLogs = take(logs, 3);
      assert(finishLogs.some((log) => log.startsWith('finish benchmark of Regex#test(bench-test-1)')));
      assert(finishLogs.some((log) => log.startsWith('finish benchmark of String#indexOf(bench-test-2)')));
      assert(finishLogs.some((log) => log.startsWith('finish benchmark of String#match(bench-test-3)')));
      assert(logs.shift() === 'finish suite: fastest is [String#indexOf(bench-test-2)]');
    });
  });

  it('if all benchmark executions have failed, reject with Error', () => {
    const specs = [
      'bench-test-1',
      'bench-test-2'
    ];
    const spyLogger = new SpyLogger();
    const config = {
      logger: spyLogger
    };
    return runBenchmark(specs, ({ suite, spec, dir }) => {
      require(`${dir}/test/fixtures/prod`);
      return () => {
        throw new Error(`execution error ${spec.git}`);
      };
    }, config).then(shouldNotBeFulfilled, (err) => {
      const logs = spyLogger.logCalls;
      assert(logs.shift() === 'start preparation of 2 benchmarks');
      assert.deepEqual(sorted(take(logs, 6)), sorted([
        'start npm install of bench-test-2',
        'start npm install of bench-test-1',
        'finish npm install of bench-test-2',
        'register benchmark of bench-test-2',
        'finish npm install of bench-test-1',
        'register benchmark of bench-test-1'
      ]));
      assert.deepEqual(take(logs, 4), [
        'finish preparation of 2 benchmarks',
        'start suite of 2 benchmarks',
        'abort benchmark of bench-test-1: ',
        'abort benchmark of bench-test-2: '
      ]);
      assert(err instanceof Error);
      assert(err.message === 'All benchmarks failed');
    });
  });
});
