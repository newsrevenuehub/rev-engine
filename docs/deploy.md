# Deploy

```
heroku git:remote -a revengine-test
heroku stack:set container -a revengine-test
heroku addons:create heroku-postgresql:hobby-dev -a revengine-test
heroku addons:create heroku-redis:hobby-dev -a revengine-test
heroku config:set -a revengine-test DJANGO_SETTINGS_MODULE=revengine.settings.deploy
heroku config:set -a revengine-test DJANGO_SECRET_KEY="$(openssl rand -base64 64)" 
heroku config:set -a revengine-test DOMAIN=revengine-test.herokuapp.com
heroku config:set -a revengine-test ALLOWED_HOSTS=revengine-test.herokuapp.com
heroku config:set -a revengine-test ENVIRONMENT=staging
git push heroku main
```
