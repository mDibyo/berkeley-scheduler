#!/usr/bin/env python3

from collections import defaultdict
import json
import sys

from utils import *

department_names = {}
subject_area_names = {}
college_names = {}
department_courses_dict = defaultdict(lambda: defaultdict(dict))
subject_area_courses_dict = defaultdict(lambda: defaultdict(dict))


def update_course(course, course_new):
    for k, new_value in course_new.items():
        old_value = course.get(k, None)
        if not old_value:
            course[k] = new_value


def store_course_info(course):
    course_number = course['courseNumber']

    college_names[course['collegeCode']] = course['collegeDescription']

    department_code = course['departmentCode']
    department_names[department_code] = course['departmentDescription']
    update_course(department_courses_dict[department_code][course_number], course)

    subject_area_code = course['subjectAreaCode']
    subject_area_names[subject_area_code] = course['subjectAreaDescription']
    update_course(subject_area_courses_dict[subject_area_code][course_number], course)


def run_for_range(start, end):
    for course_number in range(start, end):
        try:
            print('extracting course_number {}'.format(course_number))
            with open(extracted_courses(course_number), 'r') as f:
                for c in json.load(f):
                    store_course_info(c)
        except IOError as e:
            print(e)

    # Save out subject areas, departments and colleges.
    with open(departments(), 'w') as f:
        json.dump({
            'subjectAreas': subject_area_names,
            'departments': department_names,
            'colleges': college_names,
        }, f, indent=4)

    # Save out courses.
    for department, courses in department_courses_dict.items():
        with open(course_listing_by_department(department), 'w') as f:
            json.dump(courses, f, indent=4)
    for subject_area, courses in subject_area_courses_dict.items():
        with open(course_listing_by_subject_area(subject_area), 'w') as f:
            json.dump(courses, f, indent=4)

    return 0


if __name__ == '__main__':
    sys.exit(run_for_range(0, 1000))
