#! /bin/bash
export NODE_ENV=dev
node app.js run --wsport 8657 --p2pport 38657 $@
