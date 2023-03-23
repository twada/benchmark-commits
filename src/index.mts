import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { Suite } from 'benchmark';
import { setupSuite, normalizeSpecs, benchmarkName } from './suite-setup.mjs';
import type { BenchmarkRegisterFunction, BenchmarkTarget, BenchmarkSpec } from './suite-setup.mjs';
import type Benchmark from 'benchmark';

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
type BenchmarkLogger = {
  log (str: string): void
  error (err: any): void
};

const zf = (n: number, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

class ConsoleLogger {
  log (str: string) {
    console.log(str);
  }

  error (err: any) {
    console.error(err);
  }
}

function assertLoggerExists(logger: BenchmarkLogger | undefined): asserts logger is BenchmarkLogger {
  if (logger === undefined) {
    throw new Error('options.logger is undefined');
  }
}

function runBenchmark (commitsOrSpecs: BenchmarkTarget[], register: BenchmarkRegisterFunction, options?: BenchmarkOptions): Promise<Suite> {
  options = Object.assign({
    logger: new ConsoleLogger()
  }, options);
  const logger = options.logger;
  assertLoggerExists(logger);
  const destDir = join(process.cwd(), timestampString());
  const setup = setupSuite(new Suite('benchmark-commits'), destDir);
  setup.on('start', (specs) => {
    logger.log(`start preparation of ${specs.length} benchmarks`);
  });
  setup.on('finish', (suite) => {
    logger.log(`finish preparation of ${suite.length} benchmarks`);
  });
  setup.on('npm:install:start', (spec: BenchmarkSpec, dir: string) => {
    logger.log(`start npm install of ${benchmarkName(spec)}`);
  });
  setup.on('npm:install:finish', (spec: BenchmarkSpec, dir: string) => {
    logger.log(`finish npm install of ${benchmarkName(spec)}`);
  });
  setup.on('register', (spec: BenchmarkSpec, dir: string) => {
    logger.log(`register benchmark of ${benchmarkName(spec)}`);
  });
  setup.on('skip', (spec: BenchmarkSpec, reason: any) => {
    logger.log(`skip benchmark of ${benchmarkName(spec)}, reason: [${reason}]`);
  });
  return new Promise<Suite>((resolve, reject) => {
    const specs = normalizeSpecs(commitsOrSpecs);
    setup.run(specs, register).then((suite: Suite) => {
      suite.on('abort', function () {
        logger.error(arguments);
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
      suite.on('complete', function (this: Suite) {
        try {
          const successful = this.filter('successful');
          if (successful.length === 0) {
            reject(new Error('All benchmarks failed'));
          } else {
            logger.log(`finish suite: fastest is [${this.filter('fastest').map('name')}]`);
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
