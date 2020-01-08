all :

build :
	docker-compose build

run : build
	docker-compose up --remove-orphans

debug : build
	docker-compose up -d --remove-orphans mail db
	cd ..
	npm run watch # TODO

docker-test.yml : docker-compose.yml
	sed 's/npm\ run-script\ watch/while\ true;do\ npm\ run-script\ test;\ sleep\ 12;\ done/g' $^ > $@


test : build docker-test.yml
	docker-compose -f docker-test.yml up --remove-orphans

clean :
	rm -rf docker-test.yml
	docker-compose down
	yes | docker-compose rm -v
	$(MAKE) -C node clean
	$(MAKE) -C mail clean
	$(MAKE) -C db clean


.PHONY: run debug test clean
