import { setupSuite, wrapPromiseBenchmark } from '../suite-setup.mjs';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { tmpdir } from 'node:os';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import type { Suite as BenchmarkSuite, Options as BenchmarkOptions, Deferred } from 'benchmark';
import type { NormalizedBenchmarkSpec, BenchmarkLogger } from '../suite-setup.mjs';

const zf = (n: number, len = 2) => String(n).padStart(len, '0');
const timestampString = (d = new Date()) => `${d.getFullYear()}${zf(d.getMonth() + 1)}${zf(d.getDate())}${zf(d.getHours())}${zf(d.getMinutes())}${zf(d.getSeconds())}${zf(d.getMilliseconds(), 3)}`;

type BenchmarkAddCall = {
  name: string,
  fn: Function | string,
  options: BenchmarkOptions | undefined
};

class FakeBenchmarkSuite extends EventEmitter {
  readonly calls: BenchmarkAddCall[];
  constructor (calls: BenchmarkAddCall[]) {
    super();
    this.calls = calls;
  }

  add (name: string, fn: Function | string, options?: BenchmarkOptions) {
    this.calls.push({ name, fn, options });
  }

  get length () {
    return this.calls.length;
  }
}

const delay = (millis: number, val: any): Promise<any> => {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(val);
    }, millis);
  });
};

const rejectLater = (millis: number, err: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(err);
    }, millis);
  });
};

class MockLogger implements BenchmarkLogger {
  public logMessages: any[] = [];
  public errorMessages: any[] = [];

  log (message?: any, ...optionalParams: any[]): void {
    this.logMessages.push([message, ...optionalParams]);
  }

  error (message?: any, ...optionalParams: any[]): void {
    this.errorMessages.push([message, ...optionalParams]);
  }
}

describe('Promise-based asynchronous benchmarks', () => {
  describe('wrapPromiseBenchmark()', () => {
    let mockDeferred: {
      resolve: () => void;
      benchmark: {
        abort: () => void;
      };
    };
    let abortCalled: boolean;
    let resolveCalled: boolean;
    let mockLogger: MockLogger;

    beforeEach(() => {
      abortCalled = false;
      resolveCalled = false;
      mockLogger = new MockLogger();
      mockDeferred = {
        resolve: () => { resolveCalled = true; },
        benchmark: {
          abort: () => { abortCalled = true; }
        }
      };
    });

    it('should resolve deferred when Promise resolves', async () => {
      const promiseFn = async () => {
        await delay(10, null);
      };
      const wrappedFn = wrapPromiseBenchmark(promiseFn, mockLogger);

      wrappedFn(mockDeferred as unknown as Deferred);

      // Wait for async operations to complete
      await delay(50, null);

      assert.strictEqual(resolveCalled, true);
      assert.strictEqual(abortCalled, false);
    });

    it('should abort benchmark when Promise rejects', async () => {
      const promiseFn = async () => {
        await rejectLater(10, new Error('Test error'));
      };
      const wrappedFn = wrapPromiseBenchmark(promiseFn, mockLogger);

      wrappedFn(mockDeferred as unknown as Deferred);

      // Wait for async operations to complete
      await delay(50, null);

      assert.strictEqual(resolveCalled, true);
      assert.strictEqual(abortCalled, true);
    });

    it('should abort benchmark when synchronous error occurs', async () => {
      const promiseFn = async () => {
        throw new Error('Sync error');
      };
      const wrappedFn = wrapPromiseBenchmark(promiseFn, mockLogger);

      wrappedFn(mockDeferred as unknown as Deferred);

      // Wait for async operations to complete
      await delay(50, null);

      assert.strictEqual(resolveCalled, true);
      assert.strictEqual(abortCalled, true);
    });

    it('should log errors to the logger when Promise rejects', async () => {
      const errorMessage = 'Custom test error';
      const promiseFn = async () => {
        await rejectLater(10, new Error(errorMessage));
      };
      const wrappedFn = wrapPromiseBenchmark(promiseFn, mockLogger);

      wrappedFn(mockDeferred as unknown as Deferred);

      // Wait for async operations to complete
      await delay(50, null);

      assert.strictEqual(mockLogger.errorMessages.length, 1);
      assert.strictEqual(mockLogger.errorMessages[0][0].includes(errorMessage), true);
      assert.strictEqual(mockLogger.errorMessages[0][1] instanceof Error, true);
    });
  });

  describe('Promise-based benchmark integration', () => {
    let targetDir: string;
    let addCalls: BenchmarkAddCall[];
    let setup: ReturnType<typeof setupSuite>;
    let specs: NormalizedBenchmarkSpec[];

    beforeEach(() => {
      specs = [
        {
          name: 'Sync',
          git: 'bench-test-1',
          prepare: ['npm install']
        },
        {
          name: 'Deferred',
          git: 'bench-test-2',
          prepare: ['npm install']
        },
        {
          name: 'Promise',
          git: 'bench-test-3',
          prepare: ['npm install']
        }
      ];
      addCalls = [];
      const suite: BenchmarkSuite = new FakeBenchmarkSuite(addCalls) as unknown as BenchmarkSuite;
      targetDir = join(tmpdir(), timestampString());
      setup = setupSuite(suite, targetDir);
    });

    afterEach(() => {
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('should handle both benchmark function types correctly', () => {
      return setup.run(specs, ({ suite: _suite, spec, dir, syncBench, asyncBench }) => {
        if (spec.git === 'bench-test-1') {
          // Synchronous function
          return syncBench(() => {
            // Sync operation
          });
        } else if (spec.git === 'bench-test-2') {
          // Async function using Promise
          return asyncBench(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
          });
        } else {
          // Another Promise-returning async function
          return asyncBench(async () => {
            await delay(10, null);
          });
        }
      }).then((_suite) => {
        assert.strictEqual(addCalls.length, 3);

        // Sync benchmark should not be deferred
        const syncCall = addCalls.find(call => call.name === 'Sync(bench-test-1)');
        assert.strictEqual(syncCall?.options?.defer, false);

        // Async benchmarks should be deferred
        const asyncCall = addCalls.find(call => call.name === 'Deferred(bench-test-2)');
        assert.strictEqual(asyncCall?.options?.defer, true);

        // Promise benchmark should be deferred (wrapped)
        const promiseCall = addCalls.find(call => call.name === 'Promise(bench-test-3)');
        assert.strictEqual(promiseCall?.options?.defer, true);
      });
    });
  });
});
