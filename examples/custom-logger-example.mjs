import { runBenchmark } from '../dist/index.mjs';

/**
 * Example of a custom logger implementation
 * 
 * This shows how to implement a custom logger for benchmarks
 * that can be used to capture errors and log messages.
 */
class CustomBenchmarkLogger {
  constructor (options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.errorCount = 0;
    this.errors = [];
  }

  log (message, ...optionalParams) {
    // Only log if logLevel is 'info' or higher
    if (this.logLevel === 'info' || this.logLevel === 'debug') {
      console.log(`[INFO] ${message}`, ...optionalParams);
    }
  }

  error (message, ...optionalParams) {
    // Always log errors, but also track them for later analysis
    this.errorCount++;
    
    // Store error for later analysis
    const error = optionalParams[0] instanceof Error ? optionalParams[0] : new Error(message);
    this.errors.push(error);
    
    // Log with timestamp
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} - ${message}`, ...optionalParams);
  }

  getErrorSummary () {
    return {
      count: this.errorCount,
      errors: this.errors.map(err => ({
        message: err.message,
        stack: err.stack
      }))
    };
  }
}

// Usage example
async function runWithCustomLogger () {
  // Create custom logger
  const logger = new CustomBenchmarkLogger({ logLevel: 'info' });
  
  try {
    // Run benchmark with custom logger
    const suite = await runBenchmark(
      [
        'main', // Current branch 
        'v1.0.0' // Compare with version 1.0.0
      ],
      // Register benchmark function
      ({ syncBench, spec }) => {
        // For demonstration, we'll create an error in one benchmark
        if (spec.git === 'v1.0.0') {
          return syncBench(() => {
            throw new Error('Simulated benchmark error');
          });
        }
        
        return syncBench(() => {
          // Normal benchmark operation
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        });
      },
      { logger }
    );
    
    // Output summary
    console.log('\nBenchmark complete');
    console.log(`Total errors: ${logger.errorCount}`);
    
    if (logger.errorCount > 0) {
      console.log('\nError summary:');
      console.log(JSON.stringify(logger.getErrorSummary(), null, 2));
    }
    
    return suite;
  } catch (err) {
    logger.error('Benchmark run failed', err);
    console.log('Error summary:', logger.getErrorSummary());
    throw err;
  }
}

// Run the example (uncomment to execute)
// runWithCustomLogger().catch(console.error);

export { CustomBenchmarkLogger, runWithCustomLogger };