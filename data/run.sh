#!/usr/bin/env bash

INTERMEDIATE_DIR=intermediate
FETCHED_COURSE_DIR=${INTERMEDIATE_DIR}/fetched-course-json
EXTRACTED_COURSE_DIR=${INTERMEDIATE_DIR}/extracted-course-json
FETCHED_CLASS_DIR=${INTERMEDIATE_DIR}/fetched-class-json

source .set_credentials.sh

./scripts/fetch_course_json.sh ${FETCHED_COURSE_DIR}

./scripts/extract_course_json.py ${FETCHED_COURSE_DIR} ${EXTRACTED_COURSE_DIR}

