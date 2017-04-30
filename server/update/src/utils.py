#!/usr/bin/env python3

import os.path

try:
    from .config import *
except SystemError:
    from config import *


CLASS_API_URL_FORMAT = 'https://apis.berkeley.edu/sis/v1/classes?{}'
CLASS_SECTION_API_URL_FORMAT = 'https://apis.berkeley.edu/sis/v1/classes/sections?{}'
COURSE_API_URL_FORMAT = 'https://apis.berkeley.edu/sis/v1/courses?{}'

SIS_COURSE_API_APP_ID_ENV = 'SIS_COURSE_API_APP_ID'
SIS_COURSE_API_APP_KEY_ENV = 'SIS_COURSE_API_APP_KEY'
SIS_COURSE_API_APP_ID = SIS_COURSE_API_APP_KEY = None
SIS_CLASS_API_APP_ID_ENV = 'SIS_CLASS_API_APP_ID'
SIS_CLASS_API_APP_KEY_ENV = 'SIS_CLASS_API_APP_KEY'
SIS_CLASS_API_APP_ID = SIS_CLASS_API_APP_KEY = None

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
CREDENTIALS_DIR = os.path.abspath(os.path.join(PROJECT_DIR, 'server', '.credentials'))
SERVER_DIR = os.path.abspath(os.path.join(PROJECT_DIR, 'server', 'update'))
DATA_DIR = os.path.join(SERVER_DIR, 'data')

INTERMEDIATE_DIR = 'intermediate'
DEPARTMENTS_DIR = 'departments'
FETCHED_COURSES_DIR = 'fetched-course-json'
EXTRACTED_COURSES_DIR = 'extracted-course-json'
COURSE_LISTING_BY_SUBJECT_AREA_DIR = 'course-listing-by-subject-area'
COURSE_LISTING_BY_DEPARTMENT_DIR = 'course-listing-by-department'
FETCHED_CLASSES_BY_SUBJECT_AREA_FORMAT = 'fetched-class-json-by-subject-area-{}'
FETCHED_CLASS_SECTIONS_BY_SUBJECT_AREA_FORMAT = 'fetched-class-section-json-by-subject-area-{}'
CLASS_LISTING_DIR_FORMAT = 'class-listing-by-subject-area-{}'
INDICES_DIR_FORMAT = 'indices-{}'
FINAL_DIR = 'data'

JSON_FILE_FORMAT = '{}.json'


CHARS_TO_REMOVE = [' ', '&', ',', '/', '-']


def cleaned_subject_area_code(sac):
    for ch in CHARS_TO_REMOVE:
        sac = sac.replace(ch, '')
    return sac


def extract_number_from_class(class_):
    return class_['course']['catalogNumber']['formatted'], class_['number']


def fetched_courses(course_number, chunk_number):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        FETCHED_COURSES_DIR,
                        JSON_FILE_FORMAT.format('response.{:03d}.{:02d}'.format(course_number, chunk_number)))


def extracted_courses(course_number):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        EXTRACTED_COURSES_DIR,
                        JSON_FILE_FORMAT.format('response_extracted.{:03d}'.format(course_number)))


def departments():
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        JSON_FILE_FORMAT.format('departments'))


def final_departments():
    return os.path.join(PROJECT_DIR, FINAL_DIR, JSON_FILE_FORMAT.format('departments'))


def course_listing_by_department(department):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        COURSE_LISTING_BY_DEPARTMENT_DIR,
                        JSON_FILE_FORMAT.format(department))


def course_listing_by_subject_area(subject_area):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        COURSE_LISTING_BY_SUBJECT_AREA_DIR,
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def class_listing_by_subject_area(subject_area):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        CLASS_LISTING_DIR_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def fetched_classes_by_subject_area(subject_area):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        FETCHED_CLASSES_BY_SUBJECT_AREA_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def fetched_classes_by_subject_area_new(subject_area, chunk_number):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        FETCHED_CLASSES_BY_SUBJECT_AREA_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format('{}.{:02d}'.format(cleaned_subject_area_code(subject_area),
                                                                   chunk_number)))


def fetched_class_sections_by_subject_area(subject_area):
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        FETCHED_CLASS_SECTIONS_BY_SUBJECT_AREA_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def final_class_listing_by_subject_area(subject_area):
    return os.path.join(PROJECT_DIR,
                        FINAL_DIR,
                        TERM_ABBRV,
                        'classes',
                        JSON_FILE_FORMAT.format(cleaned_subject_area_code(subject_area)))


def index_2ary_to_1ary_section_id():
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        INDICES_DIR_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format('2ary-to-1ary-section-id'))


def final_index_2ary_to_1ary_section_id():
    return os.path.join(PROJECT_DIR,
                        FINAL_DIR,
                        TERM_ABBRV,
                        'indices',
                        JSON_FILE_FORMAT.format('2ary-to-1ary-section-id'))


def index_1ary_section_id_to_subject_area():
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        INDICES_DIR_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format('1ary-section-id-to-subject-area'))


def final_index_1ary_section_id_to_subject_area():
    return os.path.join(PROJECT_DIR,
                        FINAL_DIR,
                        TERM_ABBRV,
                        'indices',
                        JSON_FILE_FORMAT.format('1ary-section-id-to-subject-area'))


def index_subject_area_to_course_titles():
    return os.path.join(DATA_DIR,
                        INTERMEDIATE_DIR,
                        DEPARTMENTS_DIR,
                        INDICES_DIR_FORMAT.format(TERM),
                        JSON_FILE_FORMAT.format('subject-area-to-course-titles'))


def final_index_subject_area_to_course_titles():
    return os.path.join(PROJECT_DIR,
                        FINAL_DIR,
                        TERM_ABBRV,
                        'indices',
                        JSON_FILE_FORMAT.format('subject-area-to-course-titles'))
