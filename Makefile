
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

run-redis:
	@echo 'Running local development with redis'
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d --remove-orphans
	cd spa; export PORT=3000; npm run start:subdomains &
	python manage.py runserver

run-tests:
	@echo 'Checking for migrations'
	python manage.py makemigrations --dry-run --check
	pytest

check-dc:
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml ps

start-celery:
	@echo 'Bring up test worker'
	celery -A revengine worker -l INFO