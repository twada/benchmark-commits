import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { extract } from 'extract-git-treeish';
class SuiteSetup extends EventEmitter {
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
            extract({ treeIsh: spec.git, dest: join(destDir, spec.name) }).then(({ dir }) => {
                setup.emit('npm:install:start', spec, dir);
                const spawnOptions = {
                    cwd: dir
                };
                spawn('npm', ['install'], spawnOptions)
                    .on('error', reject)
                    .on('close', (_code, _signal) => {
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
export { setupSuite, normalizeSpecs, benchmarkName };
