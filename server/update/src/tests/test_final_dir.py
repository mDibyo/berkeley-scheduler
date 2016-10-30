#!/usr/bin/env python3

import json
import os.path
import unittest

from ..utils import *


class TestDepartments(unittest.TestCase):
    def setUp(self):
        with open(final_departments(), 'r') as f:
            self.departments_json = json.load(f)

    def test_departments(self):
        self.assertIn('departments', self.departments_json)
        self.assertNotEqual(len(self.departments_json['departments']), 0)

    def test_subject_areas(self):
        self.assertIn('subjectAreas', self.departments_json)
        self.assertNotEqual(len(self.departments_json['subjectAreas']), 0)


class TestCourses(unittest.TestCase):
    expected_num_failing = 70

    def setUp(self):
        with open(final_departments(), 'r') as f:
            self.departments_json = json.load(f)

    def test_courses(self):
        subject_areas = self.departments_json['subjectAreas']
        num_failing_subject_areas = 0
        for subject_area in subject_areas:
            listing = final_class_listing_by_subject_area(subject_area)
            with self.subTest(subject_area=subject_area, listing=listing):
                listing = final_class_listing_by_subject_area(subject_area)
                self.assertTrue(os.path.exists(listing))
                with open(listing, 'r') as f:
                    classes = json.load(f)
                    if not len(classes):
                        num_failing_subject_areas += 1
        self.assertLessEqual(num_failing_subject_areas, self.expected_num_failing)


class TestIndices(unittest.TestCase):
    def _test_index(self, index):
        self.assertTrue(os.path.exists(index))
        with open(index, 'r') as f:
            self.assertNotEqual(len(json.load(f)), 0, 'no index found')

    def test_index_2ary_to_1ary_section_id(self):
        self._test_index(final_index_2ary_to_1ary_section_id())

    def test_index_1ary_section_id_to_subject_area(self):
        self._test_index(final_index_1ary_section_id_to_subject_area())


if __name__ == '__main__':
    unittest.main()
