import { join } from 'node:path';
import { rmSync } from 'node:fs';
import Benchmark from 'benchmark';
import { setupSuite, normalizeSpecs, benchmarkName } from './suite-setup.mjs';
import type { NormalizedBenchmarkSpec, BenchmarkRegisterFunction, BenchmarkTarget } from './suite-setup.mjs';

type BenchmarkLogger = {
  log (str: string): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (err: any): void
};
type BenchmarkAbortEvent = {
  type: string,
  timeStamp: string
}
type BenchmarkCycleEvent = {
  type: string,
  target: Benchmark,
  currentTarget: Benchmark[]
}
type BenchmarkErrorEvent = {
  type: string,
  target: Benchmark
}
type BenchmarkOptions = {
  logger?: BenchmarkLogger
}

const zf = (n: number, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

class ConsoleLogger {
  log (str: string) {
    console.log(str);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (err: any) {
    console.error(err);
  }
}

function assertLoggerExists (logger: BenchmarkLogger | undefined): asserts logger is BenchmarkLogger {
  if (logger === undefined) {
    throw new Error('options.logger is undefined');
  }
}

function runBenchmark (commitsOrSpecs: BenchmarkTarget[], register: BenchmarkRegisterFunction, options?: BenchmarkOptions): Promise<Benchmark.Suite> {
  options = Object.assign({
    logger: new ConsoleLogger()
  }, options);
  const logger = options.logger;
  assertLoggerExists(logger);
  const destDir = join(process.cwd(), timestampString());
  const setup = setupSuite(new Benchmark.Suite('benchmark-commits'), destDir);
  setup.on('start', (specs) => {
    logger.log(`start preparation of ${specs.length} benchmarks`);
  });
  setup.on('finish', (suite) => {
    logger.log(`finish preparation of ${suite.length} benchmarks`);
  });
  setup.on('preparation:start', (spec: NormalizedBenchmarkSpec, _dir: string) => {
    logger.log(`start preparation of ${benchmarkName(spec)}`);
  });
  setup.on('preparation:finish', (spec: NormalizedBenchmarkSpec, _dir: string) => {
    logger.log(`finish preparation of ${benchmarkName(spec)}`);
  });
  setup.on('register', (spec: NormalizedBenchmarkSpec, _dir: string) => {
    logger.log(`register benchmark of ${benchmarkName(spec)}`);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup.on('skip', (spec: NormalizedBenchmarkSpec, reason: any) => {
    logger.log(`skip benchmark of ${benchmarkName(spec)}, reason: [${reason}]`);
  });
  return new Promise<Benchmark.Suite>((resolve, reject) => {
    const specs = normalizeSpecs(commitsOrSpecs);
    setup.run(specs, register).then((suite: Benchmark.Suite) => {
      suite.on('abort', function (event: BenchmarkAbortEvent) {
        logger.error(event);
      });
      suite.on('error', function (event: BenchmarkErrorEvent) {
        logger.error(event.target.error);
      });
      suite.on('start', function () {
        logger.log(`start suite of ${suite.length} benchmarks`);
      });
      suite.on('cycle', function (event: BenchmarkCycleEvent) {
        const benchmark = event.target;
        if (benchmark.aborted) {
          logger.log(`abort benchmark of ${benchmark}`);
        } else {
          logger.log(`finish benchmark of ${benchmark}`);
        }
      });
      suite.on('complete', function () {
        try {
          const successful = suite.filter('successful');
          if (successful.length === 0) {
            reject(new Error('All benchmarks failed'));
          } else {
            logger.log(`finish suite: fastest is [${suite.filter('fastest').map('name')}]`);
            resolve(suite);
          }
        } finally {
          rmSync(destDir, { recursive: true, force: true });
        }
      });
      suite.run({ async: true });
    }).catch((err) => reject(err));
  });
}

export {
  runBenchmark
};
