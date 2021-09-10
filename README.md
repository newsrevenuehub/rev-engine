# Revenue Engine


## ✏️ **Develop**
To begin you should have the following applications installed on your local development system:

- Python >= 3.9
- NodeJS == 14.x
- npm == 6.14.x (comes with node 14)
- [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md) is not strictly _required_, but will almost certainly be necessary unless you just happen to have Node.js 12.x installed on your machine.
- [pip](http://www.pip-installer.org/) >= 20
- Postgres >= 12
- git >= 2.26
- [Heroku and Heroku CLI](https://devcenter.heroku.com/categories/command-line)
- Poetry == 1.1.6


### 💪 **Setup Manually**

**1. Get the project**

First clone the repository from Github and switch to the new directory:

```linux
    $ git clone git@github.com:caktus/revengine.git
    $ cd revengine
```

**2. Set up virtual environment**

Next, set up your virtual environment with python3. For example, ``revengine``.

You will note the distinct lack of opinion on how you should manage your virtual environment. This is by design.


**3. Install dependencies**

#### Install Node dependencies

``nvm`` is preferred for managing Node versions and ``.nvmrc`` contains the
specific Node version for this project. To install the correct (and latest)
Node version run:

```sh
    (revengine)$ nvm install
```

Now install the project Node packages with ``npm``:

```sh
    (revengine)$ cd spa/
    (revengine/spa)$ npm install
```

NOTE: Any javascript components that rely on config vars **CANNOT** be set dynamically from the 
heroku dashboard. A rebuild of the image and deploy is required.

#### Install Python dependencies:

NOTE: This project uses [Poetry](https://python-poetry.org/docs/#installation) for dependency management.

Unfortunately poetry doesn't deal well with dependencies would typically be in the ``deployment`` category,
so the best option in this case is to add them as a base dependency.

```shell
    (revengine)$ make setup
```

If during development you need to add a dependency run:

```shell
    (revengine)$ poetry add <NAME_OF_PACKAGE>
```

If the dependency is a dev dependency, use the following:

```shell
    (revengine)$ poetry add -D <NAME_OF_PACKAGE>
```

If you need to remove a dependency:

```shell
    (revengine)$ poetry remove <NAME_OF_PACKAGE>
```

This should automatically update the ``pyproject.toml`` file and the ``poetry.lock`` file.


**4. Pre-commit**

pre-commit is used to enforce a variety of community standards. CI runs it,
so it's useful to setup the pre-commit hook to catch any issues before pushing
to GitHub and reset your pre-commit cache to make sure that you're starting fresh.

To install, run:

```linux
    (revengine)$ pre-commit clean
    (revengine)$ pre-commit install
```

**5. Set up Stripe locally**

To test Stripe locally, you'll need to be able to log in to the Hub Stripe account.
If you want to test Stripe payments locally, add the Hub testing "Secret key", starting with `sk_test_` to the env.

```bash
  (revengine)$ echo "export TEST_HUB_STRIPE_API_SECRET_KEY=sk_test_???" >> .envrc
  (revengine)$ echo "export REACT_APP_HUB_STRIPE_API_PUB_KEY=pk_test_???" >> .envrc
  (revengine)$ echo "export STRIPE_WEBHOOK_SECRET=whsec_???" >> .envrc
```

TEST_HUB_STRIPE_API_SECRET_KEY and REACT_APP_HUB_STRIPE_API_PUB_KEY are the Secret Key and Publishable Key for the NRH Stripe Account.

You'll also need a "Connected" account to test with. CaktusGroup has an account for Caktus members, credentials for which can be found in LastPass under "NRH Stripe Test Account".

Then, in Django-admin, create an Organization for that connected stripe account and add your Stripe Account ID to the stripe_account_id field. Make sure that default_payment_provider is "stripe". The Stripe Account ID can be found in the stripe dashboard, settings --> Business Settings --> Your Business --> Account details, in the top right corner.

To set up Stripe Webhooks locally, it's a bit of fuss.
First, download NGROK and expose whichever port your running the server on. Something like:

```bash
  (revengine)$ ./ngrok http 8000
```

Next, copy the url its exposing your port through (example:http://610d1234567.ngrok.io) and add `SITE_URL = "http://610d1234567.ngrok.io"`, as well as adding `610d1234567.ngrok.io` to ALLOWED_HOSTS.

Then, run `./manage.py create_stripe_webhooks`. This will use the Stripe sdk to add WebhookEndpoints to NRH Stripe account.
For the STRIPE_WEBHOOK_SECRET, you'll then need access to the Hub Stripe Dashboard. Go to Developers --> Webhooks --> [your newly added endpoint] --> "Signing secret"

**6. Set up subdomain in /etc/hosts for local development**
The front end for this app routes donation pages based on subdomain.
Requests for a donation page with the slug `page-slug` for the revenue program with slug `revenueprogram`
will be made to `revenueprogram.revengine-testabc123.com/page-slug`. (The second-level domain is arbitrary in this case).
For that reason, to view donation pages locally, you'll need to make an entry to your /etc/hosts file like so:

```shell
127.0.0.1 revengine-testabc123.com
127.0.0.1 slug-for-the-rev-program-you-want-to-test.revengine-testabc123.com
```

In order to run the donation-page.spec and the page-view-analytics.spec cypress tests locally, also add exactly the following:

```shell
127.0.0.1 revenueprogram.revengine-testabc123.com
```

NOTE: Running tests locally like this also depends on your frontend being served at port 3000. (This is the default configuration for both `npm run start` and `make run-dev`)

**7. Set up local env variables**

This project utilizes the [direnv](https://direnv.net/) shell extension to manage project level developer environment
variables. Direnv is installed system wide so you may already have it. If not, [follow the instructions here](https://direnv.net/docs/installation.html)
for your system.

Next copy the ``local.example.py`` file to ``local.py`` and create your ``.envrc `` in the project root.

```shell
    (revengine)$ cp revengine/settings/local.example.py revengine/settings/local.py
    (revengine)$ touch .envrc
```

Then add to the file the following line.

```bash
    (revengine)$ echo "export DJANGO_SETTINGS_MODULE=revengine.settings.local" >> .envrc
```

Allow direnv to inject the variable into your environment

```shell
    (revengine)$ direnv allow .
```


**8. Database**

The setup for local development assumes that you will be working with dockerized
services.

Assuming you are using `direnv` add the following line to your `.envrc` file:

```sh
(revengine)$ echo "export DATABASE_URL=postgres://postgres@127.0.0.1:54000/revengine" >> .envrc
```

If you want to connect to the database from your host machine, export the
following shell environment variables or add them to your `.envrc` file:

```sh
    export PGHOST=127.0.0.1
    export PGPORT=54000
    export PGUSER=postgres
    export PGDATABASE=revengine
```


**9. Migrate and create a superuser**

```linux
    (revengine)$ docker-compose up -d
    (revengine)$ python manage.py migrate
    (revengine)$ python manage.py createsuperuser
```

**10. Run the server and start the SPA**

```linux
    (revengine)$ docker-compose up -d
    (revengine)$ make run-dev
```

The react app will be available at `https://localhost:3000/`, and the django admin will be available at `http://localhost:8000/admin/`


**11. Access the server**

The Django admin is at `/admin/`.


**12. Test Email Setup**
To test production email settings `export TEST_EMAIL=True`, otherwise emails will use the console backend.

**13. Run tests**

revengine uses pytest as a test runner.


```sh
    (revengine)$ make run-tests
```

**14. Reset Media and Database**

**Media Reset**

```TBD```

**Database Management**

### Check to see if databases have been created.

```shell
(revengine)$> heroku pg:backups
      
=== Backups
ID    Created at                 Status                               Size     Database
────  ─────────────────────────  ───────────────────────────────────  ───────  ────────
b001  2021-04-21 14:50:20 +0000  Completed 2021-04-21 14:50:22 +0000  66.75KB  DATABASE

=== Restores
No restores found. Use heroku pg:backups:restore to restore a backup

=== Copies
No copies found. Use heroku pg:copy to copy a database to another

```

### Download latest backup

```shell
(revengine)$> heroku pg:backups:download

Getting backup from ⬢ rev-engine-test... done, #1
Downloading latest.dump.1... ████████████████████████▏  100% 00:00 66.75KB
```

### Download a specific backup

```shell
(revengine)$> heroku pg:backups:download --app rev-engine-test b001
```

### Restore backup

NOTE: The `pg_restore` command assumes that you can run `$psql` and get a prompt for your
local database.

```shell
(revengine)$> heroku pg:backups:download --app rev-engine-test b001
(revengine)$> pg_restore --verbose --clean --no-acl --no-owner -d revengine latest.dump
```

##**15. Notes on Development conventions**
#### 1. Logging

This application makes use of the `WARNING` logging level a bit more than other projects.

The three main logging levels are:

* INFO 
  * Logs to console only
* ERROR 
  * Logs to console, reports to sentry, sends an admin email
* WARNING
  * Logs to console, sends an admin email

Instead of the usual `logger = logging.getLogger(__name__)` use `logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__})`


## Heroku Cheatsheat

#### List running apps

Lists the apps running on the connected account.

NOTE: On this project, PRs will spawn apps that can be independently tested.  Each PR app has a clean database and a single user: `qatester@example.com` with password `qatester`.

```shell
(revengine)$> heroku apps

=== Collaborated Apps
rev-engine-nrh-45-infra-dfoxmw  daniel@fundjournalism.org
rev-engine-test                 daniel@fundjournalism.org

```

#### Open a shell on an app

```shell
(revengine)$>  inv image.shell -n rev-engine-nrh-45-infra-dfoxmw

Running bash on ⬢ rev-engine-nrh-45-infra-dfoxmw... up, run.2125 (Hobby)
Running docker-entrypoint.sh
bash-5.0$ 
```


## Celery Tasks
If you have a need to run or test tasks using a celery worker, there are now some Make commands to help out.

`make run-redis` brings up the dev services, and a redis container that listens on the default port.

`make run-celery` will bring up a celery worker. At this point any task that expects a celery worker should run 
without error.


## Frontend Configuration
The following environment variables are available for configuration:

_Frontend configuration is not enabled until we can get environment variables to apply properly_

~~`REACT_APP_CAPTURE_PAGE_SCREENSHOT`~~

~~If 'true', saving edits to a donation page will also capture a "screenshot" and save it. This is used as a thumbnail in the Donation Page List view.~~

~~`REACT_APP_SALESFORCE_CAMPAIGN_ID_QUERYPARAM`~~

~~Defaults to 'campaign'. This is the string that we expect to see in urls containing Salesforce Campaign IDs. eg. `?campiagn=my-salesforce-campaign-id`~~


## Git tags

This project has cypress tests, which are great, but they can take a long time to run. Sometimes they 
are not necessary. 

So, if you are working on a branch that does not need cypress tests, you will need to name your branch with the
following text in it somewhere: `skipcy`

```shell
(revengine)$> git checkout -b NRH-2837438--new-component-with-tests-skipcy
```

Any branch that does not have the text `skipcy` present will run cypress tests this includes `develop` and `main`.