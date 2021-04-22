
clean:
	@find . -name "*.pyc" -exec rm -rf {} \;
	@find . -name "__pycache__" -delete


update_requirements:
	pip install -U -q pip-tools
	pip-compile --output-file=requirements/base/base.txt requirements/base/base.in
	pip-compile --output-file=requirements/dev/dev.txt requirements/dev/dev.in
	pip-compile --output-file=requirements/deploy/deploy.txt requirements/deploy/deploy.in

install_requirements:
	@echo 'Installing pip-tools...'
	export PIP_REQUIRE_VIRTUALENV=true; \
	pip install -U -q pip-tools
	@echo 'Installing requirements...'
	pip-sync requirements/base/base.txt requirements/dev/dev.txt

setup:
	@echo 'Setting up the environment...'
	make install_requirements

run-dev:
	@echo 'Running local development'
	docker-compose up -d --remove-orphans
	cd spa; export PORT=8001; npm start &
	python manage.py runserver

run-tests:
	@echo 'Checking for migrations'
	python manage.py makemigrations --dry-run --check
	pytest
