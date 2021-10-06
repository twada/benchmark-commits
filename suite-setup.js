'use strict';

const EventEmitter = require('events');
const { join } = require('path');
const { spawn } = require('child_process');
const { extract } = require('extract-git-treeish');
const zf = (n, len = 2) => String(n).padStart(len, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;
const isPromiseLike = (o) => o !== null &&
      typeof o === 'object' &&
      typeof o.then === 'function' &&
      typeof o.catch === 'function';

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

    const installations = specs.map((spec) => {
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

    const registrations = installations.map((installation) => {
      return installation.then(({spec, dir}) => {
        const addToSuite = (fn) => {
          if (typeof fn === 'function') {
            suite.add(specDesc(spec), fn);
          }
          return {spec, dir};
        };
        setup.emit('register', spec, dir);
        // rejects benchmark registration Promise on error
        const fn = register({ suite, spec, dir });
        if (isPromiseLike(fn)) {
          // rejects benchmark registration Promise if fn rejects
          return fn.then((resolved) => addToSuite(resolved));
        } else {
          return addToSuite(fn);
        }
      });
    });

    return Promise.allSettled(registrations).then(results => {
      specs.forEach((spec, i) => {
        const result = results[i];
        if (result.status === 'rejected') {
          setup.emit('skip', spec, result.reason);
        }
      });
      setup.emit('finish', suite);
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

function specDesc(spec) {
  if (spec.name !== spec.git) {
    return `${spec.name}(${spec.git})`;
  } else {
    return spec.git;
  }
}

module.exports = {
  SuiteSetup,
  commitsToSpecs,
  specDesc,
  ymd
};
