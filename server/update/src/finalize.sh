#!/usr/bin/env bash

source $(dirname ${BASH_SOURCE[0]})/utils.sh

mkdir -p ${OUTPUT_DEPARTMENTS_DIR} \
  && cp ${INPUT_DEPARTMENTS_DIR}/departments.json ${OUTPUT_DEPARTMENTS_DIR}

mkdir -p ${OUTPUT_CLASSES_DIR} \
  && mkdir -p ${RECOVER_CLASSES_DIR} \
  && cp ${OUTPUT_CLASSES_DIR}/* ${RECOVER_CLASSES_DIR} \
  && cp ${INPUT_CLASSES_DIR}/* ${OUTPUT_CLASSES_DIR}

mkdir -p ${OUTPUT_INDICES_DIR} \
  && mkdir -p ${RECOVER_INDICES_DIR} \
  && cp ${OUTPUT_INDICES_DIR}/* ${RECOVER_INDICES_DIR} \
  && cp ${INPUT_INDICES_DIR}/* ${OUTPUT_INDICES_DIR}
