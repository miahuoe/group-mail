#!/bin/sh
yes | docker-compose rm -v
docker-compose up --remove-orphans
