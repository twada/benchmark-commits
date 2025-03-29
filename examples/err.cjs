const { runBenchmark } = require('../dist/index.js');
const specs = [
  'nonexistent1',
  'nonexistent2'
];
runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  const prod = require(`${dir}/test/fixtures/prod`);
  return syncBench(() => {
    prod('Hello World!');
  });
}).catch((err) => {
  console.log('FINISHED WITH ERROR');
  // console.error(err);
});
