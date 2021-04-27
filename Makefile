
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
	cd spa; export PORT=8001; npm start &
	python manage.py runserver

run-tests:
	@echo 'Checking for migrations'
	python manage.py makemigrations --dry-run --check
	pytest
