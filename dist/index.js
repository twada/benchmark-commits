'use strict';

const path = require('path');
const fs = require('fs');
const Benchmark = require('benchmark');
const suiteSetup = require('./suite-setup.js');

const zf = (n, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;
class ConsoleLogger {
    log(str) {
        console.log(str);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(err) {
        console.error(err);
    }
}
function assertLoggerExists(logger) {
    if (logger === undefined) {
        throw new Error('options.logger is undefined');
    }
}
function runBenchmark(commitsOrSpecs, register, options) {
    options = Object.assign({
        logger: new ConsoleLogger()
    }, options);
    const logger = options.logger;
    assertLoggerExists(logger);
    const destDir = path.join(process.cwd(), timestampString());
    const setup = suiteSetup.setupSuite(new Benchmark.Suite('benchmark-commits'), destDir);
    setup.on('start', (specs) => {
        logger.log(`start preparation of ${specs.length} benchmarks`);
    });
    setup.on('finish', (suite) => {
        logger.log(`finish preparation of ${suite.length} benchmarks`);
    });
    setup.on('preparation:start', (spec, _dir) => {
        logger.log(`start preparation of ${suiteSetup.benchmarkName(spec)}`);
    });
    setup.on('preparation:finish', (spec, _dir) => {
        logger.log(`finish preparation of ${suiteSetup.benchmarkName(spec)}`);
    });
    setup.on('register', (spec, _dir) => {
        logger.log(`register benchmark of ${suiteSetup.benchmarkName(spec)}`);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setup.on('skip', (spec, reason) => {
        logger.log(`skip benchmark of ${suiteSetup.benchmarkName(spec)}, reason: [${reason}]`);
    });
    return new Promise((resolve, reject) => {
        const specs = suiteSetup.normalizeSpecs(commitsOrSpecs);
        setup.run(specs, register).then((suite) => {
            suite.on('abort', function (event) {
                logger.error(event);
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
                }
                else {
                    logger.log(`finish benchmark of ${benchmark}`);
                }
            });
            suite.on('complete', function () {
                try {
                    fs.rmSync(destDir, { recursive: true, force: true });
                }
                catch (err) {
                    logger.error(err);
                }
                const successful = suite.filter('successful');
                if (successful.length === 0) {
                    reject(new Error('All benchmarks failed'));
                }
                else {
                    logger.log(`finish suite: fastest is [${suite.filter('fastest').map('name')}]`);
                    resolve(suite);
                }
            });
            suite.run({ async: true });
        }).catch((err) => reject(err));
    });
}

exports.runBenchmark = runBenchmark;
