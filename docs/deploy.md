# Deploy

## Requirements
* [Heroku command line installed.](https://devcenter.heroku.com/categories/command-line)
* Docker  
* Access to the Git repository that will be used for heroku deploys.  
* Inclusion on a team that has billing access rights to the Heroku account.
* [pwgen](https://github.com/jbernard/pwgen) or something like it.
* A previously created Heroku app.

### Checkout the repository that will be used to deploy the app

```shell
$> git clone git@github.com:newsrevenuehub/rev-engine.git
$> cd rev-engine
(rev-engine) $> git checkout develop
```

### Link the heroku app to git
Heroku apps are linked to a git repository. In this case we will link the existing app to the checked out repository

```sh
(rev-engine) $> heroku git:remote -a rev-engine-test
```

### Set the docker container

```shell
(rev-engine) $> heroku stack:set container -a rev-engine-test
```

### Add Resources

Every app has resources. In this case, we will add a PostgreSQL database and a Redis cache/broker.
The resources are called add-ons, and come with [different tiers and pricing](https://elements.heroku.com/addons).

```shell
(rev-engine) $> heroku addons:create heroku-postgresql:hobby-basic -a rev-engine-test
(rev-engine) $> heroku addons:create heroku-redis:hobby-dev -a rev-engine-test
```

### Set the App's environment.

Set environment variables for Django to use.

```shell
(rev-engine) $> heroku config:set -a rev-engine-test DJANGO_SETTINGS_MODULE=rev-engine.settings.deploy
(rev-engine) $> heroku config:set -a rev-engine-test DJANGO_SECRET_KEY="$(pwgen -s 64 1 | tr -d '\n')"
(rev-engine) $> heroku config:set -a rev-engine-test DOMAIN=rev-engine-test.herokuapp.com
(rev-engine) $> heroku config:set -a rev-engine-test ALLOWED_HOSTS=rev-engine-test.herokuapp.com
(rev-engine) $> heroku config:set -a rev-engine-test ENVIRONMENT=staging
```

### Deploy the app

From your local version of the repository on the develop branch, push a commit.

```shell
(rev-engine) $> git push heroku develop
```
