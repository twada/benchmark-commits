'use strict';

const EventEmitter = require('events');
const { join } = require('path');
const { spawn } = require('child_process');
const { extract } = require('extract-git-treeish');
const zf = (n, len = 2) => String(n).padStart(len, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

class SuiteSetup extends EventEmitter {
  constructor(suite, workDir) {
    super();
    this.suite = suite;
    this.workDir = workDir;
  }
  run(specs, register) {
    const setup = this;
    const destDir = this.workDir;
    const suite = this.suite;
    setup.emit('start', specs);
    const tasks = specs.map((spec) => {
      return new Promise((resolve, reject) => {
        extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
          setup.emit('npm:install:start', spec, dir);
          const spawnOptions = {
            cwd: dir
          };
          spawn('npm', ['install'], spawnOptions)
              .on('error', reject)
              .on('close', (code, signal) => {
                setup.emit('npm:install:finish', spec, dir);
                resolve({ spec, dir });
              });
        }).catch(reject);
      });
    });
    return Promise.all(tasks).then(results => {
      for (const { spec, dir } of results) {
        setup.emit('register', spec, dir);
        const fn = register({ suite, spec, dir });
        if (typeof fn === 'function') {
          // suite.add(`${spec.name}(${spec.git})`, fn, howToDesignOptions);
          suite.add(`${spec.name}(${spec.git})`, fn);
        }
      }
      setup.emit('finish', specs);
      return suite;
    });
  }
}

function commitsToSpecs(commits) {
  return commits.map((commit) => {
    if (typeof commit === 'string') {
      return {
        name: commit,
        git: commit
      };
    } else {
      return Object.assign({}, commit);
    }
  });
}

module.exports = {
  SuiteSetup,
  commitsToSpecs,
  ymd
};