#!/bin/sh
while ! nc -z "$1" "$2"
do
  echo "waiting for $1 $2"
  sleep 2
done
