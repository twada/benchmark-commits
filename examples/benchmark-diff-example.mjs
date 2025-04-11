// Example usage of benchmarkDiffWithBaseline for comparing performance
import { benchmarkDiffWithBaseline } from '@twada/benchmark-commits';

// Basic configuration for comparing current branch with main branch
const baseline = {
  git: 'main',
  prepare: ['npm install', 'npm run build'],
  workdir: './' // Use repository root or specify a subdirectory for monorepos
};

// Sample benchmark function that measures string operations
benchmarkDiffWithBaseline(baseline, ({ suite, spec, dir, syncBench, blackhole }) => {
  // Import the module to benchmark from the prepared directory
  // This could be your actual module in a real scenario
  // const moduleToTest = require(`${dir}/dist/index.js`);

  // For demonstration, we'll just do a simple string operation
  return syncBench(() => {
    const input = 'benchmark-commits performance testing';
    const result = input
      .split('')
      .sort()
      .join('')
      .replace(/\s+/g, '')
      .toUpperCase();
    
    // Use blackhole to prevent dead code elimination
    blackhole(result);
  });
}, {
  // Configuration options
  maxDegradation: 5, // Fail if current branch is more than 5% slower
  exitOnFail: true,  // Exit with error code on failure (useful for CI)
  exitCode: 1        // Use exit code 1 on failure
});