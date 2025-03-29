const { runBenchmark } = require('../dist/index.js');
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
runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  const prod = require(`${dir}/test/fixtures/prod`);
  return syncBench(() => {
    prod('Hello World!');
  });
}).then((suite) => {
  console.log('FINISHED');
}).catch((err) => {
  console.log('ERROR');
});
