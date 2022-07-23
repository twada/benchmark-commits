const { runBenchmark } = require('../dist/index.cjs');
const specs = [
  'nonexistent1',
  'nonexistent2'
];
runBenchmark(specs, ({ suite, spec, dir }) => {
  const prod = require(`${dir}/test/fixtures/prod`);
  return () => {
    prod('Hello World!');
  };
}).catch((err) => {
  console.log('FINISHED WITH ERROR');
  // console.error(err);
});
