import { pathToFileURL } from 'url';
import { runBenchmark } from '../dist/index.mjs';
const specs = [
  {
    name: 'Regex#test in ESM',
    git: 'bench-test-1-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#indexOf in ESM',
    git: 'bench-test-2-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#match in ESM',
    git: 'bench-test-3-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  }
];
runBenchmark(specs, async ({ suite, spec, dir }) => {
  const {default: prod} = await import(pathToFileURL(`${dir}/prod.mjs`));
  // const {default: prod} = await import(pathToFileURL(`${dir}/test/fixtures/prod.mjs`));
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  console.log('FINISHED');
});
