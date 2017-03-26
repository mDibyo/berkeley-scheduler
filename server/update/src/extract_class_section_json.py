#!/usr/bin/env python3

from collections import defaultdict
import json
import sys

from utils import *


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
        'sT': meeting_json.get('startTime', None),
        'eT': meeting_json.get('endTime', None),
        'days': {
            'Su': meeting_json.get('meetsSunday', None),
            'Mo': meeting_json.get('meetsMonday', None),
            'Tu': meeting_json.get('meetsTuesday', None),
            'We': meeting_json.get('meetsWednesday', None),
            'Th': meeting_json.get('meetsThursday', None),
            'Fr': meeting_json.get('meetsFriday', None),
            'Sa': meeting_json.get('meetsSaturday', None),
        },
        'dayAbbrevs': meeting_json.get('meetsDays', None),
        'loc': meeting_json.get('location', {}),
        'instructors': extracted_instructors,
    }


def extract_enrollment_info_from_json(enrollment_json):
    return {
        'eCurr': enrollment_json['enrolledCount'],
        'eMin': enrollment_json['minEnroll'],
        'eMax': enrollment_json['maxEnroll'],
        'wCurr': enrollment_json['waitlistedCount'],
        'wMax': enrollment_json['maxWaitlist']
    }


def extract_section_info_from_json(section_json):
    extracted_meetings = [extract_meeting_info_from_json(meeting_json)
                          for meeting_json in section_json.get('meetings', [])]

    return {
        'number': section_json.get('number', ''),
        'isPri': section_json['association']['primary'],
        'assocPriSecId': section_json['association']['primaryAssociatedSectionId'],
        'type': section_json['component']['code'],
        'id': section_json['id'],
        'meetings': extracted_meetings,
        'graded': section_json['graded'],
        'status': section_json['enrollmentStatus']['status'],
        'enrollment': extract_enrollment_info_from_json(section_json['enrollmentStatus']),
    }


def extract_units_info_from_json(units_json):
    return {
        'minimum': units_json['minimum'],
        'maximum': units_json['maximum']
    }


def extract_class_info_from_json(sections_json, class_json, course_json):
    extracted_sections = {}
    for section_json in sections_json:
        section = extract_section_info_from_json(section_json)
        extracted_sections[section['id']] = section

    primary_section_id = sections_json[0]['association']['primaryAssociatedSectionId']

    return {
        # Course info
        'sAC': course_json['subjectAreaCode'],
        'cN': course_json['courseNumber'],
        'title': course_json['title'],
        "description": course_json['description'],
        "crossListed": course_json['crossListedCourses'],

        # Class info
        'id': primary_section_id,
        'number': class_json['number'],
        'priComp': class_json['primaryComponent']['code'],
        'status': class_json['status']['code'],
        'instructionMode': class_json['instructionMode']['code'],
        'fExam': class_json['finalExam'],
        'units': extract_units_info_from_json(class_json['allowedUnits']),
        'grading': class_json['gradingBasis']['code'],
        'enrollment': extract_enrollment_info_from_json(class_json['aggregateEnrollmentStatus']),
        'sections': list(extracted_sections.values())
    }


def extract_course_info_from_class_json(class_json):
    class_course_json = class_json['course']

    return {
        'subjectAreaCode': class_course_json['subjectArea']['code'],
        'courseNumber': class_course_json['catalogNumber']['formatted'],
        'title': class_course_json['title'],
        "description": class_course_json.get('description'),
        "crossListedCourses": class_course_json.get('crossListedCourses'),
    }


def main():
    with open(departments(), 'r') as f:
        subject_areas = sorted(json.load(f)['subjectAreas'].keys())

    completed = set()
    num_total = len(subject_areas)

    for subject_area in subject_areas:
        if subject_area in completed:
            continue

        # Courses
        with open(course_listing_by_subject_area(subject_area)) as f:
            courses_json = json.load(f)

        # Classes
        classes_json = defaultdict(dict)
        try:
            chunk_number = 0
            while True:
                with open(fetched_classes_by_subject_area_new(subject_area, chunk_number)) as f:
                    for class_ in json.load(f)['apiResponse']['response']['classes']:
                        catalog_number, section_number = extract_number_from_class(class_)
                        if not class_['anyPrintInScheduleOfClasses']:
                            continue
                        classes_json[catalog_number][section_number] = class_

                chunk_number += 1
        except IOError:
            pass

        # Sections
        all_sections_json = defaultdict(lambda: defaultdict(list))
        with open(fetched_class_sections_by_subject_area(subject_area)) as f:
            for catalog_number, sections in json.load(f).items():
                for section in sections['apiResponse']['response']['classSections']:
                    if not section['printInScheduleOfClasses']:
                        continue
                    all_sections_json[catalog_number][section['class'].get('number', '001')].append(section)

        # Extraction
        classes = defaultdict(list)
        for catalog_number, class_sections in all_sections_json.items():
            for section_number, sections_json in class_sections.items():
                try:
                    class_json = classes_json[catalog_number][section_number]
                except KeyError:
                    print('no class: {} {}-{}'.format(subject_area, catalog_number, section_number))
                    continue
                try:
                    course_json = courses_json[catalog_number]
                except KeyError:
                    print('no course: {} {}-{}'.format(subject_area, catalog_number, section_number))
                    course_json = extract_course_info_from_class_json(class_json)

                classes[catalog_number].append(
                    extract_class_info_from_json(sections_json, class_json, course_json))

        with open(class_listing_by_subject_area(subject_area), 'w') as f:
            json.dump(classes, f)
        completed.add(subject_area)
        print('completed {}/{}'.format(len(completed), num_total))


if __name__ == '__main__':
    sys.exit(main())
