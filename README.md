benchmark-commits
================================

A powerful tool for running and comparing benchmarks across multiple git commits, tags, or branches. Designed for performance analysis, regression testing, and optimization workflows.

[![Build Status][ci-image]][ci-url]
[![NPM version][npm-image]][npm-url]
[![Code Style][style-image]][style-url]
[![License][license-image]][license-url]
![Supported Node Version](https://img.shields.io/node/v/%40twada%2Fbenchmark-commits)

## Overview

`benchmark-commits` allows you to:

- Run the same benchmark against multiple versions of your codebase
- Compare performance across git commits, tags, or branches
- Support for both synchronous and asynchronous benchmark functions
- Automatic git checkout, installation, and preparation
- Detailed performance reporting

Perfect for:
- Finding performance regressions between versions
- Validating optimizations in new code
- Comparing algorithm implementations across branches
- Creating performance baselines

## Installation

```sh
npm install @twada/benchmark-commits
```

## Key Features

- **Git Integration**: Seamlessly work with git repositories to benchmark different versions
- **Promise Support**: First-class support for async/await and Promise-based benchmarks
- **Flexible Configuration**: Customize preparation steps for each commit/version
- **Monorepo Support**: Specify workdir to benchmark subprojects in monorepos
- **Enhanced Error Handling**: Comprehensive error logging with customizable logger implementations
- **Optimization Prevention**: Blackhole feature to prevent JIT compiler optimizations from affecting benchmark results
- **Performance Validation**: Compare current branch against a baseline with configurable thresholds for CI/CD
- **Custom Logging**: Implement custom error and event logging for better debugging and analysis

## Usage Examples

### Performance Comparison with Baseline

```javascript
import { benchmarkDiffWithBaseline } from '@twada/benchmark-commits';

// Minimal configuration for comparing current branch with main
const baseline = {
  git: 'main',                          // Baseline branch to compare against
  prepare: ['npm install', 'npm run build'], // Optional preparation commands
  workdir: 'packages/core'              // Optional working directory
};

// Auto-detects current branch and validates performance
benchmarkDiffWithBaseline(baseline, ({ suite, spec, dir, syncBench, blackhole }) => {
  return syncBench(() => {
    // Your benchmark code here
    const result = someOperation();
    blackhole(result);
  });
}, {
  maxDegradation: 5,  // Fail if current branch is more than 5% slower
  exitOnFail: true,   // Exit process with error code on failure (good for CI)
  exitCode: 1         // Optional custom exit code
});
```

### Synchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

// Array of git commits/tags to benchmark
const specs = ['v1.0.0', 'v1.1.0', 'main'];

runBenchmark(specs, ({ suite, spec, dir, syncBench, blackhole }) => {
  return syncBench(() => {
    // Synchronous operation to benchmark
    // e.g., string manipulation, calculations, etc.
    const result = someOperation();
    // Use blackhole to prevent dead code elimination
    blackhole(result);
  });
});
```

### Asynchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

// With additional configuration
const specs = [
  { name: 'Current', git: 'main' },
  { name: 'Optimized', git: 'feature/optimization' }
];

runBenchmark(specs, ({ suite, spec, dir, asyncBench, blackhole }) => {
  return asyncBench(async () => {
    // Using modern async/await syntax
    const result = await asyncOperation();
    // Prevent JIT optimization of the result
    blackhole(result);
    // Errors are automatically handled
  });
});
```

### Custom Preparation Steps

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

const specs = [
  {
    name: 'Production',
    git: 'main',
    prepare: ['npm install', 'npm run build']
  },
  {
    name: 'Development',
    git: 'develop',
    prepare: ['npm install', 'npm run build:dev']
  }
];

runBenchmark(specs, ({ suite, spec, dir, syncBench, blackhole }) => {
  // Import the built module from the prepared directory
  const module = require(`${dir}/dist/index.js`);

  return syncBench(() => {
    const result = module.runOperation();
    blackhole(result);
  });
});
```

### Working with Monorepos

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

const specs = [
  {
    name: 'Current',
    git: 'main',
    workdir: 'packages/core' // Specify the subproject directory
  },
  {
    name: 'Experimental',
    git: 'feature/new-algorithm',
    workdir: 'packages/core'
  }
];

runBenchmark(specs, ({ suite, spec, dir, asyncBench, blackhole }) => {
  // `dir` points to the workdir (packages/core)
  const module = await import(`${dir}/dist/index.js`);

  return asyncBench(async () => {
    const result = await module.performTask();
    blackhole(result);
  });
});
```

## API Reference

### `runBenchmark(commitsOrSpecs, register, options?): Promise<Benchmark.Suite>`

Runs benchmarks for the given git commits or specs, using the provided register function to create the benchmark tests.

#### Parameters:

- **commitsOrSpecs**: `Array<string | BenchmarkSpec>`
  - Array of git commits/tags (strings) or configuration objects
  - Each configuration object can have:
    - `name`: Name to identify the benchmark in results
    - `git`: Git reference (commit SHA, tag, or branch name)
    - `prepare`: Array of shell commands to run for preparation (defaults to `['npm install']`)
    - `workdir`: Optional subdirectory to use as working directory (for monorepos)

- **register**: `(args: BenchmarkArguments) => BenchmarkRegistration | Promise<BenchmarkRegistration>`
  - Function that configures and returns a benchmark
  - Receives an object with:
    - `suite`: The benchmark suite instance
    - `spec`: The normalized benchmark specification
    - `dir`: The directory path to the prepared git checkout (concatenated with `workdir` if exists)
    - `syncBench`: Function to register a synchronous benchmark
    - `asyncBench`: Function to register an asynchronous benchmark
    - `blackhole`: Function to prevent JIT optimization

- **options**: `BenchmarkOptions` (optional)
  - `logger`: Custom logger object (defaults to console) that implements the `BenchmarkLogger` interface

#### Returns:

- Promise that resolves with the benchmark suite after all benchmarks have completed
- Rejects if all benchmarks fail

### benchmarkDiffWithBaseline(baseline, register, options?): Promise<{suite, result}>

Runs a performance comparison between the current branch (or specified target branch) and a baseline branch, with automatic performance threshold validation.

#### Parameters:

- **baseline**: `BaselineSpec`
  - Configuration for the baseline branch to compare against
  - Properties:
    - `git`: Git reference for the baseline (commit, tag, or branch name)
    - `prepare?`: Optional array of shell commands to run for preparation
    - `workdir?`: Optional subdirectory to use as working directory

- **register**: `(args: BenchmarkArguments) => BenchmarkRegistration | Promise<BenchmarkRegistration>`
  - Function that configures and returns a benchmark
  - Receives the same arguments as `runBenchmark`

- **options**: `ComparisonOptions` (optional)
  - `maxDegradation?`: Maximum allowed performance degradation in percent (default: 5%)
  - `exitOnFail?`: Whether to exit the process on failure (default: true)
  - `exitCode?`: Exit code to use on failure (default: 1)
  - `targetBranch?`: Manual target branch if auto-detection fails
  - `logger?`: Custom logger object (defaults to console)

#### Returns:

- Promise that resolves with an object containing:
  - `suite`: The benchmark suite after completion
  - `result`: Analysis result with performance metrics and pass/fail status

### Type Definitions

```typescript
// Benchmark logger interface for custom implementations
type BenchmarkLogger = {
  log(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
};

// Benchmark specification object
type BenchmarkSpec = {
  name: string;
  git: string;
  prepare?: string[];
  workdir?: string;
};

// Baseline specification for performance comparison
type BaselineSpec = {
  git: string;          // Baseline git reference (commit, tag, branch)
  prepare?: string[];   // Optional preparation commands
  workdir?: string;     // Optional working directory
};

// Options for performance comparison
type ComparisonOptions = {
  maxDegradation?: number;  // Maximum allowed performance degradation (%)
  exitOnFail?: boolean;     // Exit process on failure
  exitCode?: number;        // Exit code to use on failure
  targetBranch?: string;    // Optional manual target branch
  logger?: BenchmarkLogger; // Optional custom logger
};

// Result of performance analysis
type AnalysisResult = {
  type: 'AnalysisResult';
  pass: boolean;        // Whether the performance check passed
  message: string;      // Human-readable result message
  degradation: number;  // Performance degradation percentage
  baselineHz: number;   // Operations per second for baseline
  targetHz: number;     // Operations per second for target
  baselineName: string; // Name of baseline benchmark
  targetName: string;   // Name of target benchmark
};

// Benchmark registration functions
type SyncBenchmarkFunction = () => void;
type AsyncBenchmarkFunction = () => Promise<void>;

// Benchmark registration return types
type SyncBenchmarkRegistration = { async: false; fn: SyncBenchmarkFunction };
type AsyncBenchmarkRegistration = { async: true; fn: AsyncBenchmarkFunction };
type BenchmarkRegistration = SyncBenchmarkRegistration | AsyncBenchmarkRegistration;

// Arguments passed to the register function
type BenchmarkArguments = {
  suite: Benchmark.Suite;
  spec: NormalizedBenchmarkSpec;
  dir: string;
  syncBench: (fn: SyncBenchmarkFunction) => SyncBenchmarkRegistration;
  asyncBench: (fn: AsyncBenchmarkFunction) => AsyncBenchmarkRegistration;
  blackhole: (value: any) => void; // Function to prevent JIT optimization
};
```

### Preventing JIT Optimization with the Blackhole Function

When benchmarking code, JavaScript's JIT compiler may optimize away calculations whose results are not used, leading to artificially fast benchmarks that don't reflect real-world performance. The `blackhole` function prevents this by consuming the result values in a way that the JIT compiler can't predict, ensuring that:

1. All calculations are actually performed during benchmarking
2. Results are accurately measured without being affected by dead code elimination
3. Benchmark code remains clean and readable

Example usage:

```javascript
runBenchmark(specs, ({ syncBench, blackhole }) => {
  return syncBench(() => {
    // Without blackhole, this calculation might be optimized away
    const result = expensiveCalculation();
    
    // Use blackhole to ensure the calculation is performed
    blackhole(result);
  });
});
```

The `blackhole` function is implemented to have minimal overhead while reliably preventing optimization.

### Custom Error Logging with BenchmarkLogger

You can implement custom error logging by providing a logger object that implements the `BenchmarkLogger` interface:

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

// Create a custom logger
class CustomLogger {
  constructor() {
    this.errors = [];
  }

  log(message, ...params) {
    console.log(`[LOG] ${message}`, ...params);
  }

  error(message, ...params) {
    // Capture the error for later analysis
    this.errors.push({
      message,
      error: params[0] instanceof Error ? params[0] : null,
      timestamp: new Date().toISOString()
    });
    // Still log to console
    console.error(`[ERROR] ${message}`, ...params);
  }

  // Custom method for error analysis
  getErrorSummary() {
    return {
      count: this.errors.length,
      errors: this.errors
    };
  }
}

// Use the custom logger
const logger = new CustomLogger();

runBenchmark(specs, ({ asyncBench }) => {
  return asyncBench(async () => {
    // Benchmark code...
  });
}, { logger });

// After benchmarks complete, you can analyze errors
console.log(`Total errors: ${logger.errors.length}`);
if (logger.errors.length > 0) {
  console.log(logger.getErrorSummary());
}
```

This is particularly useful for:
- Capturing and analyzing benchmark errors across multiple runs
- Centralized error handling for CI/CD pipelines
- Creating custom error reports with additional context
- Error-based alerting or notifications

## Internal Architecture

The tool works in several phases:

1. **Initialization**: Create a temporary working directory
2. **Git Checkout**: Extract each commit/tag to its own directory
3. **Preparation**: Run preparation commands (e.g., npm install)
4. **Registration**: Register each benchmark function
5. **Execution**: Run all benchmarks
6. **Reporting**: Display results and identify the fastest implementation
7. **Cleanup**: Remove the temporary directories

Key components:
- **SuiteSetup**: Manages the setup and preparation of benchmarks
- **BenchmarkRegistration**: Handles the registration of benchmark functions
- **Event System**: Provides detailed progress and error reporting
- **Performance Analysis**: Analyzes benchmark results and validates against thresholds
- **Reporting**: Generates formatted performance comparison reports

## Requirements

- Node.js >= 22.12.0
- Git (accessible from the command line)

## License

Licensed under the [MIT](https://twada.mit-license.org) license.

## Author

* [Takuto Wada](https://github.com/twada)

[ci-image]: https://github.com/twada/benchmark-commits/workflows/Node.js%20CI/badge.svg
[ci-url]: https://github.com/twada/benchmark-commits/actions?query=workflow%3A%22Node.js+CI%22

[npm-url]: https://npmjs.org/package/@twada/benchmark-commits
[npm-image]: https://badge.fury.io/js/%40twada%2Fbenchmark-commits.svg

[style-url]: https://github.com/neostandard/neostandard
[style-image]: https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat

[license-url]: https://twada.mit-license.org
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg
