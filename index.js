'use strict';

const { join } = require('path');
const fs = require('fs');
const Benchmark = require('benchmark');
const { setupSuite, commitsToSpecs, benchmarkName } = require('./suite-setup');
const zf = (n, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

class ConsoleLogger {
  log (str) {
    console.log(str);
  }

  error (err) {
    console.error(err);
  }
}

function runBenchmark (commits, register, options) {
  options = Object.assign({
    logger: new ConsoleLogger()
  }, options);
  const logger = options.logger;
  const destDir = join(process.cwd(), timestampString());
  const setup = setupSuite(new Benchmark.Suite('benchmark-commits'), destDir);
  setup.on('start', (specs) => {
    logger.log(`start preparation of ${specs.length} benchmarks`);
  });
  setup.on('finish', (suite) => {
    logger.log(`finish preparation of ${suite.length} benchmarks`);
  });
  setup.on('npm:install:start', (spec, dir) => {
    logger.log(`start npm install of ${benchmarkName(spec)}`);
  });
  setup.on('npm:install:finish', (spec, dir) => {
    logger.log(`finish npm install of ${benchmarkName(spec)}`);
  });
  setup.on('register', (spec, dir) => {
    logger.log(`register benchmark of ${benchmarkName(spec)}`);
  });
  setup.on('skip', (spec, reason) => {
    logger.log(`skip benchmark of ${benchmarkName(spec)}, reason: [${reason}]`);
  });
  return new Promise((resolve, reject) => {
    const specs = commitsToSpecs(commits);
    setup.run(specs, register).then((suite) => {
      suite.on('abort', function () {
        logger.error(arguments);
      });
      suite.on('error', function (event) {
        logger.error(event.target.error);
      });
      suite.on('start', function () {
        logger.log(`start suite of ${suite.length} benchmarks`);
      });
      suite.on('cycle', function (event) {
        const benchmark = event.target;
        if (benchmark.aborted) {
          logger.log(`abort benchmark of ${benchmark}`);
        } else {
          logger.log(`finish benchmark of ${benchmark}`);
        }
      });
      suite.on('complete', function () {
        try {
          const successful = this.filter('successful');
          if (successful.length === 0) {
            reject(new Error('All benchmarks failed'));
          } else {
            logger.log(`finish suite: fastest is [${this.filter('fastest').map('name')}]`);
            resolve(suite);
          }
        } finally {
          (fs.rmSync || fs.rmdirSync)(destDir, { recursive: true, force: true });
        }
      });
      suite.run({ async: true });
    }).catch((err) => reject(err));
  });
}

module.exports = {
  runBenchmark
};
