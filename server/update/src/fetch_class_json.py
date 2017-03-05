#!/usr/bin/env python3

import json
import sys
from urllib import error as url_error, parse as url_parse, request as url_request

from utils import *


CHUNK_SIZE = 50


def request_classes_by_subject_area(term_id, subject_area, page_number, page_size):
    params = url_parse.urlencode({
        'term-id': term_id,
        'subject-area-code': cleaned_subject_area_code(subject_area),
        'page-number': page_number,
        'page-size': page_size,
    })
    url = CLASS_API_URL_FORMAT.format(params)
    request = url_request.Request(url, headers={
        'Accept': 'application/json',
        'app_id': SIS_CLASS_API_APP_ID,
        'app_key': SIS_CLASS_API_APP_KEY
    })

    try:
        response = url_request.urlopen(request)
        response_str = response.read().decode('utf-8')
        return json.loads(response_str)
    except url_error.HTTPError as e:
        if int(e.code) == 500:
            raise
        return {}


def main():
    with open(departments(), 'r') as f:
        subject_areas = sorted(json.load(f)['subjectAreas'].keys())

    completed = set()
    num_total = len(subject_areas)

    for subject_area in subject_areas:
        if subject_area in completed:
            continue

        chunk_number = 0
        while True:
            response = request_classes_by_subject_area(TERM_ID,
                                                       subject_area,
                                                       chunk_number * CHUNK_SIZE,
                                                       CHUNK_SIZE)
            if not response:
                break

            print(JSON_FILE_FORMAT.format('{}.{:02d}'.format(cleaned_subject_area_code(subject_area),
                                                             chunk_number)))
            with open(fetched_classes_by_subject_area_new(subject_area, chunk_number), 'w') as f:
                json.dump(response, f)
            chunk_number += 1

        completed.add(subject_area)
        print('completed {}/{}'.format(len(completed), num_total))


if __name__ == '__main__':
    import os
    if SIS_CLASS_API_APP_ID_ENV not in os.environ:
        print('app_id not set')
        exit()
    SIS_CLASS_API_APP_ID = os.environ[SIS_CLASS_API_APP_ID_ENV]
    if SIS_CLASS_API_APP_KEY_ENV not in os.environ:
        print('app_key not set')
        exit()
    SIS_CLASS_API_APP_KEY = os.environ[SIS_CLASS_API_APP_KEY_ENV]

    sys.exit(main())
