// Migration example from old API to new API
import { runBenchmark } from '../dist/index.mjs';

const specs = [
  {
    name: 'Example benchmark',
    git: 'main', // Using main branch as an example
    prepare: ['npm install']
  }
];

/*
 * OLD API (Before ADR-002)
 * 
 * // Synchronous function
 * runBenchmark(specs, ({ suite, spec, dir }) => {
 *   return () => {
 *     // Synchronous operation
 *   };
 * });
 * 
 * // Deferred pattern for async (REMOVED)
 * runBenchmark(specs, ({ suite, spec, dir }) => {
 *   return (deferred) => {
 *     setTimeout(() => {
 *       // Async operation
 *       deferred.resolve();
 *     }, 100);
 *   };
 * });
 * 
 * // Promise-based async function
 * runBenchmark(specs, ({ suite, spec, dir }) => {
 *   return async () => {
 *     await someAsyncOperation();
 *   };
 * });
 */

/*
 * NEW API (After ADR-002)
 */

// Synchronous function - using syncBench
runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  return syncBench(() => {
    // Synchronous operation
    console.log('Running synchronous benchmark');
  });
});

// Asynchronous function - using asyncBench (instead of Deferred pattern or direct async function)
runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  return asyncBench(async () => {
    // Asynchronous operation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Running asynchronous benchmark');
  });
});