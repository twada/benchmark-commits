'use strict';

const { join } = require('path');
const { rmdirSync } = require('fs');
const Benchmark = require('benchmark');
const { SuiteSetup, commitsToSpecs, specDesc, ymd } = require('./suite-setup');

function runBenchmark (commits, register) {
  const destDir = join(process.cwd(), ymd());
  const setup = new SuiteSetup(new Benchmark.Suite('benchmark-commits'), destDir);
  setup.on('start', (specs) => {
    console.log(`start preparation of ${specs.length} benchmarks`);
  });
  setup.on('finish', (specs) => {
    console.log(`finish preparation of ${specs.length} benchmarks`);
  });
  setup.on('npm:install:start', (spec, dir) => {
    console.log(`start npm install of ${specDesc(spec)}`);
  });
  setup.on('npm:install:finish', (spec, dir) => {
    console.log(`finish npm install of ${specDesc(spec)}`);
  });
  setup.on('register', (spec, dir) => {
    console.log(`register benchmark of ${specDesc(spec)}`);
  });
  return new Promise((resolve, reject) => {
    const specs = commitsToSpecs(commits);
    setup.run(specs, register).then((suite) => {
      suite.on('abort', function () {
        console.error(arguments);
      });
      suite.on('error', function (event) {
        console.error(event.target.error);
      });
      suite.on('start', function () {
        console.log(`start suite of ${specs.length} benchmarks`);
      });
      suite.on('cycle', function (event) {
        console.log(`finish benchmark of ${event.target}`);
      });
      suite.on('complete', function () {
        console.log(`finish suite: fastest is [${this.filter('fastest').map('name')}]`);
        rmdirSync(destDir, { recursive: true });
        resolve(suite);
      });
      suite.run({ async: true });
    });
  });
}

module.exports = {
  runBenchmark
};
