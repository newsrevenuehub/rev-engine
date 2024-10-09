1. Release phase conditionally triggers e2e checks if initial deploy has run
2. Post deploy (after first release, and only at that time) sets env var indicating initial deploy has happened so subsequent release phases can trigger e2e. Triggers e2e. In both cases, we call the django management command for e2e tests
3. Management command for triggering e2e tests:
   - always takes a test name
   - optionally takes:
     - a commit sha
     - a report results flag
     - a flag to run async or not
   - Calls task to do a set of e2e runs.
     - Results in a revengine commit status per run, and if so configured, a corresponding GH commit status
     - When creating a GH commit status, we provide a screenshot of latest app state at the time of the test run, and a link to a detail page that will be accessible from the PR review in GH. This page will provide further detail on what happened.

Next step:

- Implement the test runner
  - needs to load the single registered module from the pointed to file, or else error
  - run the task that will run the tests
  - return outcome of the tests
