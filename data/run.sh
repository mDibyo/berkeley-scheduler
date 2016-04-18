#!/usr/bin/env bash

FETCHED_COURSE_DIR=fetched-course-json
EXTRACTED_COURSE_DIR=extracted-course-json
FETCHED_CLASS_DIR=fetched-class-json

source .set_credentials.sh

mkdir -p ${FETCHED_COURSE_DIR}
./fetch_course_json.sh ${FETCHED_COURSE_DIR}

mkdir -p ${EXTRACTED_COURSE_DIR}
./extract_course_json.py ${FETCHED_COURSE_DIR} ${EXTRACTED_COURSE_DIR}

mkdir -p ${FETCHED_CLASS_DIR}