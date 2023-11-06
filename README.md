# Revenue Engine <!-- omit in toc -->

[![NRE](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/simple/68ek4u&style=flat&logo=cypress)](https://dashboard.cypress.io/projects/68ek4u/runs)

- [Development environment setup](#development-environment-setup)
  - [1. Get the project](#1-get-the-project)
  - [2. Set up virtual environment](#2-set-up-virtual-environment)
  - [3. Install dependencies](#3-install-dependencies)
    - [Node dependencies](#node-dependencies)
    - [Python dependencies](#python-dependencies)
      - [Initial installation](#initial-installation)
      - [How to add and remove dependencies](#how-to-add-and-remove-dependencies)
  - [4. Set up pre-commit](#4-set-up-pre-commit)
  - [5. Set up Stripe locally](#5-set-up-stripe-locally)
    - [Running Stripe webhooks locally](#running-stripe-webhooks-locally)
  - [6. Set up subdomains in `/etc/hosts`](#6-set-up-subdomains-in-etchosts)
  - [7. Set up environment variables](#7-set-up-environment-variables)
  - [8. Database setup](#8-database-setup)
  - [9. Run migrations and create a superuser](#9-run-migrations-and-create-a-superuser)
  - [10. Run the server and start the SPA](#10-run-the-server-and-start-the-spa)
  - [11. Testing email setup locally](#11-testing-email-setup-locally)
  - [12. Run Django tests](#12-run-django-tests)
  - [13. Run Jest tests](#13-run-jest-tests)
  - [14. Run Cypress tests](#14-run-cypress-tests)
    - [Cypress Gotchas](#cypress-gotchas)
  - [15. Database management](#15-database-management)
    - [Check to see if databases have been created](#check-to-see-if-databases-have-been-created)
    - [Download latest backup](#download-latest-backup)
    - [Download a specific backup](#download-a-specific-backup)
    - [Restore backup](#restore-backup)
- [Logging](#logging)
- [Heroku Cheatsheat](#heroku-cheatsheat)
  - [List running apps](#list-running-apps)
  - [Open a shell on an app](#open-a-shell-on-an-app)
- [Celery Tasks](#celery-tasks)
- [Email Template Development](#email-template-development)
- [Frontend Configuration](#frontend-configuration)
- [Django migrations](#django-migrations)
  - [No automatic migration names](#no-automatic-migration-names)
  - [Squash PR-related migrations](#squash-pr-related-migrations)
- [`django-reversion`, audit logs, and restoring deleted model instances](#django-reversion-audit-logs-and-restoring-deleted-model-instances)
  - [How to register a model](#how-to-register-a-model)
  - [How to register a view](#how-to-register-a-view)
  - [How to restore a deleted model instance.](#how-to-restore-a-deleted-model-instance)

## Development environment setup

To begin you should have the following applications installed on your local development system:

- Python >= 3.10
- NodeJS == 14.x
- npm == 6.14.x (comes with node 14)
- [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md) is not strictly _required_, but will almost certainly be necessary unless you just happen to have Node.js 12.x installed on your machine.
- [pip](http://www.pip-installer.org/) >= 20
- Postgres >= 12
- git >= 2.26
- [Heroku and Heroku CLI](https://devcenter.heroku.com/categories/command-line)
- Poetry == 1.1.6

### 1. Get the project

First clone the repository from Github and switch to the new directory:

```sh
git clone https://github.com/newsrevenuehub/rev-engine
cd rev-engine
```

### 2. Set up virtual environment

Next, set up your virtual environment with python3. For example, `revengine`.

You will note the distinct lack of opinion on how you should manage your virtual environment. This is by design.

### 3. Install dependencies

#### Node dependencies

`nvm` is preferred for managing Node versions, and `.nvmrc` contains the
specific Node version for this project. To install the correct (and latest)
Node version run:

```sh
nvm install
```

Now install the project Node packages with `npm`:

```sh
cd spa/
npm install
```

NOTE: Any javascript components that rely on config vars **CANNOT** be set dynamically from the Heroku dashboard. A rebuild of the image and deploy is required.

#### Python dependencies

NOTE: This project uses [Poetry](https://python-poetry.org/docs/#installation) for dependency management.

Unfortunately Poetry doesn't deal well with dependencies would typically be in the `deployment` category,
so the best option in this case is to add them as a base dependency.

##### Initial installation

```sh
make setup
```

##### How to add and remove dependencies

If during development you need to add a dependency run:

```sh
poetry add <NAME_OF_PACKAGE>
```

If the dependency is a dev dependency, use the following:

```sh
poetry add -D <NAME_OF_PACKAGE>
```

If you need to remove a dependency:

```sh
poetry remove <NAME_OF_PACKAGE>
```

Adding or removing dependencies will automatically update the `pyproject.toml` file and the `poetry.lock` file.

### 4. Set up pre-commit

[pre-commit](https://pre-commit.com/) is used to enforce a variety of community standards. CI runs it,
so it's useful to setup the pre-commit hook to catch any issues before pushing
to GitHub and reset your pre-commit cache to make sure that you're starting fresh.

To initially set up pre-commit for this project in your local environment, run:

```sh
pre-commit clean
pre-commit install
```

### 5. Set up Stripe locally

To test Stripe locally, you'll need to be able to log in to the Hub Stripe account.
If you want to test Stripe payments locally, add the Hub testing "Secret key", starting with `sk_test_` to the env.

Assuming you're using [direnv](https://direnv.net/) (see [setting up environment variables, below](#7-set-up-environment-variables)), do:

```sh
echo "export STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS=sk_test_???" >> .envrc
echo "export REACT_APP_HUB_STRIPE_API_PUB_KEY=pk_test_???" >> .envrc
echo "export STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS=whsec_???" >> .envrc
echo "export STRIPE_WEBHOOK_SECRET_UPGRADES=whsec_???*" >> .envrc
echo "export STRIPE_CORE_PRODUCT_ID=prod_???" >> .envrc
```

Then, in Django-admin, create an Organization for that connected stripe account and add your Stripe Account ID to the stripe_account_id field. Make sure that `default_payment_provider` is "stripe". The Stripe Account ID can be found in the stripe dashboard, settings --> Business Settings --> Your Business --> Account details, in the top right corner.

#### Running Stripe webhooks locally

To set up Stripe Webhooks locally, it's a bit of fuss.
First, download NGROK and expose whichever port your running the server on. Something like:

```sh
./ngrok http 8000
```

Next, copy the url its exposing your port through (example:http://610d1234567.ngrok.io) and add `SITE_URL = "http://610d1234567.ngrok.io"`, as well as adding `610d1234567.ngrok.io` to ALLOWED_HOSTS.

Then, run `./manage.py create_stripe_webhooks`. This will use the Stripe SDK to add WebhookEndpoints to the NRH Stripe account.
For the `STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS`, you'll then need access to the Hub Stripe Dashboard — specifically, the one called `NRH (NRE, Connect, legacy donations and client ACH)`. Go to Developers --> Webhooks --> [your newly added endpoint] --> "Signing secret"

### 6. Set up subdomains in `/etc/hosts`

The front end for this app routes contribution pages based on subdomain.

Requests for a contribution page with the slug `page-slug` for the revenue program with slug `revenueprogram`
will be made to `revenueprogram.revengine-testabc123.com/page-slug`. (The second-level domain is arbitrary in this case).
For that reason, to view contribution pages locally, you'll need to make an entry to your `/etc/hosts` file like so:

```sh
127.0.0.1 revengine-testabc123.com
127.0.0.1 slug-for-the-rev-program-you-want-to-test.revengine-testabc123.com
```

To view a contribution page locally, visit `slug-for-the-rev-program-you-want-to-test.revengine-testabc123.com:3000/<page-name>`. Note the port designation suffix.

In order to run the `donation-page.spec` and the `page-view-analytics.spec` Cypress tests locally, you'll need to add the following entry to `/etc/hosts`:

```sh
127.0.0.1 revenueprogram.revengine-testabc123.com
```

Then run your frontend separately from your backend, using `npm run start:subdomains`

NOTE: Running tests locally like this also depends on your frontend being served at port 3000. This is the default configuration for both `npm run start` and `make run-dev`.

### 7. Set up environment variables

This project utilizes the [direnv](https://direnv.net/) shell extension to manage project level developer environment variables. Direnv is installed system wide so you may already have it. If not, [follow the instructions here](https://direnv.net/docs/installation.html) for your system.

Next copy the `local.example.py` file to `local.py` and create your `.envrc ` in the project root.

```sh
cp revengine/settings/local.example.py revengine/settings/local.py
touch .envrc
```

Then add to the file the following line.

```sh
echo "export DJANGO_SETTINGS_MODULE=revengine.settings.local" >> .envrc
```

Next, we need to set up a fake test Stripe ID so that stripe functionality will work when running tests locally:

```sh
echo "export REACT_APP_HUB_STRIPE_API_PUB_KEY=pk_test_3737373" >> .envrc
```

The following environment variables will also need to be set for self-upgrade features to function in the SPA:

- `REACT_APP_STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL`: the URL to direct users to to access the customer portal.
- `REACT_APP_STRIPE_SELF_UPGRADE_PRICING_TABLE_ID`: ID of the Stripe pricing table to embed in the SPA.
- `REACT_APP_STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY`: publishable key for the pricing table set above. This is different from the public API key (`REACT_APP_HUB_STRIPE_API_PUB_KEY`).

To use a local Web browsable version of the API add `export ENABLE_API_BROWSER=True` to your `.envrc`. (Then visit /api/swagger/ or /api/redoc/.)

To allow direnv to inject the variable into your environment, do:

```sh
direnv allow .
```

### 8. Database setup

The setup for local development assumes that you will be working with Dockerized
services.

Assuming you are using `direnv`, add the following line to your `.envrc` file:

```sh
echo "export DATABASE_URL=postgres://postgres@127.0.0.1:54000/revengine" >> .envrc
```

If you want to connect to the database from your host machine, export the
following shell environment variables or add them to your `.envrc` file:

```sh
export PGHOST=127.0.0.1
export PGPORT=54000
export PGUSER=postgres
export PGDATABASE=revengine
```

### 9. Run migrations and create a superuser

```sh
docker-compose up -d
python manage.py migrate
python manage.py createsuperuser
```

### 10. Run the server and start the SPA

```sh
docker-compose up -d
make run-dev
```

The React app will be available at `https://localhost:3000/`, and the Django admin will be available at `http://localhost:8000/nrhadmin/`.

Alternately:

```sh
make run-hybrid
```

This reverses control locally. Django will serve the React app at `http://localhost:8000`, parsing template tags in the React app's HTML and enforcing CSP. If you use this task, you must set the environment variable `ENFORCE_CSP` to `false` or else the app won't load; the local app's `<script>` and `<style>` tags will not have the correct nonce attribute applied as they normally would when served in production, because they are generated by Webpack.

### 11. Testing email setup locally

To test production email settings, set `export TEST_EMAIL=True`, otherwise emails will use the console backend.

### 12. Run Django tests

revengine uses [pytest](https://docs.pytest.org/en/7.1.x/) as a test runner.
This command loads test_migrations and then runs pytest.

```sh
make run-tests
```

To pass additional arguments to pytest:

```sh
make run-tests EXTRA_PYTEST=-vvv
make run-tests EXTRA_PYTEST="-x --numprocesses=3"
```

### 13. Run Jest tests

```
cd spa
npm test
```

To get a coverage report, run `npm run test:coverage`. The report will be in `spa/coverage/lcov-report`.

### 14. Run Cypress tests

Running Cypress locally requires 2 terminals

Terminal 1:

```sh
cd spa/
npm run start:subdomains
```

Terminal 2:

```sh
cd spa/
npm run cypress:open
```

This will open the Cypress application.

Alternatively, to run Cypress tests headlessly (which is how they will run in CI), run:

```sh
cd spa/
npm run cypress:run
```

#### Cypress Gotchas

If you run Cypress while the Python dev server is also running, this will cause some Cypress tests to fail. This happens when unintercepted requests from the SPA reach the running Python server. With this in mind, be sure that the server is not running locally when you run Cypress tests.

### 15. Database management

Here is the process for populating your local development database with data from a live Heroku instance.

#### Check to see if databases have been created

```sh
heroku pg:backups

=== Backups
ID    Created at                 Status                               Size     Database
────  ─────────────────────────  ───────────────────────────────────  ───────  ────────
b001  2021-04-21 14:50:20 +0000  Completed 2021-04-21 14:50:22 +0000  66.75KB  DATABASE

=== Restores
No restores found. Use heroku pg:backups:restore to restore a backup

=== Copies
No copies found. Use heroku pg:copy to copy a database to another
```

#### Download latest backup

```sh
heroku pg:backups:download
```

#### Download a specific backup

```sh
heroku pg:backups:download --app rev-engine-test b001
```

#### Restore backup

NOTE: The Make commands below assume that you can run `psql` and get a prompt for your local database.

```sh
# assuming that you already have a local backup up
make drop-db
# the previous commands stop and remove the docker image and volume for the local db, so need to run again
docker compose up -d
# if your backup file is called something else, substitute that name
BACKUP_FILE=latest.dump make restore-db-backup
```

## Logging

This application makes use of the `WARNING` logging level a bit more than other projects.

The three main logging levels are:

- INFO: Logs to console only
- ERROR: Logs to console, reports to Sentry, sends an admin email
- WARNING: Logs to console, sends an admin email

Instead of the usual `logger = logging.getLogger(__name__)` use `logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__})`

## Heroku Cheatsheat

### List running apps

Lists the apps running on the connected account.

NOTE: On this project, PRs will spawn apps that can be independently tested.

```sh
heroku apps

=== Collaborated Apps
rev-engine-nrh-45-infra-dfoxmw  daniel@fundjournalism.org
rev-engine-test                 daniel@fundjournalism.org
```

### Open a shell on an app

```sh
inv image.shell -n rev-engine-nrh-45-infra-dfoxmw

Running bash on ⬢ rev-engine-nrh-45-infra-dfoxmw... up, run.2125 (Hobby)
Running docker-entrypoint.sh
bash-5.0$
```

## Celery Tasks

If you have a need to run or test tasks using a Celery worker, there are some Make commands to help out.

`make run-redis` brings up the dev services, and a redis container that listens on the default port.

`make start-celery` will bring up a Celery worker. At this point any task that expects a celery worker should run without error.

## Email Template Development

If `DEBUG` is set in Django settings, then the app will serve example emails under `/__debug_emails__/`. This can be useful for testing template changes.

Routes that currently exist:

- `http://localhost:8000/__debug_emails__/contribution-confirmation/?rp=3` shows
  a contribution receipt email. A revenue program ID set in the query string as
  `rp` is required. You can also override the header logo of the RP's default
  page with a `logo` query string, e.g.
  `/contribution-confirmation/?rp=3&logo=https://place-hold.it/100x100`.
- `http://localhost:8000/__debug_emails__/recurring-contribution/` shows a
  recurring contribution reminder email. It takes the same query string
  parameters as `contribution-confirmation/`, including the required `rp` one.

## Frontend Configuration

**Attention**: If the environment variable is going to be needed in deployed environments (e.g: dev, prod) don't forget to add it also in the file `revengine/settings` inside `SPA_ENV_VARS`, and also add it to the correct Heroku build.

Check `.envrc.example` for all environment variables that are needed to run locally. Note: some of them you will have to get the value from the respective resource (example: Stripe -> get secret key from stripe dashboard)

See [spa/src/appSettings.js](./spa/src/appSettings.js) for more details on how env vars are configured on the front end. For setup, certain features of the app will require certain env vars define.

First:

```sh
touch ./spa/.env
```

To enable Stripe-related features such as payments on contribution pages or changing payment methods, set:

```sh
REACT_APP_HUB_STRIPE_API_PUB_KEY=pk_test_therealvaluehere
```

You can get this value from the Hub Stripe dashboard.

To enable Stripe onboarding, set:

```sh
REACT_APP_STRIPE_CLIENT_ID=therealvalue
```

You can get this value from the Hub stripe dashboard

To enable google address autocomplete in the contribution page form, set:

```sh
REACT_APP_HUB_GOOGLE_MAPS_API_KEY=therealvalueere
```

To enable Google Analytics, set:

```sh
REACT_APP_HUB_V3_GOOGLE_ANALYTICS_ID=therealvaluehere
```

Any value in `settings.js` that uses the `resolveConstantFromEnv` method can be overridden by adding it to .env prepended by `REACT_APP_`

## Django migrations

When you're working on a new feature, we have some minimal guidelines around Django migrations that you are expected to follow.

### No automatic migration names

First, be sure to give your migrations a meaningful, non-automatic name. By default, Django will often give a name like `0003_auto_20220801_1100.py`. Let's imagine that migration removes a column ('my_column') from a model ('MyModel'). A better name would be `0003_DEV-1234_drop_my_column_from_mymodel.py`, which references the ticket name and describes at a high level what the migration does. This practice helps maintainers have a high level understanding of what a migration does simply by reading its file name. To this end, there is a Make command (`make test_migrations`) that runs as part of the Python tests in CI which prohibits automatic migration names.

### Squash PR-related migrations

We want to limit the number of individual migration files produced. As you're working on a feature branch, oftentimes you'll iteratively create numerous migrations for a given app as you run down feature implementation.

Before submitting a pull request, please [squash all the migrations](https://docs.djangoproject.com/en/4.0/topics/migrations/#migration-squashing) per app for that PR into either one or two migrations depending on whether there are both data and schema migrations. Include the ticket number in the filename for the migration, e.g. 0004_DEV-1234_contribution_flagged_date.py

## `django-reversion`, audit logs, and restoring deleted model instances

This project uses [django-reversion](https://django-reversion.readthedocs.io/en/stable/index.html) to record user-generated changes to select models from the admin and via the API layer. This same package allows admin users to recover deleted model instances.

### How to register a model

To register a model with `django-reversion`, include `reversion.admin.VersionAdmin` in the modeladmin class definition.

```python
@admin.register(models.MyModel)
class MyModelAdmin(VersionAdmin):
...
```

Note that by registering a model's model admin class with `django-reversion`, the underlying model is also registered. When configured this way, any changes made to instances of `MyModel` through the Django admin interface will get per-save revisions recorded.

After registering a model, you will need to run the following management command:

```sh
python manage.py createinitialrevisions
```

### How to register a view

We use `reversion.views.RevisionMixin` in select API-layer viewsets in order to record changes to the model instances that happen via that view. To set up a view to record changes, do:

```python
class MyViewSet(RevisionMixin, ...<other super classes and mixins>):
```

Note that this assumes the viewset's model has been registered with `django-reversion`.

By default, django-reversion will not follow model relationships. For instance, if you have ModelA and ModelB, where ModelB.model_a is a nullable foreign key, if you delete ModelA and later restore it, ModelB's reference to a ModelA instance will not be restored unless ModelA has been configured to follow the relationship to ModelB. You can find a concrete example of this in `apps.pages.admin.DonationPageAdmin.reversion_register` where we configure the DonationPage model to follow contribution and revenue program relations.

### How to restore a deleted model instance.

For a model/model admin that is registered with `django-reversion`, you can recover a deleted instance from the Django admin.

After deleting the instance, if you go to its model admin's list view, you can click on the `Recover Deleted <ModelName>s` button.
