all :

build :
	docker-compose build

run : build
	docker-compose up --remove-orphans

debug : build
	docker-compose up -d --remove-orphans mail db
	cd ..
	npm run watch # TODO

test : build
	docker-compose -f docker-compose.yml up --remove-orphans db mail node-test

clean :
	rm -rf docker-test.yml
	docker-compose down
	yes | docker-compose rm -v
	$(MAKE) -C node clean
	$(MAKE) -C mail clean
	$(MAKE) -C db clean


.PHONY: run debug test clean
