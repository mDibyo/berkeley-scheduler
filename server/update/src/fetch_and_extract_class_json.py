#!/usr/bin/env python3

import json
import sys
import urllib
from urllib import parse as url_parse, request as url_request

from utils import *


COURSES_TO_ADD = {
    'COG SCI': [{
        'courseNumber': 'C100',
        'subjectAreaCode': 'COG SCI',
        'units': 3,
    }],
    'MAT SCI': [{
        'courseNumber': 'C211',
        'subjectAreaCode': 'MAT SCI',
        'units': 3,
    }],
    'EPS': [{
        'courseNumber': 'C162',
        'subjectAreaCode': 'EPS',
        'units': 4,
    }],
    'MUSIC': [{
        'courseNumber': '128V',
        'subjectAreaCode': 'MUSIC',
        'units': 1,
    }]
}


def request_course(course):
    print('{} {}'.format(course['subjectAreaCode'], course['courseNumber']))

    params = url_parse.urlencode({
        'subject-area-code': cleaned_subject_area_code(course['subjectAreaCode']),
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
        response_str = response.read().decode('utf-8')
        return json.loads(response_str)
    except urllib.error.HTTPError:
        return {}


def extract_instructor_info_from_json(instructor_json):
    return {
        'name': instructor_json['instructor']['names'][0]['formattedName'],
        'role': instructor_json['role'].get('description', None),
    }


def extract_meeting_info_from_json(meeting_json):
    extracted_instructors = []
    for instructor_json in meeting_json.get('assignedInstructors', []):
        if 'names' in instructor_json['instructor'] and instructor_json['instructor']['names']:
            extracted_instructors.append(
                extract_instructor_info_from_json(instructor_json)
            )
    return {
        'startTime': meeting_json.get('startTime', None),
        'endTime': meeting_json.get('endTime', None),
        'days': {
            'Sunday': meeting_json.get('meetsSunday', None),
            'Monday': meeting_json.get('meetsMonday', None),
            'Tuesday': meeting_json.get('meetsTuesday', None),
            'Wednesday': meeting_json.get('meetsWednesday', None),
            'Thursday': meeting_json.get('meetsThursday', None),
            'Friday': meeting_json.get('meetsFriday', None),
            'Saturday': meeting_json.get('meetsSaturday', None),
        },
        'dayAbbrvs': meeting_json.get('meetsDays', None),
        'location': meeting_json.get('location', {}),
        'instructors': extracted_instructors,
    }


def extract_section_info_from_json(section_json):
    extracted_meetings = [extract_meeting_info_from_json(meeting_json)
                          for meeting_json in section_json.get('meetings', [])]
    return {
        'number': section_json.get('number', ''),
        'primary': section_json['association']['primary'],
        'type': section_json['component']['code'],
        'id': section_json['id'],
        'meetings': extracted_meetings,
        'status': section_json['enrollmentStatus']['status'],
        'enrollCapacity': section_json['enrollmentStatus']['maxEnroll'],
        'enrolled': section_json['enrollmentStatus']['enrolledCount'],
        'waitlistCapacity': section_json['enrollmentStatus']['maxWaitlist'],
        'waitlisted': section_json['enrollmentStatus']['waitlistedCount'],
        'printInScheduleOfClasses': section_json['printInScheduleOfClasses']
    }


def extract_class_info_from_json(sections_json):
    if not sections_json:
        return {}

    extracted_class = sections_json[0]['class']

    extracted_sections = {}
    for section_json in sections_json:
        section = extract_section_info_from_json(section_json)
        extracted_sections[section['id']] = section

    if not extracted_sections:
        return {}

    primary_section_id = sections_json[0]['association']['primaryAssociatedSectionId']
    if primary_section_id:
        primary_section = extracted_sections[primary_section_id]
    else:
        primary_section = {
            'id': None,
            'printInScheduleOfClasses': True,
            'meetings': [{
                'startTime': None,
                'endTime': None,
                'days': {
                    'Sunday': None,
                    'Monday': None,
                    'Tuesday': None,
                    'Wednesday': None,
                    'Thursday': None,
                    'Friday': None,
                    'Saturday': None,
                },
                'dayAbbrvs': '',
                'location': None,
                'instructors': [],
            }],
        }

    return {
        'displayName': extracted_class['course']['displayName'],
        'title': extracted_class['course']['title'],
        'id': primary_section['id'],
        'printInScheduleOfClasses': primary_section['printInScheduleOfClasses'],
        'meetings': primary_section['meetings'],
        'units': -1,
        'sections': list(extracted_sections.values())
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
        'printInScheduleOfClasses': extracted_class.get('anyPrintInScheduleOfClasses', True),
        'units': [
            extracted_class['allowedUnits']['minumium'],
            extracted_class['allowedUnits']['maximum']
        ],
        'sections': [{
            'number': extracted_class.get('number', ''),
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


def main(only_new=False):
    with open(departments(), 'r') as f:
        subject_areas = json.load(f)['subjectAreas']

    num_total = len(subject_areas)
    completed = set()

    for subject_area in subject_areas:
        if subject_area in completed:
            continue
        input_file = course_listing_by_subject_area(subject_area)
        output_file = class_listing_by_subject_area(subject_area)
        json_output_file = fetched_classes_by_subject_area(subject_area)

        classes = {}
        classes_json = {}
        with open(input_file, 'r') as f:
            courses = json.load(f)
        if only_new:
            try:
                with open(output_file, 'r') as f:
                    classes = json.load(f)
                    visited = set(classes.keys())
            except IOError as e:
                visited = set()
        else:
            visited = set()

        if subject_area in COURSES_TO_ADD:
            courses.extend(COURSES_TO_ADD[subject_area])

        try:
            for course in courses:
                if course['courseNumber'] in visited:
                    continue
                try:
                    visited.add(course['courseNumber'])
                    response = request_course(course)
                    if response and response['apiResponse']['httpStatus']['code'] == '200':
                        if 'classSections' in response['apiResponse']['response']:
                            sections_json = \
                                response['apiResponse']['response']['classSections']
                            _class = extract_class_info_from_json(sections_json)
                            _class.update({
                                'description': course.get('description', ''),
                                'units': course['units'],
                            })
                        else:
                            sections_json = response['apiResponse']['response']['classes']['class']
                            _class = extract_single_section_info_from_json(sections_json)
                        classes[course['courseNumber']] = _class
                        classes_json[course['courseNumber']] = response
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    print(e)
                    continue
        except KeyboardInterrupt:
            print('completed processing: {}'.format(completed))
            return 1
        finally:
            with open(output_file, 'w') as f:
                json.dump(classes, f)
            with open(json_output_file, 'w') as f:
                json.dump(classes_json, f)

        completed.add(subject_area)
        print('{}/{} subject areas completed'.format(len(completed), num_total))

    return 0


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

    sys.exit(main(only_new=False))
