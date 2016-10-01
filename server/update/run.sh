#!/usr/bin/env bash

source .set_credentials.sh

daily=true

# Fetch course info
${daily} || ./src/fetch_course_json.sh || exit $?
${daily} || ./src/extract_course_json.py || exit $?

# Extract into departments
${daily} || ./src/extract_departments_from_course_json.py || exit $?

# Fetch classes for a term
./src/fetch_and_extract_class_json.py || exit $?

# Generate reverse lookup indices
./src/generate_indices.py || exit $?

# Finalize
./src/finalize.sh || exit $?
