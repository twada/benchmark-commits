// node --experimental-strip-types run-async.mts
import { pathToFileURL } from 'url';
import { runBenchmark } from '../dist/index.mjs';
import type { BenchmarkArguments, BenchmarkTarget } from '../dist/index.mjs';
const specs: BenchmarkTarget[] = [
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
runBenchmark(specs, async ({ suite, spec, dir }: BenchmarkArguments) => {
  // dir => /absolute/path/to/timestamp-dir/String#match/test/fixtures
  const {default: prod} = await import(pathToFileURL(`${dir}/prod.mjs`).toString());
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  console.log('FINISHED');
}).catch((err) => {
  console.error(err);
});
