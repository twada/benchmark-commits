'use strict';

const events = require('events');
const path = require('path');
const child_process = require('child_process');
const extractGitTreeish = require('extract-git-treeish');

class SuiteSetup extends events.EventEmitter {
    constructor(suite, workDir) {
        super();
        this.suite = suite;
        this.workDir = workDir;
    }
    run(specs, register) {
        return runSetup(this, specs, register);
    }
}
function runSetup(setup, specs, register) {
    const destDir = setup.workDir;
    const suite = setup.suite;
    setup.emit('start', specs);
    const preparations = specs.map((spec) => {
        return new Promise((resolve, reject) => {
            extractGitTreeish.extract({ treeIsh: spec.git, dest: path.join(destDir, spec.name) }).then(({ dir }) => {
                setup.emit('npm:install:start', spec, dir);
                const spawnOptions = {
                    cwd: dir
                };
                child_process.spawn('npm', ['install'], spawnOptions)
                    .on('error', reject)
                    .on('close', (code, signal) => {
                    setup.emit('npm:install:finish', spec, dir);
                    resolve({ spec, dir });
                });
            }).catch(reject);
        });
    }).map((installation) => {
        return installation.then(({ spec, dir }) => {
            setup.emit('register', spec, dir);
            return register({ suite, spec, dir });
        });
    });
    return Promise.allSettled(preparations).then(results => {
        specs.forEach((spec, i) => {
            const result = results[i];
            if (result.status === 'fulfilled') {
                const fn = result.value;
                if (typeof fn === 'function') {
                    switch (fn.length) {
                        case 0:
                            suite.add(benchmarkName(spec), fn, { defer: false });
                            break;
                        case 1:
                            suite.add(benchmarkName(spec), fn, { defer: true });
                            break;
                        default:
                            setup.emit('skip', spec, new Error('Benchmark function shuold have 0 or 1 parameter'));
                    }
                }
                else {
                    setup.emit('skip', spec, new TypeError('Benchmark registration function should return function'));
                }
            }
            else if (result.status === 'rejected') {
                setup.emit('skip', spec, result.reason);
            }
        });
        if (suite.length === 0) {
            throw new Error('All benchmark registrations failed');
        }
        else {
            setup.emit('finish', suite);
            return suite;
        }
    });
}
function normalizeSpecs(commits) {
    return commits.map((commit) => {
        if (typeof commit === 'string') {
            return {
                name: commit,
                git: commit
            };
        }
        else {
            return Object.assign({}, commit);
        }
    });
}
function benchmarkName(spec) {
    if (spec.name !== spec.git) {
        return `${spec.name}(${spec.git})`;
    }
    else {
        return spec.git;
    }
}
function setupSuite(suite, workDir) {
    return new SuiteSetup(suite, workDir);
}

exports.benchmarkName = benchmarkName;
exports.normalizeSpecs = normalizeSpecs;
exports.setupSuite = setupSuite;
