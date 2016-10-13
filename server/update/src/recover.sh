#!/usr/bin/env bash

source $(dirname ${BASH_SOURCE[0]})/utils.sh

cp ${RECOVER_CLASSES_DIR}/* ${OUTPUT_CLASSES_DIR}
cp ${RECOVER_INDICES_DIR}/* ${OUTPUT_INDICES_DIR}
