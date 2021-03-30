'use strict';

const { join } = require('path');
const { spawn } = require('child_process');
const { extract } = require('extract-git-treeish');
const zf = (n, len = 2) => String(n).padStart(len, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

function prepareSuite (suite, destDir, specs, register) {
  console.log(`prepare ${specs.length} experiments`);
  const tasks = specs.map((spec) => {
    return new Promise((resolve, reject) => {
      extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
        console.log(`start npm install of ${spec.name}(${spec.git})`);
        const spawnOptions = {
          cwd: dir
        };
        spawn('npm', ['install'], spawnOptions)
          .on('error', reject)
          .on('close', (code, signal) => {
            console.log(`finish npm install of ${spec.name}(${spec.git})`);
            resolve({ spec, dir });
          });
      }).catch(reject);
    });
  });
  return Promise.all(tasks).then(results => {
    for (const { spec, dir } of results) {
      console.log(`register benchmark of ${spec.name}(${spec.git})`);
      const fn = register({ suite, spec, dir });
      if (typeof fn === 'function') {
        // suite.add(`${spec.name}(${spec.git})`, fn, howToDesignOptions);
        suite.add(`${spec.name}(${spec.git})`, fn);
      }
    }
    suite.on('start', function () {
      console.log('start benchmark suite');
    });
    suite.on('cycle', function (event) {
      console.log(`finish benchmark of ${event.target}`);
    });
    suite.on('complete', function () {
      console.log('suite completed: fastest is [' + this.filter('fastest').map('name') + ']');
    });
    return suite;
  });
};

module.exports = {
  prepareSuite,
  ymd
};
