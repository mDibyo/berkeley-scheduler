#!/usr/bin/env bash


: ${APP_ROOT:=/berkeley-scheduler}

eval $(ssh-agent)
ssh-add ${APP_ROOT}/server/.credentials/bs-bot_id_rsa

cd ${APP_ROOT} \
  && git remote add origin-ssh git@github.com:mDibyo/berkeley-scheduler.git

cd ${APP_ROOT} \
  && git checkout master \
  && git fetch origin-ssh master \
  && git reset --hard origin-ssh/master

${APP_ROOT}/server/update/update.sh
cd ${APP_ROOT}/server/update \
  && python3 -m unittest || exit 1

cd ${APP_ROOT} \
  && git stash \
  && git fetch origin-ssh master \
  && git reset --hard origin-ssh/master \
  && git stash pop \
  && git add data \
  && git commit -m "Update Class API data - $(date +'%m/%d')" \
  && git push origin-ssh master || exit 1

cd ${APP_ROOT} \
  && git checkout gh-pages \
  && git merge master \
  && git push origin-ssh gh-pages
