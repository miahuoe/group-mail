#!/bin/sh
u=$USER
sudo chown $u:$u -R db-data
rm -rf db-data/*
