#!/usr/bin/env python3

import bs4
from bs4 import BeautifulSoup
from collections import defaultdict


def get_table_tbody(soup):
    return soup.body.table.tbody.contents


def extract_course_from_tr(tr):
    tds = tr.find_all('td')
    if tds[0].a is None:
        return None
    return {
        'courseNumber': tds[0].a.string,
        'title': tds[1].string
    }


def extract_courses_from_soup(soup):
    tbody = get_table_tbody(soup)
    courses = []
    for tr in tbody:
        if type(tr) == bs4.element.Tag:
            course = extract_course_from_tr(tr)
            if course is not None:
                courses.append(course)
    return courses


def main(document):
    soup = BeautifulSoup(document)
    courses = extract_courses_from_soup(soup)
    filtered_courses = filter(lambda c: c['title'].startswith('Elementary'),
                              courses)
    course_numbers = [c['courseNumber'].replace(u'\xa0', ' ')
                      for c in filtered_courses]

    subject_areas = defaultdict(list)
    for cn in course_numbers:
        sa, n = cn.split(' ')
        subject_areas[sa].append(n)
    return subject_areas
