FROM node:16-slim as static_files

WORKDIR /code
ENV PATH /code/node_modules/.bin:$PATH
COPY ./spa/package.json ./spa/package-lock.json /code/

# Skip installing Cypress binaries and security/funding audits, use package-lock.json strictly
RUN CYPRESS_INSTALL_BINARY=0 npm ci --no-audit --no-fund --silent
COPY ./spa /code/spa/
WORKDIR /code/spa/
RUN npm run build

FROM python:3.10.15-slim as base

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
    && apt-get update && apt-get -y install --no-install-recommends wget gnupg2 lsb-release \
    && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && apt-get update && apt-get install -y --no-install-recommends $RUN_DEPS \
    && rm -rf /var/lib/apt/lists/*

# Copy in your requirements file
ADD poetry.lock /poetry.lock
ADD pyproject.toml /pyproject.toml

# SETUPTOOLS_USE_DISTUTILS is here for because of the the heroku3 package. It can go away when that package
# is no longer needed. We may also be able to remove it with the next release of setuptools (65.6.3). It will no
# longer be supported in python 3.12 so it needs to go away or be resolved before upgrading to python 3.12.
# See DEV-2906
ENV SETUPTOOLS_USE_DISTUTILS=stdlib
# Install build deps, then run `pip install`, then remove unneeded build deps all in a single step.
# Correct the path to your production requirements file, if needed.
RUN set -ex \
    && BUILD_DEPS=" \
    build-essential \
    libpcre3-dev \
    libpq-dev \
    " \
    && apt-get update && apt-get install -y --no-install-recommends $BUILD_DEPS \
    && pip install "poetry" \
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
RUN DATABASE_URL='' ENVIRONMENT='' DJANGO_SECRET_KEY='dummy' DOMAIN='' GS_CREDENTIALS_RAISE_ERROR_IF_UNSET="false" python manage.py collectstatic --noinput -i *.scss --no-default-ignore

RUN mkdir google-sa && chown ${APP_USER}:${APP_USER} google-sa

# Change to a non-root user
USER ${APP_USER}:${APP_USER}

# This is specified in heroku.yml for now
# ENTRYPOINT ["/code/docker-entrypoint.sh"]

# this is specified in the docker-entrypoint.sh file for now
# Start uWSGI
# CMD ["uwsgi", "--http=0.0.0.0:$PORT", "--show-config"]
