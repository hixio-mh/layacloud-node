#! /bin/bash
export NODE_ENV=dev
node app.js run --game-port 8657 --peer-port 38657 $@
