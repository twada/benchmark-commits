import { pathToFileURL } from 'url';
import { runBenchmark } from '../dist/index.mjs';

const specs = [
  {
    name: 'Regex#test',
    git: 'bench-test-1-esm',
    workdir: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#indexOf',
    git: 'bench-test-2-esm',
    workdir: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#match',
    git: 'bench-test-3-esm',
    workdir: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Example using Promise-based asynchronous benchmarks
runBenchmark(specs, async ({ suite, spec, dir }) => {
  // dir: /absolute/path/to/20231230035547807/String#match/test/fixtures
  const { default: prod } = await import(pathToFileURL(`${dir}/prod.mjs`));
  
  // Return a Promise-based async function
  // This will be automatically wrapped to work with Benchmark.js
  return async () => {
    // Simulate some async operation
    await delay(1);
    prod('Hello World with Promise!');
  };
}).then((suite) => {
  console.log('FINISHED');
}).catch((err) => {
  console.error(err);
});