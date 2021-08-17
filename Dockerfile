FROM node:14-slim as static_files

WORKDIR /code
ENV PATH /code/node_modules/.bin:$PATH
COPY ./spa/package.json ./spa/package-lock.json /code/
RUN npm install --silent
COPY ./spa /code/spa/
WORKDIR /code/spa/
RUN NODE_ENV=production npm run build

FROM python:3.9-slim as base

# Install packages needed to run your application (not build deps):
#   mime-support -- for mime types when serving static files
#   postgresql-client -- for running database commands
# We need to recreate the /usr/share/man/man{1..8} directories first because
# they were clobbered by a parent image.
RUN set -ex \
    && RUN_DEPS=" \
    libpcre3 \
    mime-support \
    postgresql-client \
    vim \
    curl \
    " \
    && seq 1 8 | xargs -I{} mkdir -p /usr/share/man/man{} \
    && apt-get update && apt-get -y install wget gnupg2 lsb-release \
    && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && apt-get update && apt-get install -y --no-install-recommends $RUN_DEPS \
    && rm -rf /var/lib/apt/lists/*

# Copy in your requirements file
ADD poetry.lock /poetry.lock
ADD pyproject.toml /pyproject.toml

# OR, if you're using a directory for your requirements, copy everything (comment out the above and uncomment this if so):
# ADD requirements /requirements

# Install build deps, then run `pip install`, then remove unneeded build deps all in a single step.
# Correct the path to your production requirements file, if needed.
RUN set -ex \
    && BUILD_DEPS=" \
    build-essential \
    libpcre3-dev \
    libpq-dev \
    " \
    && apt-get update && apt-get install -y --no-install-recommends $BUILD_DEPS \
    && pip install poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-root --no-dev \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false $BUILD_DEPS \
    && rm -rf /var/lib/apt/lists/*

# Copy your application code to the container (make sure you create a .dockerignore file if any large files or directories should be excluded)
RUN mkdir /code/
WORKDIR /code/
ADD . /code/

FROM base AS deploy

# Copy React SPA build into final image
COPY --from=static_files /code/spa/build /code/build

# Create a group and user to run our app
ARG APP_USER=appuser
RUN groupadd -r ${APP_USER} && useradd --no-log-init -r -g ${APP_USER} ${APP_USER}

# uWSGI will listen on this port. Heroku will randomly assign port on a dyno:
# https://help.heroku.com/PPBPA231/how-do-i-use-the-port-environment-variable-in-container-based-apps
ENV PORT=8000

# Add any static environment variables needed by Django or your settings file here:
ENV DJANGO_SETTINGS_MODULE=revengine.settings.deploy

# Call collectstatic (customize the following line with the minimal environment variables needed for manage.py to run):
RUN touch /code/.env
RUN DATABASE_URL='' ENVIRONMENT='' DJANGO_SECRET_KEY='dummy' DOMAIN='' python manage.py collectstatic --noinput -i *.scss --no-default-ignore

# Tell uWSGI where to find your wsgi file (change this):
ENV UWSGI_WSGI_FILE=revengine/wsgi.py

# Base uWSGI configuration (you shouldn't need to change these):
ENV UWSGI_MASTER=1 UWSGI_HTTP_AUTO_CHUNKED=1 UWSGI_HTTP_KEEPALIVE=1 UWSGI_LAZY_APPS=1 UWSGI_WSGI_ENV_BEHAVIOR=holy UWSGI_IGNORE_SIGPIPE=true UWSGI_IGNORE_WRITE_ERRORS=true UWSGI_DISABLE_WRITE_EXCEPTION=true

# Number of uWSGI workers and threads per worker (customize as needed):
ENV UWSGI_WORKERS=2 UWSGI_THREADS=4

# uWSGI static file serving configuration (customize or comment out if not needed):
ENV UWSGI_STATIC_MAP="/static/=/code/public/static/" UWSGI_STATIC_EXPIRES_URI="/static/.*\.[a-f0-9]{12,}\.(css|js|png|jpg|jpeg|gif|ico|woff|ttf|otf|svg|scss|map|txt) 315360000"

RUN mkdir google-sa && chown ${APP_USER}:${APP_USER} google-sa

# Change to a non-root user
USER ${APP_USER}:${APP_USER}

# Uncomment after creating your docker-entrypoint.sh
ENTRYPOINT ["/code/docker-entrypoint.sh"]

# Start uWSGI
CMD ["uwsgi", "--http=0.0.0.0:$PORT", "--show-config"]
