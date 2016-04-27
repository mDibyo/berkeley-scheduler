#!/usr/bin/env python3

from collections import defaultdict
import json


EXTRACTED_COURSES_DIR = 'intermediate/extracted-course-json'
DEPARTMENTS_DIR = 'intermediate/departments'
COURSE_LISTING_BY_DEPARTMENT_DIR = 'course-listing-by-department'
COURSE_LISTING_BY_SUBJECT_AREA_DIR = 'course-listing-by-subject-area'

EXTRACTED_COURSES_FORMAT = '{}/response_extracted.{}.json'
DEPARTMENTS_FORMAT = '{}/departments.json'
COURSES_OUTPUT_FORMAT = '{}/{}/{}.json'

departments = {}
subject_areas = {}
department_courses = defaultdict(list)
subject_area_courses = defaultdict(list)


def store_course_info(course):
    departments[course['departmentCode']] = course['departmentDescription']
    department_courses[course['departmentCode']].append(course)
    subject_areas[course['subjectAreaCode']] = course['subjectAreaDescription']
    subject_area_courses[course['subjectAreaCode']].append(course)


def run_for_range(start, end):
    for course_number in range(start, end):
        try:
            with open(EXTRACTED_COURSES_FORMAT.format(
                    EXTRACTED_COURSES_DIR, course_number), 'r') as f:
                for c in json.load(f):
                    store_course_info(c)
        except IOError as e:
            print(e)

    # Save out departments and subject-areas
    with open(DEPARTMENTS_FORMAT.format(DEPARTMENTS_DIR), 'w') as f:
        json.dump({
            'subjectAreas': subject_areas,
            'departments': departments
        }, f, indent=4)

    # Save out courses
    for department, courses in department_courses.items():
        with open(COURSES_OUTPUT_FORMAT.format(DEPARTMENTS_DIR,
                                               COURSE_LISTING_BY_DEPARTMENT_DIR,
                                               department), 'w') as f:
            json.dump(courses, f, indent=4)
    for subject_area, courses in department_courses.items():
        with open(COURSES_OUTPUT_FORMAT.format(DEPARTMENTS_DIR,
                                               COURSE_LISTING_BY_SUBJECT_AREA_DIR,
                                               subject_area), 'w') as f:
            json.dump(courses, f, indent=4)


if __name__ == '__main__':
    run_for_range(1, 400)
