#!/bin/sh
sed 's/npm\ run-script\ watch/while\ true;do\ npm\ run-script\ test;\ sleep\ 30;\ done/g' docker-compose.yml > docker-test.yml
docker-compose -f docker-test.yml up --remove-orphans
rm docker-test.yml
