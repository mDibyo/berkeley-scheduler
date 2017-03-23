#!/usr/bin/env python3

import json
import sys
from urllib import error as url_error, parse as url_parse, request as url_request

from utils import *


CHUNK_SIZE = 50


def request_course(course_number, row_start, row_limit):
    params = url_parse.urlencode({
        'course-number': course_number,
        'row-start': row_start,
        'row-limit': row_limit
    })
    url = COURSE_API_URL_FORMAT.format(params)
    request = url_request.Request(url, headers={
        'Accept': 'application/json',
        'app_id': SIS_COURSE_API_APP_ID,
        'app_key': SIS_COURSE_API_APP_KEY
    })

    try:
        response = url_request.urlopen(request)
        response_str = response.read().decode('utf-8')
        return json.loads(response_str)
    except url_error.HTTPError as e:
        if e.code == "500":
            raise
        return {}


def main():
    for course_number in range(FILE_RANGE.start, FILE_RANGE.end):
        print(course_number)
        chunk_number = 0
        while True:
            response = request_course(course_number, chunk_number * CHUNK_SIZE, CHUNK_SIZE)
            if not response:
                break

            print(JSON_FILE_FORMAT.format('response.{:03d}.{:02d}'.format(course_number, chunk_number)))
            with open(fetched_courses(course_number, chunk_number), 'w') as f:
                json.dump(response, f)
            chunk_number += 1
    return 0


if __name__ == '__main__':
    import os
    if SIS_COURSE_API_APP_ID_ENV not in os.environ:
        print('app_id not set')
        exit()
    SIS_COURSE_API_APP_ID = os.environ[SIS_COURSE_API_APP_ID_ENV]
    if SIS_COURSE_API_APP_ID_ENV not in os.environ:
        print('app_key not set')
        exit()
    SIS_COURSE_API_APP_KEY = os.environ[SIS_COURSE_API_APP_KEY_ENV]

    sys.exit(main())
