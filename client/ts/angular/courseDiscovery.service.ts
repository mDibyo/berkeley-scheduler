import angular = require('angular');

import constants = require('../constants');
import IFinalsService = require("./finals.factory");
import Course from "../models/course";
import CourseInstance from "../models/courseInstance";
import Final = require("../models/final");
import {StringMap} from "../utils";
import {CourseJson} from "../models/course";


const departmentsUrl = 'data/departments.json';
const subjectAreaAbbrvsUrl = 'data/abbreviations.json';
const coursesUrlFormat = () => `data/${constants.TERM_ABBREV}/classes/{}.json`;


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


export default class courseDiscoveryService {
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

    const alphabetizedCode = courseDiscoveryService.alphabetizeSubjectAreaCode(code);
    const coursesUrl = coursesUrlFormat().replace('{}', alphabetizedCode);
    const coursesQ = this.$http.get(coursesUrl).then(response => {
      const coursesData = <StringMap<CourseJson>> (response.data || {});
      const finalQs: angular.IPromise<void>[] = [];

      const courses = Object.keys(coursesData)
          .map(displayName => {
            const courseData = coursesData[displayName];

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

angular.module('berkeleyScheduler').service('courseDiscoveryService', [
    '$http',
    '$q',
    'finals',
    courseDiscoveryService
]);

