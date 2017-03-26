#!/usr/bin/env python3

import json
import sys

from utils import *


def generate_2ary_to_1ary_section_id_mapping(classes):
    mapping = {}

    for subject_area in classes:
        for class_sections in classes[subject_area].values():
            for class_section in class_sections:
                _1ary_section_id = class_section['id']
                for section in class_section['sections']:
                    mapping[section['id']] = _1ary_section_id
    return mapping


def generate_1ary_section_id_to_subject_area_mapping(classes):
    mapping = {}

    for subject_area, subject_area_classes in classes.items():
        for course_number, _class in subject_area_classes.items():
            for class_section in _class:
                mapping[class_section['id']] = [subject_area, course_number, class_section['number']]
    return mapping


def generate_subject_area_to_courses_titles_mapping(classes):
    mapping = {}

    for subject_area, subject_area_classes in classes.items():
        subject_area_mapping = []
        for course_number, _class in subject_area_classes.items():
            instance = _class[0]
            subject_area_mapping.append([instance['id'], course_number, instance['title']])
        mapping[subject_area] = subject_area_mapping
    return mapping


def main():
    with open(departments(), 'r') as f:
        subject_areas = json.load(f)['subjectAreas']

    print('retrieving classes')
    classes = {}
    for subject_area in subject_areas:
        input_file = class_listing_by_subject_area(subject_area)
        with open(input_file, 'r') as f:
            classes[subject_area] = json.load(f)

    print('generating 2ary-to-1ary-section-id index')
    _2ary_to_1ary_section_id = \
        generate_2ary_to_1ary_section_id_mapping(classes)
    with open(index_2ary_to_1ary_section_id(), 'w') as f:
        json.dump(_2ary_to_1ary_section_id, f)

    print('generating 1ary-section-id-to-subject-area index')
    _1ary_section_id_to_subject_area = \
        generate_1ary_section_id_to_subject_area_mapping(classes)
    with open(index_1ary_section_id_to_subject_area(), 'w') as f:
        json.dump(_1ary_section_id_to_subject_area, f)

    print('generating subject-area-to-course-titles index')
    subject_area_to_course_titles = \
        generate_subject_area_to_courses_titles_mapping(classes)
    with open(index_subject_area_to_course_titles(), 'w') as f:
        json.dump(subject_area_to_course_titles, f)

    return 0


if __name__ == '__main__':
    sys.exit(main())
