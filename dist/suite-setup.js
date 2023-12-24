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
function spawnPromise(command, args, options) {
    return new Promise((resolve, reject) => {
        child_process.spawn(command, args, options)
            .on('error', reject)
            .on('close', (code, _signal) => {
            resolve(code);
        });
    });
}
function parseLine(str) {
    const tokens = str.split(' ');
    return { command: tokens[0], args: tokens.slice(1) };
}
function runSetup(setup, specs, register) {
    const destDir = setup.workDir;
    const suite = setup.suite;
    setup.emit('start', specs);
    const preparations = specs.map((spec) => {
        return new Promise((resolve, reject) => {
            extractGitTreeish.extract({ treeIsh: spec.git, dest: path.join(destDir, spec.name) }).then(({ dir }) => {
                const cwd = spec.workspace ? path.join(dir, spec.workspace) : dir;
                setup.emit('preparation:start', spec, cwd);
                const spawnOptions = {
                    cwd
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                spec.prepare.reduce((promise, nextCommand) => {
                    return promise.then(() => {
                        const { command, args } = parseLine(nextCommand);
                        return spawnPromise(command, args, spawnOptions);
                    });
                }, Promise.resolve()).then(() => {
                    setup.emit('preparation:finish', spec, cwd);
                    resolve({ spec, dir: cwd });
                }).catch(reject);
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
                git: commit,
                prepare: ['npm install']
            };
        }
        else {
            return Object.assign({
                prepare: ['npm install']
            }, commit);
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
