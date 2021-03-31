'use strict';

const { join } = require('path');
const { rmdirSync } = require('fs');
const Benchmark = require('benchmark');
const { prepareSuite, ymd } = require('./prepare');

function runBenchmark (specs, register) {
  const destDir = join(process.cwd(), ymd());
  return new Promise((resolve, reject) => {
    prepareSuite(new Benchmark.Suite('benchmark-commits'), destDir, specs, register).then((suite) => {
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
