#!/usr/bin/env python3

import json
from collections import defaultdict, namedtuple


Range = namedtuple('Range', ['start', 'end'])

FETCHED_DIR = 'fetched-course-json'
EXTRACTED_DIR = 'extracted-course-json'

INPUT_FORMAT = '{}/response.{}.json'
PARSED_OUTPUT_FORMAT = '{}/response_extracted.{}.json'
DEPARTMENTS_OUTPUT_FORMAT = 'out/departments/{}.json'
SUBJECT_AREAS_OUTPUT_FORMAT = 'out/subject-areas/{}.json'

FILE_RANGE = Range(1, 400)


def extract_course_info_from_json(course_json):
    return {
        'departmentCode': course_json['academicDepartment']['code'],
        'departmentDescription': course_json['academicDepartment']['description'],
        'subjectAreaCode': course_json['subjectArea']['code'],
        'subjectAreaDescription': course_json['subjectArea']['description'],
        'courseNumber': course_json['catalogNumber']['formatted'],
        'title': course_json['title'],
        'proposedInstructors': course_json['proposedInstructors'],
        'units': course_json['credit']
    }


def extract_course_info_from_file(f):
    output_courses = []
    try:
        j = json.load(f)
        if 'courses' in j['apiResponse']['response']['any']:
            for c in j['apiResponse']['response']['any']['courses']:
                output_courses.append(extract_course_info_from_json(c))
    except ValueError:
        pass
    return output_courses


def extract_all_course_info():
    for course_number in range(FILE_RANGE.start, FILE_RANGE.end):
        input_file = INPUT_FORMAT.format(FETCHED_DIR, course_number)
        try:
            with open(input_file, 'r') as f:
                output_courses = extract_course_info_from_file(f)
            if output_courses:
                output_file = PARSED_OUTPUT_FORMAT.format(EXTRACTED_DIR, course_number)
                with open(output_file, 'w') as f:
                    json.dump(output_courses, f, indent=4)
        except IOError as e:
            print(e)


departments = {}
subject_areas = {}
department_courses = defaultdict(list)
subject_area_courses = defaultdict(list)


def store_course_info(course):
    departments[course['departmentCode']] = course['departmentDescription']
    department_courses[course['departmentCode']].append(course)
    subject_areas[course['subjectAreaCode']] = course['subjectAreaDescription']
    subject_area_courses[course['subjectAreaCode']].append(course)


def run_range(start, end):
    for i in range(start, end):
        try:
            with open(PARSED_OUTPUT_FORMAT.format(i), 'r') as f:
                for c in json.load(f):
                    store_course_info(c)
        except IOError as e:
            print(e)


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        FETCHED_DIR = sys.argv[1]
    if len(sys.argv) > 2:
        EXTRACTED_DIR = sys.argv[2]

    extract_all_course_info()
