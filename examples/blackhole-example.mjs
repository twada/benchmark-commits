// Example demonstrating the use of the blackhole feature
// to prevent JIT compiler optimizations

import { runBenchmark } from '../dist/index.mjs';

// This example compares three different ways of handling calculation results:
// 1. Not using the result (may be optimized away by the JIT)
// 2. Using the blackhole feature (prevents optimization)
// 3. Using a global variable (less efficient but also prevents optimization)

// A simple function that performs calculation but its result might be optimized away
function calculateFibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return b;
}

// Global variable to store results (not recommended, but used for comparison)
let globalResult;

// Define benchmark targets
const specs = [
  {
    name: 'main',
    git: 'main', // Use the current branch
    prepare: [] // No preparation needed for this example
  }
];

// Run the benchmark
runBenchmark(specs, ({ suite, syncBench, blackhole }) => {
  // Case 1: Not using the result (may be optimized away)
  suite.add('Without blackhole (may be optimized away)', () => {
    // Result is calculated but not used
    calculateFibonacci(30);
    // JIT might eliminate this calculation as "dead code"
  });

  // Case 2: Using blackhole feature (prevents optimization)
  suite.add('With blackhole (prevents optimization)', () => {
    // Calculate result and explicitly consume it
    const result = calculateFibonacci(30);
    blackhole(result);
  });

  // Case 3: Using global variable (prevents optimization but less clean)
  suite.add('With global variable (prevents optimization)', () => {
    // Assign to global variable to prevent elimination
    globalResult = calculateFibonacci(30);
  });

  // Return synchronous benchmark
  return syncBench(() => {
    // Just a placeholder function
    // The actual benchmarks are added directly to the suite above
  });
}).then(suite => {
  // Output the results comparison
  console.log('\nResults comparison:');
  console.log('------------------');
  
  const benchmarks = suite.filter('successful');
  if (benchmarks.length > 0) {
    const fastest = suite.filter('fastest').map('name');
    console.log(`Fastest: ${fastest}`);
    
    // Compare performance differences (if any)
    if (benchmarks.length >= 2) {
      for (let i = 0; i < benchmarks.length; i++) {
        for (let j = i + 1; j < benchmarks.length; j++) {
          const a = benchmarks[i];
          const b = benchmarks[j];
          const diff = ((a.stats.mean - b.stats.mean) / b.stats.mean) * 100;
          console.log(`${a.name} is ${Math.abs(diff).toFixed(2)}% ${diff > 0 ? 'slower' : 'faster'} than ${b.name}`);
        }
      }
    }
  }
}).catch(err => {
  console.error('Benchmark failed:', err);
});