#!/usr/bin/env python3

import json
import urllib
from urllib import parse as url_parse, request as url_request

TERM = 'fall-2016'
TERM_ID = 2168
CLASS_API_URL_FORMAT = 'https://apis.berkeley.edu/sis/v1/classes?{}'

SIS_CLASS_API_APP_ID_ENV = 'SIS_CLASS_API_APP_ID'
SIS_CLASS_API_APP_KEY_ENV = 'SIS_CLASS_API_APP_KEY'
SIS_CLASS_API_APP_ID = SIS_CLASS_API_APP_KEY = None

DEPARTMENTS_DIR = 'departments'
COURSE_LISTING_DIR = 'course-listing-by-subject-area'
CLASS_LISTING_DIR = 'class-listing-{}-by-subject-area'.format(TERM)

DEPARTMENTS_FORMAT = '{}/departments.json'
COURSES_FORMAT = '{}/{}/{}.json'
CLASSES_FORMAT = '{}/{}/{}.json'


chars_to_remove = [' ', '&', ',', '/', '-']


def get_subject_area_code(sac):
    for ch in chars_to_remove:
        sac = sac.replace(ch, '')
    return sac


def request_course(course):
    print('{} {}'.format(course['subjectAreaCode'], course['courseNumber']))

    params = url_parse.urlencode({
        'subject-area-code': get_subject_area_code(course['subjectAreaCode']),
        'catalog-number': course['courseNumber'],
        'term-id': TERM_ID
    })
    url = CLASS_API_URL_FORMAT.format(params)
    request = url_request.Request(url, headers={
        'Accept': 'application/json',
        'app_id': SIS_CLASS_API_APP_ID,
        'app_key': SIS_CLASS_API_APP_KEY
    })

    try:
        response = url_request.urlopen(request)
        response_str = response.readall().decode('utf-8')
        return json.loads(response_str)
    except urllib.error.HTTPError:
        return {}


def extract_section_info_from_json(section_json):
    assert len(section_json['meeting']) == 1
    return {
        'number': section_json['class']['number'],
        'primary': section_json['association']['primary'],
        'type': section_json['component']['code'],
        'id': section_json['id'],
        'location': section_json['meeting']['location'],
        'instructor': section_json['meeting']['name'],
        'time': {
            'startTime': section_json['meeting'][0]['startTime'],
            'endTime': section_json['meeting'][0]['endTime'],
            'days': section_json['meeting'][0]['meetingDays']
        },
        'enrollCapacity': section_json['enrollmentStatus']['maxEnroll'],
        'enrolled': section_json['enrollmentStatus']['enrolledCount'],
        'waitlistCapacity': section_json['enrollmentStatus']['maxWaitlist'],
        'waitlisted': section_json['enrollmentStatus']['waitlistedCount'],
        'printInScheduleOfClasses': section_json['printInScheduleOfClasses']
    }


def extract_class_info_from_json(sections_json):
    if not sections_json:
        return None

    extracted_class = sections_json[0]['class']

    extracted_sections = {}
    for section_json in sections_json:
        section = extract_section_info_from_json(section_json)
        extracted_sections[section['id']] = section

    if not extracted_sections:
        return None

    primary_section_id = sections_json[0]['association']['primaryAssociatedSectionId']
    primary_section = extracted_sections[primary_section_id]

    return {
        'displayName': extracted_class['course']['displayName'],
        'title': extracted_class['course']['title'],
        'instructor': primary_section['instructor'],
        'id': primary_section['id'],
        'units': -1,
        'sections': extracted_sections
    }


def extract_single_section_info_from_json(sections_json):
    if not sections_json:
        return None

    extracted_class = sections_json[0]

    return {
        'displayName': extracted_class['course']['displayName'],
        'title': extracted_class['course']['title'],
        'instructor': None,
        'id': None,
        'units': [
            extracted_class['allowedUnits']['minumium'],
            extracted_class['allowedUnits']['maximum']
        ],
        'sections': [{
            'number': extracted_class['number'],
            'primary': True,
            'type': extracted_class['primaryComponent']['code'],
            'id': None,
            'location': None,
            'instructor': None,
            'time': {
                'startTime': None,
                'endTime': None,
                'days': None
            },
            'enrollCapacity': extracted_class['aggregateEnrollmentStatus']['maxEnroll'],
            'enrolled': extracted_class['aggregateEnrollmentStatus']['enrolledCount'],
            'waitlistCapacity': extracted_class['aggregateEnrollmentStatus']['maxWaitlist'],
            'waitlisted': extracted_class['aggregateEnrollmentStatus']['waitlistedCount'],
            'printInScheduleOfClasses': extracted_class.get('anyPrintInScheduleOfClasses', True)
        }]
    }


def main():
    with open(DEPARTMENTS_FORMAT.format(DEPARTMENTS_DIR), 'r') as f:
        subject_areas = json.load(f)['subjectAreas']

    for subject_area in subject_areas:
        visited = set()
        input_file = COURSES_FORMAT.format(DEPARTMENTS_DIR, COURSE_LISTING_DIR, subject_area)
        with open(input_file, 'r') as f:
            courses = json.load(f)

        classes = {}
        for course in courses:
            if course['courseNumber'] in visited:
                continue
            visited.add(course['courseNumber'])
            response = request_course(course)
            if response and response['apiResponse']['httpStatus']['code'] == '200':
                if 'classSections' in response['apiResponse']['response']:
                    sections_json = \
                        response['apiResponse']['response']['classSections']['classSection']
                    _class = extract_class_info_from_json(sections_json)
                else:
                    sections_json = response['apiResponse']['response']['classes']['class']
                    _class = extract_single_section_info_from_json(sections_json)
                    # not_retrieved.append([course['subjectAreaCode'], course['courseNumber']])
                classes[_class['displayName']] = _class

        output_file = CLASSES_FORMAT.format(DEPARTMENTS_DIR, CLASS_LISTING_DIR, subject_area)
        with open(output_file, 'w') as f:
            json.dump(classes, f)


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

    main()
