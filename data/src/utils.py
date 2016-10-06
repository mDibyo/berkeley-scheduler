#!/usr/bin/env python3

import os.path

TERM = 'fall-2016'
TERM_ABBRV = 'fa16'
TERM_ID = 2172
CLASS_API_URL_FORMAT = 'https://apis.berkeley.edu/sis/v1/classes/sections?{}'

SIS_CLASS_API_APP_ID_ENV = 'SIS_CLASS_API_APP_ID'
SIS_CLASS_API_APP_KEY_ENV = 'SIS_CLASS_API_APP_KEY'
SIS_CLASS_API_APP_ID = SIS_CLASS_API_APP_KEY = None

INTERMEDIATE_DIR = 'intermediate'
DEPARTMENTS_DIR = 'departments'
FETCHED_COURSES_DIR = 'fetched-course-json'
EXTRACTED_COURSES_DIR = 'extracted-course-json'
COURSE_LISTING_BY_SUBJECT_AREA_DIR = 'course-listing-by-subject-area'
COURSE_LISTING_BY_DEPARTMENT_DIR = 'course-listing-by-department'
CLASS_LISTING_DIR_FORMAT = 'class-listing-{}-by-subject-area'
INDICES_DIR = 'indices'
FINAL_DIR = 'final'

JSON_FILE_FORMAT = '{}.json'


CHARS_TO_REMOVE = [' ', '&', ',', '/', '-']


def cleaned_subject_area_code(sac):
    for ch in CHARS_TO_REMOVE:
        sac = sac.replace(ch, '')
    return sac


def fetched_courses(course_number):
    return os.path.join(INTERMEDIATE_DIR, FETCHED_COURSES_DIR, JSON_FILE_FORMAT.format(
        'response.{}'.format(course_number)))


def extracted_courses(course_number):
    return os.path.join(INTERMEDIATE_DIR, EXTRACTED_COURSES_DIR, JSON_FILE_FORMAT.format(
        'response_extracted.{}'.format(course_number)))


def departments():
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        JSON_FILE_FORMAT.format('departments'))


def final_departments():
    return os.path.join(FINAL_DIR, JSON_FILE_FORMAT.format('departments'))


def course_listing_by_department(department):
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        COURSE_LISTING_BY_DEPARTMENT_DIR,
                        JSON_FILE_FORMAT.format(department))


def course_listing_by_subject_area(subject_area):
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        COURSE_LISTING_BY_SUBJECT_AREA_DIR,
                        JSON_FILE_FORMAT.format(subject_area))


def class_listing_by_subject_area(subject_area):
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        CLASS_LISTING_DIR_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def final_class_listing_by_subject_area(subject_area):
    return os.path.join(FINAL_DIR,
                        TERM_ABBRV,
                        'classes',
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def index_2ary_to_1ary_section_id():
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        INDICES_DIR,
                        JSON_FILE_FORMAT.format('2ary-to-1ary-section-id'))


def final_index_2ary_to_1ary_section_id():
    return os.path.join(FINAL_DIR,
                        TERM_ABBRV,
                        'indices',
                        JSON_FILE_FORMAT.format('2ary-to-1ary-section-id'))


def index_1ary_section_id_to_subject_area():
    return os.path.join(INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        INDICES_DIR,
                        JSON_FILE_FORMAT.format('1ary-section-id-to-subject-area'))


def final_index_1ary_section_id_to_subject_area():
    return os.path.join(FINAL_DIR,
                        TERM_ABBRV,
                        'indices',
                        JSON_FILE_FORMAT.format('1ary-section-id-to-subject-area'))
