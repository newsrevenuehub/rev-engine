
test: run-tests


test_migrations:
	@echo 'Testing migrations'
	@echo 'Ensuring no pending migrations'
	python manage.py makemigrations --dry-run --check
	@echo 'Ensuring migration names are not automatically assigned'
	python manage.py check --deploy --tag compatibility  --fail-level WARNING

debug_test:
	pytest -p no:warnings --pdb --pdbcls=IPython.terminal.debugger:Pdb

continuous_test:
	git ls-files | entr pytest -p no:warnings -x -s -vv --log-cli-level=INFO

clean:
	@find . -name "*.pyc" -exec rm -rf {} \;
	@find . -name "__pycache__" -delete


update_requirements:
	@echo 'Updating the requirements...'
	uv lock --upgrade

install_requirements:
	@echo 'Installing project requirements...'
	uv sync --frozen

setup:
	@echo 'Setting up the environment...'
	make install_requirements

run-dev:
	@echo 'Running local development'
	docker-compose up -d --remove-orphans
	cd spa; npm start &
	python manage.py runserver

run-gcloud-pub-sub:
	@echo 'Running local development with Google Cloud Pub Sub Emulator'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans google-cloud-pub-sub db
	# increased to 10 seconds on m1 macbook as there were some intermittent timeouts
	sleep 10 \
 		 && curl -s -X PUT 'http://localhost:8085/v1/projects/revenue-engine/topics/new-nre-customer-test' && \
	 sleep 10 \
 		 && curl -s -X PUT 'http://localhost:8085/v1/projects/revenue-engine/topics/contribution-page-published'
	cd spa; npm start &
	ENABLE_PUBSUB=true python manage.py runserver

run-hybrid:
	@echo 'Running local development as hybrid app (with Django serving SPA)'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans redis db
	cd spa; export BROWSER=none; export REACT_APP_NO_PROXY=y; npm start &
	sleep 3 && python -m webbrowser http://localhost:8000 &
	python manage.py runserver

run-redis:
	@echo 'Running local development with redis'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans redis db
	cd spa; npm start &
	python manage.py runserver

run-tests:
	make test_migrations
	pytest --reuse-db --cov-config=.coveragerc --cov-report=html --cov=apps --cov=revengine $(EXTRA_PYTEST)

check-dc:
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml ps

start-celery:
	@echo 'Bring up test worker'
	celery -A revengine worker -l INFO

nuclear:
	-docker rm -vf $$(docker ps -a -q)
	-docker rmi -f $$(docker images -a -q)
	-docker system prune -af --volumes

deploy-to-dev:
	git push heroku-rev-engine-dev develop:main

deploy-to-test:
	git push heroku-rev-engine-test test:main

deploy-to-staging:
	git push heroku-rev-engine-staging staging:main

deploy-to-demo:
	git push heroku-rev-engine-demo demo:main

deploy-to-prod:
	git push heroku-rev-engine-prod main:main

deploy-all: deploy-to-dev deploy-to-test deploy-to-staging deploy-to-demo deploy-to-prod


drop-db:
	docker stop rev-engine-db-1 && docker rm rev-engine-db-1
	docker volume rm rev-engine_dev_revengine_data

restore-db-backup:
	# see https://stackoverflow.com/questions/73440350/pg-restore-error-could-not-execute-query-error-extension-pg-stat-statements
	psql $(DATABASE_URL) -c "CREATE SCHEMA IF NOT EXISTS heroku_ext AUTHORIZATION $(PGUSER)"
	psql $(DATABASE_URL) -c "CREATE extension IF NOT EXISTS citext WITH schema heroku_ext"
	psql $(DATABASE_URL) -c "GRANT ALL ON SCHEMA heroku_ext TO public"
	psql $(DATABASE_URL) -c "GRANT USAGE ON SCHEMA heroku_ext TO public"
	psql $(DATABASE_URL) -c "SET search_path TO heroku_ext,public"
	psql $(DATABASE_URL) -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA heroku_ext TO $(PGUSER)"
	pg_restore --verbose --clean --no-acl --no-owner -d $(PGDATABASE) $(BACKUP_FILE)
