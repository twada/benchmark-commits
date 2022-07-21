const { runBenchmark } = require('..');
const specs = [
  {
    name: 'Regex#test',
    git: 'bench-test-1'
  },
  {
    name: 'String#indexOf',
    git: 'bench-test-2'
  },
  {
    name: 'String#match',
    git: 'bench-test-3'
  }
];
runBenchmark(specs, async ({ suite, spec, dir }) => {
  const prod = require(`${dir}/test/fixtures/prod`);
  return () => {
    prod('Hello World!');
  };
}).then((suite) => {
  console.log('FINISHED');
});
