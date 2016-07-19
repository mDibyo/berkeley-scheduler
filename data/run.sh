#!/usr/bin/env bash

source .set_credentials.sh

daily=true

# Fetch course info
${daily} || ./.scripts/fetch_course_json.sh || exit $?
${daily} || ./.scripts/extract_course_json.py || exit $?

# Extract into departments
${daily} || ./.scripts/extract_departments_from_course_json.py || exit $?

# Fetch classes for a term
./.scripts/fetch_and_extract_class_json.py || exit $?

# Generate reverse lookup indices
./.scripts/generate_indices.py || exit $?

# Finalize
./.scripts/finalize.sh || exit $?
