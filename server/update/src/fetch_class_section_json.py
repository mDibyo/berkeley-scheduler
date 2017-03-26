#!/usr/bin/env python3

from functools import partial
import json
from multiprocessing import Pool
import sys
from urllib import error as url_error, parse as url_parse, request as url_request

from utils import *


def request_class_sections(term_id, subject_area, catalog_number):
    params = url_parse.urlencode({
        'term-id': term_id,
        'subject-area-code': cleaned_subject_area_code(subject_area),
        'catalog-number': catalog_number,
    })
    url = CLASS_SECTION_API_URL_FORMAT.format(params)
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


def fetch_class(catalog_number, subject_area):
    print('{} {}'.format(subject_area, catalog_number))
    return catalog_number, request_class_sections(TERM_ID, subject_area, catalog_number)


def main():
    with open(departments(), 'r') as f:
        subject_areas = sorted(json.load(f)['subjectAreas'].keys())

    completed = set()
    num_total = len(subject_areas)

    for subject_area in subject_areas:
        if subject_area in completed:
            continue

        catalog_numbers = set()
        chunk_number = 0
        while True:
            try:
                with open(fetched_classes_by_subject_area_new(subject_area, chunk_number)) as f:
                    catalog_numbers.update(map(
                        lambda class_: class_['course']['catalogNumber']['formatted'],
                        json.load(f)['apiResponse']['response']['classes']))
            except FileNotFoundError:
                break

            chunk_number += 1

        sections = {}
        with Pool() as pool:
            for catalog_number, response in \
                    pool.map(partial(fetch_class, subject_area=subject_area), catalog_numbers):
                if response:
                    sections[catalog_number] = response

        with open(fetched_class_sections_by_subject_area(subject_area), 'w') as f:
            json.dump(sections, f)

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
