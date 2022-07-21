# benchmark-commits: Run benchmark on specified git commits


### runBenchmark(specs, register): run benchmark for given `specs`. Each benchmark function is registered via `register` function
  - if all benchmark executions have finished (at least one benchmark was successful), output benchmark result then resolve with benchmark suite
  - if all benchmark executions have failed, reject with Error

  - `specs` is an array of `spec` object, which is a input of each benchmark. `spec` is either string specifying tag/branch/commit or object having `name` and `git` properties
    - internally, each item in `specs` is converted to spec object in {name, git} form
      - if `specs` is an array of string, convert each string to {name, git} form. name == git in this case.
      - if `specs` is already an array of object in {name, git} form, use them as-is.
    - name of each benchmark is generated from corresponding item in `specs`
      - description is in form of `name(commit)` if `name` is given
      - description is a value of `git` if `name` and `git` are the same
  - `register` is a benchmark registration function that returns benchmark function. benchmark registration function takes { suite, spec, dir} as arguments. benchmark function takes no arguments.
    - if `register` function runs synchronously, register benchmark function immediately
    - if `register` function is an async function or returns Promise, register benchmark function asynchronously
    - if git commit object in `specs` does not exist in underlying git repository, skip benchmark registration for that `spec`
    - if error occurred while executing registration function, skip benchmark registration for that `spec`
    - if async registration function rejects, skip benchmark registration for that `spec`
    - if benchmark registration function does not return function, skip benchmark registration for that `spec`
    - if all benchmark registrations have skipped, rejects with Error
