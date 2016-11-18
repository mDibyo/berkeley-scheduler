#!/usr/bin/env bash

: ${APP_ROOT:=/berkeley-scheduler}

echo 'HERE AGAIN!'

python3 -m http.server --bind 0.0.0.0 8085

# python3 ${APP_ROOT}/server/user-accounts/src/server.py 8080

echo 'THERE!'
