'use strict';

const { join } = require('path');
const { rmdirSync } = require('fs');
const Benchmark = require('benchmark');
const { SuiteSetup, ymd } = require('./suite-setup');

function runBenchmark (specs, register) {
  const destDir = join(process.cwd(), ymd());
  const setup = new SuiteSetup(new Benchmark.Suite('benchmark-commits'), destDir);
  setup.on('start', (specs) => {
    console.log(`start preparation of ${specs.length} experiments`);
  });
  setup.on('finish', (specs) => {
    console.log(`finish preparation of ${specs.length} experiments`);
  });
  setup.on('npm:install:start', (spec, dir) => {
    console.log(`start npm install of ${spec.name}(${spec.git})`);
  });
  setup.on('npm:install:finish', (spec, dir) => {
    console.log(`finish npm install of ${spec.name}(${spec.git})`);
  });
  setup.on('register', (spec, dir) => {
    console.log(`register benchmark of ${spec.name}(${spec.git})`);
  });
  return new Promise((resolve, reject) => {
    setup.run(specs, register).then((suite) => {
      suite.on('start', function () {
        console.log('start benchmark suite');
      });
      suite.on('cycle', function (event) {
        console.log(`finish benchmark of ${event.target}`);
      });
      suite.on('complete', function () {
        console.log('suite completed: fastest is [' + this.filter('fastest').map('name') + ']');
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
