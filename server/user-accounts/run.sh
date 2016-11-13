#!/usr/bin/env bash

: ${APP_ROOT:=/berkeley-scheduler}

python3 ${APP_ROOT}/server/user-accounts/src/server.py 80
