#!/usr/bin/env bash

PROJECT_DIR=$(cd $(dirname ${BASH_SOURCE[0]})/.. && pwd )
CONTAINER_APP_DIR=/berkeley-scheduler

docker build \
  -t berkeleyscheduler/base \
  .

docker rm -f berkeley-scheduler-credentials
docker create \
  -v ${PROJECT_DIR}/server/.credentials:${CONTAINER_APP_DIR}/server/.credentials \
  --name berkeley-scheduler-credentials \
  berkeleyscheduler/base \
  /bin/true

docker build \
  -t berkeleyscheduler/update \
  update
