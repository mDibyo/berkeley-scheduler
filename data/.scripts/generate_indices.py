#!/usr/bin/env python3

import json


TERM = 'fall-2016'

DEPARTMENTS_DIR = 'intermediate/departments'
CLASS_LISTING_DIR = 'class-listing-{}-by-subject-area'.format(TERM)
INDICES_DIR = 'indices'

DEPARTMENTS_FORMAT = '{}/departments.json'
CLASSES_FORMAT = '{}/{}/{}.json'
INDICES_FORMAT = '{}/{}/{}.json'


chars_to_remove = [' ', '&', ',', '/', '-']


def get_subject_area_code(sac):
    for ch in chars_to_remove:
        sac = sac.replace(ch, '')
    return sac


def generate_2ary_to_1ary_section_id_mapping(classes):
    mapping = {}

    for subject_area in classes:
        for _class in classes[subject_area].values():
            _1ary_section_id = _class['id']
            for section in _class['sections']:
                mapping[section['id']] = _1ary_section_id
    return mapping


def generate_1ary_section_id_to_subject_area_mapping(classes):
    mapping = {}

    for subject_area in classes:
        for course_number, _class in classes[subject_area].items():
            mapping[_class['id']] = [subject_area, course_number]
    return mapping


def main():
    with open(DEPARTMENTS_FORMAT.format(DEPARTMENTS_DIR), 'r') as f:
        subject_areas = json.load(f)['subjectAreas']

    print('retrieving classes')
    classes = {}
    for subject_area in subject_areas:
        sac = get_subject_area_code(subject_area)
        input_file = CLASSES_FORMAT.format(DEPARTMENTS_DIR,
                                           CLASS_LISTING_DIR,
                                           sac)
        with open(input_file, 'r') as f:
            classes[subject_area] = json.load(f)

    print('generating 2ary-to-1ary-section-id index')
    _2ary_to_1ary_section_id = \
        generate_2ary_to_1ary_section_id_mapping(classes)
    output_file = INDICES_FORMAT.format(DEPARTMENTS_DIR,
                                        INDICES_DIR,
                                        '2ary-to-1ary-section-id')
    with open(output_file, 'w') as f:
        json.dump(_2ary_to_1ary_section_id, f)

    print('generating 1ary-section-id-to-subject-area index')
    _1ary_section_id_to_subject_area = \
        generate_1ary_section_id_to_subject_area_mapping(classes)
    output_file = INDICES_FORMAT.format(DEPARTMENTS_DIR,
                                        INDICES_DIR,
                                        '1ary-section-id-to-subject-area')
    with open(output_file, 'w') as f:
        json.dump(_1ary_section_id_to_subject_area, f)


if __name__ == '__main__':
    main()
