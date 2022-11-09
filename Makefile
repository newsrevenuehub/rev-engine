
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
	poetry update

install_requirements:
	@echo 'Installing project requirements...'
	poetry install

setup:
	@echo 'Setting up the environment...'
	make install_requirements

run-dev:
	@echo 'Running local development'
	docker-compose up -d --remove-orphans
	cd spa; export PORT=3000; npm run start:subdomains &
	python manage.py runserver

run-gcloud-pub-sub:
	@echo 'Running local development with Google Cloud Pub Sub Emulator'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans google-cloud-pub-sub
	sleep 5 && curl -s -X PUT 'http://localhost:8085/v1/projects/revenue-engine/topics/new-nre-customer-test' # sleep for 5 seconds to allow google cloud to boot up
	cd spa; export PORT=3000; npm run start:subdomains &
	python manage.py runserver

run-redis:
	@echo 'Running local development with redis'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans redis
	cd spa; export PORT=3000; npm run start:subdomains &
	python manage.py runserver

run-tests:
	make test_migrations
	pytest --reuse-db -vvv --cov-config=.coveragerc --cov-report=html --cov=apps --cov=revengine

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
