#!/usr/bin/env bash

project_dir=$(cd $(dirname ${BASH_SOURCE[0]})/../.. && pwd)

git checkout gh-pages
git pull -X theirs
./run_pipeline.sh
git add ${project_dir}/data
git commit -m "Update Class API data"
git push
