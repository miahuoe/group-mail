#!/bin/sh
sudo rm -r db-data/*
sed 's/npm\ start/npm\ test/g' docker-compose.yml > docker-test.yml
docker-compose -f docker-test.yml up --remove-orphans
rm docker-test.yml
