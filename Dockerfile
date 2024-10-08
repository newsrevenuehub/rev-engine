# Stage 1: Build static files using Node.js
FROM node:16-slim as static_files

WORKDIR /code
ENV PATH /code/node_modules/.bin:$PATH
COPY ./spa/package.json ./spa/package-lock.json /code/

# Skip installing Cypress binaries and security/funding audits, use package-lock.json strictly
RUN CYPRESS_INSTALL_BINARY=0 npm ci --no-audit --no-fund --silent
COPY ./spa /code/spa/
WORKDIR /code/spa/
RUN npm run build

# Stage 2: Base Python image
FROM python:3.10-slim as base

# Copy uv tool
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy lock files
ADD uv.lock /uv.lock
ADD pyproject.toml /pyproject.toml

# SETUPTOOLS_USE_DISTUTILS is here for because of the the heroku3 package. It can go away when that package
# is no longer needed. We may also be able to remove it with the next release of setuptools (65.6.3). It will no
# longer be supported in python 3.12 so it needs to go away or be resolved before upgrading to python 3.12.
# See DEV-2906
ENV SETUPTOOLS_USE_DISTUTILS=stdlib

# Install runtime dependencies
#   curl: because it's used in some of our make commands
#   libpcre3: -- for regex support
#   make: for commands
#   mime-support: -- for mime types when serving static files
#   postgresql-client: -- for running database commands
#   vim: -- for editing files in the container
RUN set -ex \
    && RUN_DEPS=" \
    curl \
    libpcre3 \
    make \
    mime-support \
    postgresql-client \
    vim \
    " \
    && apt-get update \
    && apt-get -y install --no-install-recommends wget gnupg2 lsb-release \
    && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && apt-get update \
    && apt-get install -y --no-install-recommends $RUN_DEPS \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies, install Python packages, then remove build dependencies
RUN set -ex \
    && BUILD_DEPS=" \
    build-essential \
    gcc \
    libc-dev \
    libpq-dev \
    libpcre3-dev \
    " \
    && apt-get update \
    && apt-get install -y --no-install-recommends $BUILD_DEPS \
    && uv pip install -r pyproject.toml --system \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false $BUILD_DEPS \
    && rm -rf /var/lib/apt/lists/*

# Create application directory and copy code
RUN mkdir /code/
WORKDIR /code/
ADD . /code/

# Stage 3: Final deployment image
FROM base AS deploy

# Copy React SPA build into the final image
COPY --from=static_files /code/spa/build /code/build

# Create a group and user to run the app
ARG APP_USER=appuser
RUN groupadd -r ${APP_USER} && useradd --no-log-init -r -g ${APP_USER} ${APP_USER}

# uWSGI will listen on this port. Heroku will randomly assign port on a dyno:
# https://help.heroku.com/PPBPA231/how-do-i-use-the-port-environment-variable-in-container-based-apps
ENV PORT=8000

# Add any static environment variables needed by Django or your settings file here:
ENV DJANGO_SETTINGS_MODULE=revengine.settings.deploy

# Prepare the environment file
RUN touch /code/.env

# Collect static files
RUN DATABASE_URL='' ENVIRONMENT='' DJANGO_SECRET_KEY='dummy' DOMAIN='' GS_CREDENTIALS_RAISE_ERROR_IF_UNSET="false" python manage.py collectstatic --noinput -i *.scss --no-default-ignore

# Create directory for Google service account and adjust permissions
RUN mkdir google-sa && chown ${APP_USER}:${APP_USER} google-sa

# Change to the non-root user
USER ${APP_USER}:${APP_USER}

# ENTRYPOINT is specified in heroku.yml for now
# CMD (to start UWSGI)is specified in docker-entrypoint.sh for now
