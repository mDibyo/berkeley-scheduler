#!/usr/bin/env python3

import json
from collections import namedtuple
import sys

from utils import *


Range = namedtuple('Range', ['start', 'end'])
FILE_RANGE = Range(1, 400)


def extract_course_info_from_json(course_json):
    return {
        'departmentCode': course_json['academicDepartment']['code'],
        'departmentDescription': course_json['academicDepartment']['description'],
        'subjectAreaCode': course_json['subjectArea']['code'],
        'subjectAreaDescription': course_json['subjectArea']['description'],
        'courseNumber': course_json['catalogNumber']['formatted'],
        'title': course_json['title'],
        'description': course_json['description'],
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
        try:
            with open(fetched_courses(course_number), 'r') as f:
                output_courses = extract_course_info_from_file(f)
            if output_courses:
                with open(extracted_courses(course_number), 'w') as f:
                    json.dump(output_courses, f, indent=4)
        except IOError as e:
            print(e)
    return 0


if __name__ == '__main__':
    sys.exit(extract_all_course_info())
