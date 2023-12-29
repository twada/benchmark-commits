import { pathToFileURL } from 'url';
import { runBenchmark } from '../dist/index.mjs';
const specs = [
  {
    name: 'Regex#test',
    git: 'bench-test-1-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#indexOf',
    git: 'bench-test-2-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#match',
    git: 'bench-test-3-esm',
    workspace: 'test/fixtures',
    prepare: [
      'npm install'
    ]
  }
];
runBenchmark(specs, async ({ suite, spec, dir }) => {
  // dir: /absolute/path/to/20231230035547807/String#match/test/fixtures

  // const {default: prod} = await import(pathToFileURL(`${dir}/test/fixtures/prod.mjs`));
  const {default: prod} = await import(pathToFileURL(`${dir}/prod.mjs`));
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  console.log('FINISHED');
}).catch((err) => {
  console.error(err);
});
