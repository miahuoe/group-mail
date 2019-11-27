#!/bin/sh
docker-compose down
yes | docker-compose rm -v
docker-compose build
docker-compose up --remove-orphans
