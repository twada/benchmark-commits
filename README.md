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
- **Error Handling**: Robust error handling for both sync and async benchmarks

## Usage Examples

### Synchronous Benchmark

```javascript
import { runBenchmark } from '@twada/benchmark-commits';

// Array of git commits/tags to benchmark
const specs = ['v1.0.0', 'v1.1.0', 'main'];

runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  return syncBench(() => {
    // Synchronous operation to benchmark
    // e.g., string manipulation, calculations, etc.
    const result = someOperation();
    // Use result to avoid dead code elimination
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

runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  return asyncBench(async () => {
    // Using modern async/await syntax
    const result = await asyncOperation();
    // Process result
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

runBenchmark(specs, ({ suite, spec, dir, syncBench }) => {
  // Import the built module from the prepared directory
  const module = require(`${dir}/dist/index.js`);

  return syncBench(() => {
    module.runOperation();
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

runBenchmark(specs, ({ suite, spec, dir, asyncBench }) => {
  // `dir` points to the workdir (packages/core)
  const module = await import(`${dir}/dist/index.js`);

  return asyncBench(async () => {
    await module.performTask();
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

- **options**: `BenchmarkOptions` (optional)
  - `logger`: Custom logger object (defaults to console)

#### Returns:

- Promise that resolves with the benchmark suite after all benchmarks have completed
- Rejects if all benchmarks fail

### Type Definitions

```typescript
// Benchmark specification object
type BenchmarkSpec = {
  name: string;
  git: string;
  prepare?: string[];
  workdir?: string;
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
};
```

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
