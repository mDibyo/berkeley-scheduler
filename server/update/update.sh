#!/usr/bin/env bash

source $(dirname ${BASH_SOURCE[0]})/src/utils.sh
daily=true

source ${CREDENTIALS_DIR}/sis_api.sh

if [[ "${daily}" = false ]]; then
  # Fetch course info
  ${SRC_DIR}/fetch_course_json.sh || exit $?
  ${SRC_DIR}/extract_course_json.py || exit $?

  # Extract into departments
  ${SRC_DIR}/extract_departments_from_course_json.py || exit $?
  cp -r ${INPUT_CLASSES_DIR} ${INPUT_CLASSES_TERM_DIR}
fi

# Fetch classes for a term
${SRC_DIR}/fetch_and_extract_class_json.py || exit $?

# Generate reverse lookup indices
${SRC_DIR}/generate_indices.py || exit $?

# Finalize
${SRC_DIR}/finalize.sh || exit $?
