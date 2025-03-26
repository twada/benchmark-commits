// node --experimental-strip-types run-async.mts
import { pathToFileURL } from 'url';
import { runBenchmark } from '../dist/index.mjs';
import type { BenchmarkArguments, BenchmarkTarget } from '../dist/index.mjs';
const specs: BenchmarkTarget[] = [
  {
    name: 'Regex#test',
    git: 'bench-test-1-esm',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#indexOf',
    git: 'bench-test-2-esm',
    prepare: [
      'npm install'
    ]
  },
  {
    name: 'String#match',
    git: 'bench-test-3-esm',
    prepare: [
      'npm install'
    ]
  }
];
runBenchmark(specs, async ({ suite, spec, dir }: BenchmarkArguments) => {
  // dir => /absolute/path/to/timestamp-dir/String#match/
  const {default: prod} = await import(pathToFileURL(`${dir}/test/fixtures/prod.mjs`).toString());
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  const expectedFastest = 'String#indexOf';
  const fastestNames = suite.filter('fastest').map('name');
  if(fastestNames.some((name: string) => name.includes(expectedFastest))) {
    console.log(`FINISHED suite: fastest is [${fastestNames}]`);
  } else {
    console.log(`FINISHED suite: fastest is [${fastestNames}], but expected [${expectedFastest}]`);
  }
}).catch((err) => {
  console.error(err);
});
