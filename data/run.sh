#!/usr/bin/env bash

source .set_credentials.sh
./scripts/fetch_course_json.sh
./scripts/extract_course_json.py
./scripts/fetch_and_extract_class_json.py
./scripts/generate_indices.py
./scripts/finalize.sh
