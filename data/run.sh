#!/usr/bin/env bash

FETCHED_DIR=fetched_course_json
EXTRACTED_DIR=extracted

source .set_credentials.sh

mkdir -p ${FETCHED_DIR}
./fetch_course_json.sh ${FETCHED_DIR}

mkdir -p ${EXTRACTED_DIR}
./extract.py ${FETCHED_DIR} ${EXTRACTED_DIR}