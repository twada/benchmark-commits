import { pathToFileURL } from 'url';
import { runBenchmark } from '../index.js';
const specs = [
  {
    name: 'Regex#test in ESM',
    git: 'bench-test-1-esm'
  },
  {
    name: 'String#indexOf in ESM',
    git: 'bench-test-2-esm'
  },
  {
    name: 'String#match in ESM',
    git: 'bench-test-3-esm'
  }
];
runBenchmark(specs, async ({ suite, spec, dir }) => {
  const {default: prod} = await import(pathToFileURL(`${dir}/test/fixtures/prod.mjs`));
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  console.log('FINISHED');
});
