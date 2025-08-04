# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run rebuild` - Full rebuild (lint + clean + compile + test:dist)
- `npm run test` - Run linting, type checking and unit tests (primary test command)
- `npm run test:unit` - Run unit tests with experimental type stripping
- `npm run test:dist` - Run tests on compiled distribution files
- `npm run lint` - Lint source code with eslint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - Type check without emitting files
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run clean` - Remove dist directory

### Example Commands
- `npm run example` - Run example with experimental type stripping

## Architecture Overview

This is a Node.js library that enables running benchmarks across multiple git commits, tags, or branches. The project is built with TypeScript and follows these architectural patterns:

### Core Modules
- **`src/index.mts`** - Main entry point, exports primary functions and types
- **`src/run-benchmark.mts`** - Core benchmark running functionality
- **`src/benchmark-diff.mts`** - Performance comparison with baseline functionality
- **`src/suite-setup.mts`** - Benchmark suite configuration and setup logic

### Key Features
- Git integration for checking out different versions
- Both sync and async benchmark support
- Monorepo support via `workdir` configuration
- JIT optimization prevention via blackhole function
- Custom logging support
- Performance threshold validation

### File Structure
- Source files use `.mts` extension (TypeScript modules)
- Tests are in `src/__tests__/` directory
- Examples are in `examples/` directory
- Compiled output goes to `dist/`
- ADR (Architecture Decision Records) in `docs/`

### Testing Strategy
- Unit tests run directly on TypeScript source using `--experimental-strip-types`
- Distribution tests run on compiled JavaScript in `dist/`
- Both testing approaches ensure correctness at source and build levels

### Build System
- Uses TypeScript compiler (`tsc`) for compilation
- ESLint with neostandard for code style
- Rimraf for cleaning build artifacts
- ES modules (`"type": "module"`) throughout

### Dependencies
- `benchmark` - Core benchmarking functionality
- `extract-git-treeish` - Git checkout operations
- Minimal runtime dependencies for focused scope

## Development Rules

- Git commit rules must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- Versioning rules must follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- CHANGELOG description rules must follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Development process must follow "t-wada's TDD workflow"
- Always run `npm run lint` after changing code
- Run tests `npm test` frequently
- Small, frequent commits are strongly recommended. Follow Git commit rules and commit by type
- If type errors are difficult to resolve, stop work and consult before using `any` type

## Important Notes

- Node.js >= 22.12.0 required
- Uses experimental type stripping for direct TypeScript execution
- Git must be available on the command line
- The library is designed for performance regression testing and optimization workflows
