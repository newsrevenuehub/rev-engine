# rev-engine.e2e

This repository contains tests that interact with a live version of revengine to behaviors and side effects around critical user paths through and business logic for the RevEngine platform.

We use Playwright (by way of its Python client) along with Pytest to interact with a live version of — for instance — a contribution page, going through the success case, and then confirming that expected side effects have occurred in RevEngine db and Stripe, and that expect contributor-facing emails have sent.
