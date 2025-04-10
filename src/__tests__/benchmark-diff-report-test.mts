import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { logComparisonResult } from '../benchmark-diff.mjs';

describe('logComparisonResult', () => {
  // Create a mock logger
  class SpyLogger {
    logCalls: string[];
    errorCalls: any[];

    constructor () {
      this.logCalls = [];
      this.errorCalls = [];
    }

    log (message?: any, ...optionalParams: any[]): void {
      this.logCalls.push(message);
    }

    error (message?: any, ...optionalParams: any[]): void {
      this.errorCalls.push(message);
    }
  }

  it('should log performance degradation that exceeds threshold', () => {
    // Arrange: Create a mock logger and a failure result
    const logger = new SpyLogger();
    const result = {
      type: 'AnalysisResult',
      pass: false,
      degradation: 10,
      baselineHz: 100,
      targetHz: 90,
      message: 'Performance degradation of 10.00% exceeds maximum allowed 5%',
      baselineName: 'Baseline benchmark',
      targetName: 'Target benchmark'
    } as const;

    // Act: Call the log function
    logComparisonResult(result, 'main', 'feature-branch', logger);

    // Assert: Check the logged messages
    assert.ok(logger.logCalls.some(msg => msg.includes('PERFORMANCE CHECK RESULTS')), 'Should include header');
    assert.ok(logger.logCalls.some(msg => msg.includes('Baseline: main')), 'Should include baseline info');
    assert.ok(logger.logCalls.some(msg => msg.includes('Target: feature-branch')), 'Should include target info');

    // Check performance metrics
    assert.ok(logger.logCalls.some(msg => msg.includes('Performance change: ❌ ▼ 10.00%')), 'Should indicate degradation');
    assert.ok(logger.logCalls.some(msg => msg.includes('Baseline: 100.00 ops/sec')), 'Should show baseline ops/sec');
    assert.ok(logger.logCalls.some(msg => msg.includes('Target:   90.00 ops/sec')), 'Should show target ops/sec');

    // Check result
    assert.ok(logger.logCalls.some(msg => msg.includes('Result: ❌ FAIL')), 'Should indicate failure');
    assert.ok(logger.logCalls.some(msg => msg.includes('Message: Performance degradation of 10.00% exceeds maximum allowed 5%')),
      'Should include detailed message');
  });

  it('should log performance improvement', () => {
    // Arrange: Create a mock logger and an improvement result
    const logger = new SpyLogger();
    const result = {
      type: 'AnalysisResult',
      pass: true,
      degradation: -10,
      baselineHz: 100,
      targetHz: 110,
      message: 'Performance improved by 10.00%',
      baselineName: 'Baseline benchmark',
      targetName: 'Target benchmark'
    } as const;

    // Act: Call the log function
    logComparisonResult(result, 'main', 'feature-branch', logger);

    // Assert: Check the logged messages
    assert.ok(logger.logCalls.some(msg => msg.includes('PERFORMANCE CHECK RESULTS')), 'Should include header');
    assert.ok(logger.logCalls.some(msg => msg.includes('Baseline: main')), 'Should include baseline info');
    assert.ok(logger.logCalls.some(msg => msg.includes('Target: feature-branch')), 'Should include target info');

    // Check performance metrics - improvement is indicated by ▲
    assert.ok(logger.logCalls.some(msg => msg.includes('Performance change: ✅ ▲ 10.00%')), 'Should indicate improvement');
    assert.ok(logger.logCalls.some(msg => msg.includes('Baseline: 100.00 ops/sec')), 'Should show baseline ops/sec');
    assert.ok(logger.logCalls.some(msg => msg.includes('Target:   110.00 ops/sec')), 'Should show target ops/sec');

    // Check result
    assert.ok(logger.logCalls.some(msg => msg.includes('Result: ✅ PASS')), 'Should indicate pass');
    assert.ok(logger.logCalls.some(msg => msg.includes('Message: Performance improved by 10.00%')),
      'Should include detailed message');
  });

  it('should log within threshold degradation', () => {
    // Arrange: Create a mock logger and a within-threshold result
    const logger = new SpyLogger();
    const result = {
      type: 'AnalysisResult',
      pass: true,
      degradation: 3,
      baselineHz: 100,
      targetHz: 97,
      message: 'Performance changed by -3.00% (within acceptable range of 5%)',
      baselineName: 'Baseline benchmark',
      targetName: 'Target benchmark'
    } as const;

    // Act: Call the log function
    logComparisonResult(result, 'main', 'feature-branch', logger);

    // Assert: Check the logged messages
    // Check performance metrics - small degradation still shows ▼ but with ✅
    assert.ok(logger.logCalls.some(msg => msg.includes('Performance change: ✅ ▼ 3.00%')),
      'Should indicate acceptable degradation');
    assert.ok(logger.logCalls.some(msg => msg.includes('Result: ✅ PASS')), 'Should indicate pass');
    assert.ok(logger.logCalls.some(msg => msg.includes('Message: Performance changed by -3.00% (within acceptable range of 5%)')),
      'Should include detailed message');
  });

  it('should handle analysis failure', () => {
    // Arrange: Create a mock logger and a failure result
    const logger = new SpyLogger();
    const result = {
      type: 'AnalysisFailure',
      message: 'No benchmarks found with prefixes "Baseline" or "Target"'
    } as const;

    // Act: Call the log function
    logComparisonResult(result, 'main', 'feature-branch', logger);

    // Assert: Check the logged messages
    assert.ok(logger.logCalls.some(msg => msg.includes('PERFORMANCE CHECK RESULTS')), 'Should include header');
    assert.ok(logger.logCalls.some(msg => msg.includes('Baseline: main')), 'Should include baseline info');
    assert.ok(logger.logCalls.some(msg => msg.includes('Target: feature-branch')), 'Should include target info');

    // Check result - should indicate failure without performance metrics
    assert.ok(logger.logCalls.some(msg => msg.includes('Result: ❌ FAIL')), 'Should indicate failure');
    assert.ok(logger.logCalls.some(msg => msg.includes('Message: No benchmarks found with prefixes "Baseline" or "Target"')),
      'Should include error message');

    // Should NOT include performance metrics
    assert.ok(!logger.logCalls.some(msg => msg.includes('Performance change:')), 'Should not include performance metrics');
  });
});
