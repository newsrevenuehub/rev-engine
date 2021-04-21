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

``nvm`` is preferred for managing Node versions and ``.nvmrc`` contains the
specific Node version for this project. To install the correct (and latest)
Node version run:

```sh
    (revengine)$ nvm install
```

Now install the project Node packages with ``npm``:

```sh
    (revengine)$ npm install
```

Install Python dependencies with:

```linux
    (revengine)$ make setup
```

NOTE: This project uses ``pip-tools``. If the dependency `.txt` files need to be
updated:

```sh
    (revengine)$ make update_requirements setup
```

NOTE 2: During a development cycle if a developer needs to add subtract or modify the requirements of the project, the
workflow is to:

1) Make the change in the ``*.in`` requirement file
2) run ``make update_requirements``
3) commit both ``*.in`` file(s) and the ``*.txt`` file(s) generated


**4. Pre-commit**

pre-commit is used to enforce a variety of community standards. CI runs it,
so it's useful to setup the pre-commit hook to catch any issues before pushing
to GitHub and reset your pre-commit cache to make sure that you're starting fresh.

To install, run:

```linux
    (revengine)$ pre-commit clean
    (revengine)$ pre-commit install
```


**5. Set up local env variables**

Next, we'll set up our local environment variables. We use
[django-dotenv](https://github.com/jpadilla/django-dotenv) to automatically read
environment variables located in a file named `.env` in the top level directory of the
project (but you may use any other way of setting environment variables, like direnv or
manually setting them). The only variable we need to start is `DJANGO_SETTINGS_MODULE`:

```linux
    (revengine)$ cp revengine/settings/local.example.py revengine/settings/local.py
    (revengine)$ echo "DJANGO_SETTINGS_MODULE=revengine.settings.local" > .env
```


**6. Database**

The setup for local development assumes that you will be working with dockerized
services.

First add the following line to your `.env` file:

```sh
(revengine)$ echo "DATABASE_URL=postgres://postgres@127.0.0.1:54000/revengine" >> .env
```

The `docker-compose.yml` sets up environment variables in a file, ``.postgres``.
To use the Docker setup, add these lines to that file:

```sh
    POSTGRES_DB=revengine
    POSTGRES_HOST_AUTH_METHOD=trust
```

If you want to connect to the database from your host machine, export the
following shell environment variables:

```sh
    export PGHOST=127.0.0.1
    export PGPORT=54000
    export PGUSER=postgres
    export PGDATABASE=revengine
```


**7. Migrate and create a superuser**

```linux
    (revengine)$ docker-compose up -d
    (revengine)$ python manage.py migrate
    (revengine)$ python manage.py createsuperuser
```

**8. Run the server**

```linux
    (revengine)$ docker-compose up -d
    (revengine)$ make run-dev
```

After initial setup the development server should be run using ``make run-dev`` this will remove any deployment containers hanging around and setup using local sources and database.


**9. Access the server**

The Django admin is at `/admin` and the Wagtail admin is at `/cms`.


**10. Run tests**

revengine uses pytest as a test runner.


```sh
    (revengine)$ make run-tests
```

**11. Reset Media and Database**

revengine uses invoke for interactions with the deployed environments.

From time to time it may become necessary to sync your local media tree with either production or staging. In order to do so,
you will need be setup to communicate with the kubernetes cluster. See [Caktus AWS Account Management](https://github.com/caktus/caktus-hosting-services/blob/main/docs/aws-assumerole.md)
for detailed instructions on authentication.

NOTE: That page will also have the ROLE_ARN you need to switch contexts below.

Once you have access you can run the following command:

```shell
    (revengine)$ inv aws.configure-eks-kubeconfig
```

If you have done this in the past, you just need to switch to the correct cluster, run:

```shell
    (revengine)$ kubectl config use-context <ROLE_ARN>
```

**Media Reset**

The command for resetting your local media (assuming your local media is found at ``.\media``) is:


```sh
    (revengine)$ inv staging aws.sync-media --sync-to="local" --bucket-path="media"
```

If you wish to make sure you need to reset you can issue the command with a ``dry-run`` argument.


```sh
    (revengine)$ inv staging aws.sync-media --sync-to="local" --bucket-path="media" --dry-run
```

If you wish to clean out your local media tree before reset you can issue the command with a ``--delete`` argument.


```sh
    (revengine)$ inv staging aws.sync-media --sync-to="local" --bucket-path="media" --delete
```


**Database Reset**

To reset your local database from a deployed environment:

```sh
    (revengine)$ inv staging pod.get-db-dump --db-var="DATABASE_URL"
```

This will pull down a current snapshot of the database into ``./revengine_database.dump``

Then restore your local database with the file:

```sh
    (revengine)$ pg_restore --no-owner --clean --if-exists --dbname revengine < revengine_database.dump
```
