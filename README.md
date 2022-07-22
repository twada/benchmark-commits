# benchmark-commits: Run benchmark on specified git commits


### runBenchmark(commitsOrSpecs, register): run benchmark for given `commitsOrSpecs`. Each benchmark function is registered via `register` function
  - if all benchmark executions have finished (at least one benchmark was successful), output benchmark result then resolve with benchmark suite
  - if all benchmark executions have failed, reject with Error

  - `commitsOrSpecs` is an array of either (1) string specifying git tag/branch/commit or (2) object having `name` and `git` properties, pointing to git object to be checked out for the benchmark
    - internally, each item in `commitsOrSpecs` is normalized to `spec` object in {name, git} form
      - if `commitsOrSpecs` is an array of string specifying git tag/branch/commit
        - converts each string to {name, git} form. name === git in this case.
        - use git object name as benchmark name
      - if `commitsOrSpecs` is already an array of `spec` object having {name, git} form
        - use them as `spec` object
        - generated benchmark name is `name(git)`
  - `register` is a benchmark registration function that returns benchmark function. benchmark registration function takes { suite, spec, dir} as arguments. benchmark function takes no arguments.
    - if `register` function runs synchronously, register benchmark function immediately
    - if `register` function is an async function or returns Promise, register benchmark function asynchronously
    - if git commit object in `commitsOrSpecs` does not exist in underlying git repository, skip benchmark registration for that `spec`
    - if error occurred while executing registration function, skip benchmark registration for that `spec`
    - if async registration function rejects, skip benchmark registration for that `spec`
    - if benchmark registration function does not return function, skip benchmark registration for that `spec`
    - if all benchmark registrations have skipped, rejects with Error
