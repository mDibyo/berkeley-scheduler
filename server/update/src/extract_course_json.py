#!/usr/bin/env python3

import json
import sys

from utils import *


FILE_RANGE = Range(1, 401)


def extract_cs_course_id_from_json(identifiers_json):
    for identifier_json in identifiers_json:
        if identifier_json['type'] == 'cs-course-id':
            return identifier_json['id']
    return None


def extract_course_info_from_json(course_json):
    if 'academicDepartment' in course_json:
        department_info = course_json['academicDepartment']
        college_info = course_json['academicOrganization']
    else:
        department_info = course_json['academicOrganization']
        college_info = course_json['academicGroup']
    final_exam_info = course_json.get('finalExam')

    return {
        'csCourseId': extract_cs_course_id_from_json(course_json['identifiers']),
        'departmentCode': department_info['code'],
        'departmentDescription': department_info['description'],
        'collegeCode': college_info['code'],
        'collegeDescription': college_info['description'],
        'gradingBasis': course_json['gradingBasis']['code'],
        'finalExam': final_exam_info['code'] == 'Y' if final_exam_info else None,
        'subjectAreaCode': course_json['subjectArea']['code'],
        'subjectAreaDescription': course_json['subjectArea']['description'],
        'courseNumber': course_json['catalogNumber']['formatted'],
        'title': course_json['title'],
        'description': course_json.get('description'),
        'proposedInstructors': course_json['proposedInstructors'],
        'units': course_json.get('credit'),
        'preparation': course_json.get('preparation'),
        'crossListedCourses': course_json['crossListing']['courses'] if 'crossListing' in course_json else None
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
        print(course_number)
        output_courses = []
        try:
            chunk_number = 0
            while True:
                print('response.{:03d}.{:02d}.json'.format(course_number, chunk_number))
                with open(fetched_courses(course_number, chunk_number), 'r') as f:
                    output_courses.extend(extract_course_info_from_file(f))

                chunk_number += 1
        except IOError:
            pass

        if output_courses:
            with open(extracted_courses(course_number), 'w') as f:
                json.dump(output_courses, f, indent=4)


if __name__ == '__main__':
    sys.exit(extract_all_course_info())
