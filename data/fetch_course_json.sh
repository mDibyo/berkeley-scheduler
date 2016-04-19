#!/usr/bin/env bash

# Check for credentials
: "${SIS_COURSE_API_APP_ID:?app_id not set}"
: "${SIS_COURSE_API_APP_KEY:?app_key not set}"

OUTPUT_DIR=$1

mkdir -p ${OUTPUT_DIR}

for i in `seq 39 39`; do
  echo "curl \
    -X GET \
    --header \"Accept: application/json\" \
    --header \"app_id: ${SIS_COURSE_API_APP_ID}\" \
    --header \"app_key: ${SIS_COURSE_API_APP_KEY}\" \
    \"https://apis.berkeley.edu/sis/v1/courses?course-number=${i}\" \
    > ${OUTPUT_DIR}/response.${i}.json"
  curl \
    -X GET \
    --header "Accept: application/json" \
    --header "app_id: ${SIS_COURSE_API_APP_ID}" \
    --header "app_key: ${SIS_COURSE_API_APP_KEY}" \
    "https://apis.berkeley.edu/sis/v1/courses?course-number=${i}" \
    > ${OUTPUT_DIR}/response.${i}.json
done
