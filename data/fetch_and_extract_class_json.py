import json


TERM = 'fall-2016'
TERM_ID = 2168

DEPARTMENTS_DIR = 'departments'
COURSE_LISTING_DIR = 'course-listing-by-subject-area'
CLASS_LISTING_DIR = 'class-listing-{}-by-subject-area'.format(TERM)

DEPARTMENTS_FORMAT = '{}/departments.json'
COURSES_FORMAT = '{}/{}/{}.json'
CLASSES_FORMAT = '{}/{}/{}.json'


def extract_section_info_from_json(section_json):
    assert len(section_json['meeting']) == 1
    return {
        "number": section_json['class']['number'],
        "primary": section_json['association']['primary'],
        "type": section_json['component']['code'],
        "id": section_json['id'],
        "location": section_json['meeting']['location'],
        "instructor": section_json['meeting']['name'],
        "time": {
            'startTime': section_json['meeting'][0]['startTime'],
            'endTime': section_json['meeting'][0]['endTime'],
            'days': section_json['meeting'][0]['meetingDays']
        },
        "enrollCapacity": section_json['enrollmentStatus']['maxEnroll'],
        "enrolled": section_json['enrollmentStatus']['enrolledCount'],
        "waitlistCapacity": section_json['enrollmentStatus']['maxWaitlist'],
        "waitlisted": section_json['enrollmentStatus']['waitlistedCount'],
        'printInScheduleOfClasses': section_json['printInScheduleOfClasses']
    }


def extract_class_info_from_json(sections_json):
    if not sections_json:
        return None

    extracted_class = sections_json[0]['class']

    extracted_sections = {}
    for section_json in sections_json:
        section = extract_section_info_from_json(section_json)
        extracted_sections[section['id']] = section

    if not extracted_sections:
        return None

    primary_section_id = sections_json[0]['association']['primaryAssociatedSectionId']
    primary_section = extracted_sections[primary_section_id]

    return {
        "displayName": extracted_class['course']['displayName'],
        "title": extracted_class['course']['title'],
        "instructor": primary_section['instructor'],
        "id": primary_section['id'],
        "units": -1,
        "sections": extracted_sections
    }


def main():
    with open(DEPARTMENTS_FORMAT.format(DEPARTMENTS_DIR), 'r') as f:
        subject_areas = json.load(f)['subjectAreas']

    for subject_area in subject_areas:
        input_file = COURSES_FORMAT.format(DEPARTMENTS_DIR, COURSE_LISTING_DIR, subject_area)
        with open(input_file, 'r') as f:
            courses = json.load(f)

        classes = []
        for course in courses:
            # TODO: Make request to API
            response = []
            if response['apiResponse']['httpStatus']['code'] == '200':
                sections_json = response['apiResponse']['response']['classSections']['classSection']
                classes.append(extract_class_info_from_json(sections_json))

        output_file = CLASSES_FORMAT.format(DEPARTMENTS_DIR, CLASS_LISTING_DIR, subject_area)
        with open(output_file, 'w') as f:
            json.dump(classes, f)
