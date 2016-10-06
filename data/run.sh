#!/usr/bin/env bash

source .set_credentials.sh

term='spring-2017'

daily=true

# Fetch course info
${daily} || ./.scripts/fetch_course_json.sh || exit $?
${daily} || ./.scripts/extract_course_json.py || exit $?

# Extract into departments
${daily} || ./.scripts/extract_departments_from_course_json.py || exit $?
${daily} || cp -r intermediate/departments/course-listing-by-subject-area intermediate/departments/class-listing-${term}-by-subject-area

# Fetch classes for a term
./.scripts/fetch_and_extract_class_json.py || exit $?

# Generate reverse lookup indices
./.scripts/generate_indices.py || exit $?

# Finalize
./.scripts/finalize.sh || exit $?
