#!/usr/bin/env bash


: ${APP_ROOT:=/berkeley-scheduler}

eval $(ssh-agent)
ssh-add ${APP_ROOT}/server/.credentials/bs-bot_id_rsa

cd ${APP_ROOT} \
  && git remote add origin-ssh git@github.com:mDibyo/berkeley-scheduler.git

cd ${APP_ROOT} \
  && git checkout master \
  && git pull origin-ssh master

${APP_ROOT}/server/update/update.sh
#cd ${APP_ROOT}/server/update \
#  && python3 -m unittest

cd ${APP_ROOT} \
  && git stash \
  && git pull -X theirs origin-ssh master \
  && git stash pop \
  && git add data \
  && git commit -m "Update Class API data - $(date +'%m/%d')" \
  && git push origin-ssh master
