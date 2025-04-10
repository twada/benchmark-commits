import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import Benchmark from 'benchmark';
import { analyzePerformanceResults } from '../benchmark-diff.mjs';

describe('analyzePerformanceResults', () => {
  // Helper function is intentionally commented out as it's not used directly,
  // but kept for reference or future use
  /*
  function createMockBenchmark (name: string, hz: number): Benchmark {
    const bench = new Benchmark(name, () => {});
    // Cast to any to set the hz property which is normally read-only after completion
    (bench as any).hz = hz;
    return bench;
  }
  */

  // Helper to create a suite with baseline and target benchmarks
  function createMockSuite (baselineHz: number, targetHz: number, baselinePrefix = 'Baseline', targetPrefix = 'Target'): Benchmark.Suite {
    const suite = new Benchmark.Suite();
    suite.add(`${baselinePrefix} benchmark`, () => {});
    suite.add(`${targetPrefix} benchmark`, () => {});
    // Manually set the hz values since we can't run the benchmarks in tests
    const benchmarks = Array.from(suite as any) as Benchmark[];
    (benchmarks[0] as any).hz = baselineHz;
    (benchmarks[1] as any).hz = targetHz;
    return suite;
  }

  it('should detect performance degradation that exceeds threshold', () => {
    // Create a suite where target is 10% slower than baseline (degradation)
    const suite = createMockSuite(100, 90);

    // Set maxDegradation to 5%, which should cause a failure
    const result = analyzePerformanceResults(suite, { maxDegradation: 5 });

    assert.equal(result.type, 'AnalysisResult');
    if (result.type === 'AnalysisResult') {
      assert.equal(result.pass, false, 'Should fail when degradation exceeds threshold');
      assert.equal(result.baselineHz, 100);
      assert.equal(result.targetHz, 90);
      assert.equal(result.degradation, 10);
      assert.match(result.message, /degradation.*exceeds maximum/i);
    }
  });

  it('should pass when performance degradation is within threshold', () => {
    // Create a suite where target is 3% slower (within the default 5% threshold)
    const suite = createMockSuite(100, 97);

    const result = analyzePerformanceResults(suite);

    assert.equal(result.type, 'AnalysisResult');
    if (result.type === 'AnalysisResult') {
      assert.equal(result.pass, true, 'Should pass when degradation is within threshold');
      assert.equal(result.baselineHz, 100);
      assert.equal(result.targetHz, 97);
      assert.equal(result.degradation, 3);
      assert.match(result.message, /within acceptable range/i);
    }
  });

  it('should detect performance improvement', () => {
    // Create a suite where target is faster than baseline (improvement)
    const suite = createMockSuite(100, 110);

    const result = analyzePerformanceResults(suite);

    assert.equal(result.type, 'AnalysisResult');
    if (result.type === 'AnalysisResult') {
      assert.equal(result.pass, true, 'Should pass when performance improves');
      assert.equal(result.baselineHz, 100);
      assert.equal(result.targetHz, 110);
      assert.equal(result.degradation, -10); // Negative degradation = improvement
      assert.match(result.message, /improved by 10/i);
    }
  });

  it('should handle missing benchmarks', () => {
    // Create a suite with only one benchmark
    const suite = new Benchmark.Suite();
    suite.add('Baseline benchmark', () => {});

    const result = analyzePerformanceResults(suite);

    assert.equal(result.type, 'AnalysisFailure');
    if (result.type === 'AnalysisFailure') {
      assert.match(result.message, /No benchmarks found/i);
    }
  });

  it('should handle custom benchmark name prefixes', () => {
    // Create a suite with custom prefixes
    const suite = createMockSuite(100, 90, 'Main', 'Feature');

    const result = analyzePerformanceResults(suite, {
      baselinePrefix: 'Main',
      targetPrefix: 'Feature',
      maxDegradation: 15 // Set higher than the 10% degradation
    });

    assert.equal(result.type, 'AnalysisResult');
    if (result.type === 'AnalysisResult') {
      assert.equal(result.pass, true, 'Should pass when using custom prefixes');
      assert.equal(result.baselineHz, 100);
      assert.equal(result.targetHz, 90);
      assert.equal(result.degradation, 10);
      assert.match(result.baselineName, /Main/i);
      assert.match(result.targetName, /Feature/i);
    }
  });
});
