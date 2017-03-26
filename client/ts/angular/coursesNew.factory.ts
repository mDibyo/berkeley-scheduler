import angular = require('angular');

import constants = require('../constants');
import IFinalsService = require("./finals.factory");
import Course from "../models/course";
import CourseInstance from "../models/courseInstance";
import Final = require("../models/final");
import {StringMap} from "../utils";
import {CourseJson} from "../models/course";
import {CourseInstanceJson} from "../models/courseInstance";


const departmentsUrl = 'data/departments.json';
const subjectAreaAbbrvsUrl = 'data/abbreviations.json';
const coursesUrlFormat = `data/${constants.TERM_ABBREV}/classes/{}.json`;


export interface DepartmentsInfo {
  colleges: StringMap<string>;
  departments: StringMap<string>;
  subjectAreas: StringMap<string>;
}

export interface SubjectAreasInfo {
  code: string;
  description: string;
  abbreviations: string[];
}


export default class courses {
  private _subjectAreasQ: angular.IPromise<SubjectAreasInfo[]>;
  private coursesQBySubjectArea: {[subjectArea: string]: angular.IPromise<Course[]>} = {};

  constructor(
    private $http: angular.IHttpService,
    private $q: angular.IQService,
    private finals: IFinalsService
  ) {
    this._subjectAreasQ = this.$q.all([
        this.$http.get(departmentsUrl).then(response => response.data),
        this.$http.get(subjectAreaAbbrvsUrl).then(response => response.data, () => {})
    ]).then(([departmentsJson, abbrevs]: [DepartmentsInfo, StringMap<string[]>]) => {
      const subjectAreas = departmentsJson.subjectAreas;
      return Object.keys(subjectAreas).map(code => ({
        code,
        description: subjectAreas[code],
        abbreviations: code in abbrevs ? abbrevs[code] : []
      }));
    });
  }

  getSubjectAreasQ() {
    return this._subjectAreasQ;
  }

  private static alphabetizeSubjectAreaCode(code: string) {
    return code.replace(/\W/g, '');
  }

  getCoursesQBySubjectAreaCode(code: string): angular.IPromise<Course[]> {
    if (code in this.coursesQBySubjectArea) {
      return this.coursesQBySubjectArea[code];
    }

    const alphabetizedCode = courses.alphabetizeSubjectAreaCode(code);
    const coursesUrl = coursesUrlFormat.replace('{}', alphabetizedCode);
    const coursesQ = this.$http.get(coursesUrl).then(response => {
      const coursesData = <StringMap<CourseJson>> (response.data || {});
      const finalQs: angular.IPromise<void>[] = [];

      const courses = Object.keys(coursesData)
          .map(displayName => {
            return coursesData[displayName]
                .filter((c: CourseInstanceJson) => c.print)
                .map((c: CourseInstanceJson) => {
                  c.sections = c.sections.filter(section => section.print);
                  return c;
                });
          })
          .filter(courseData => courseData.length > 0)
          .map(courseData => {
            const course = Course.parse(courseData);
            course.instances.forEach((courseInstance: CourseInstance) => {
              if (courseInstance.hasFinalExam) {
                finalQs.push(this.finals.getFinalMeetingForCourseInstanceQ(courseInstance).then(
                    (finalMeeting: Final) => courseInstance.setFinalMeeting(finalMeeting)
                ));
              }
            });

            return course;
          });

      return this.$q.all(finalQs).then(() => courses);
    }, () => []);

    this.coursesQBySubjectArea[code] = coursesQ;
    return coursesQ;
  }
}

angular.module('berkeleyScheduler').service('courses', [
    '$http',
    '$q',
    'finals',
    courses
]);

