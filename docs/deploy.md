# Deploy

## Requirements

- [Heroku command line installed](https://devcenter.heroku.com/categories/command-line)
- Docker
- Access to the Git repository that will be used for Heroku deploys
- Inclusion on a team that has billing access rights to the Heroku account
- [pwgen](https://github.com/jbernard/pwgen) or something like it
- A previously-created Heroku app

## Steps

### 1. Checkout the repository that will be used to deploy the app

```shell
$> git clone git@github.com:newsrevenuehub/rev-engine.git
$> cd rev-engine
git checkout develop
```

### 2. Link the Heroku app to Git

Heroku apps are linked to a git repository. In this case we will link the existing app to the checked out repository

```shell
heroku git:remote -a rev-engine-test
```

### 3. Set the Docker container

```shell
heroku stack:set container -a rev-engine-test
```

### 4. Add resources

Every app has resources. In this case, we will add a PostgreSQL database and a Redis cache/broker. The resources are called add-ons, and come with [different tiers and pricing](https://elements.heroku.com/addons).

```shell
heroku addons:create heroku-postgresql:hobby-basic -a rev-engine-test
heroku addons:create heroku-redis:hobby-dev -a rev-engine-test
```

### 5. Set the app's environment

Set environment variables for Django to use.

```shell
heroku config:set -a rev-engine-test DJANGO_SETTINGS_MODULE=revengine.settings.deploy
heroku config:set -a rev-engine-test DJANGO_SECRET_KEY="$(pwgen -s 64 1 | tr -d '\n')"
heroku config:set -a rev-engine-test DOMAIN=rev-engine-test.herokuapp.com
heroku config:set -a rev-engine-test ALLOWED_HOSTS=rev-engine-test.herokuapp.com
heroku config:set -a rev-engine-test ENVIRONMENT=staging
```

### 6. Configure Google Cloud resources

This project uses Google Cloud and a GC service account to manage its static resources.

At the moment this is the media uploaded to the project. Django static files are managed through WhiteNoise.

3 config vars are required:

1. `GS_SERVICE_ACCOUNT`: A base64 encoded JSON blob provided by Google for the service account. This value should _never_ be checked in or exposed in CI.
2. `GS_BUCKET_NAME`: Currently `rev-engine-media`
3. `GS_PROJECT_ID`: Currently `revenue-engine`

```shell
heroku config:set -a rev-engine-test GS_SERVICE_ACCOUNT=<ENCODED_JSON_BLOB>
heroku config:set -a rev-engine-test GS_BUCKET_NAME=rev-engine-media
heroku config:set -a rev-engine-test GS_PROJECT_ID=revenue-engine
```

### 7. Deploy the app

From your local version of the repository on the develop branch, push a commit.

NOTE: Any push or merge to the `develop` branch will run a CI/CD workflow and deploy to the rev-engine-test app.

```shell
git push heroku develop
```
