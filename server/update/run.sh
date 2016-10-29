#!/usr/bin/env bash


: ${APP_ROOT:=/berkeley-scheduler}

cd ${APP_ROOT} \
  && git checkout master \
  && git pull

${APP_ROOT}/server/update/update.sh
cd ${APP_ROOT}/server/update

cd ${APP_ROOT} \
  && git pull --rebase \
  && git add data \
  && git commit -m "Update Class API data - $(date +'%m/%d')" \
  && git push
