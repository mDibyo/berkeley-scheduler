import angular = require('angular');

import {StringMap, TermMap} from "../utils";
import finals from "./finals.service";

import Course , {CourseJson} from "../models/course";
import CourseInstance from "../models/courseInstance";
import Final = require("../models/final");


const departmentsUrl = 'data/departments.json';
const subjectAreaAbbrevsUrl = 'data/abbreviations.json';
const coursesUrlFormat =
    (termAbbrev: string, subjectAreaCode: string) => `data/${termAbbrev}/classes/${subjectAreaCode}.json`;


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
  private coursesQBySubjectAreaByTerm: TermMap<{[subjectArea: string]: angular.IPromise<Course[]>}> =
      new TermMap(() => ({}));

  constructor(
    private $http: angular.IHttpService,
    private $q: angular.IQService,
    private finals: finals
  ) {
    this._subjectAreasQ = this.$q.all([
        this.$http.get(departmentsUrl).then(response => response.data),
        this.$http.get(subjectAreaAbbrevsUrl).then(response => response.data, () => ({}))
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

  getCoursesQBySubjectAreaCode(termAbbrev: string, code: string): angular.IPromise<Course[]> {
    const coursesQBySubjectArea = this.coursesQBySubjectAreaByTerm.get(termAbbrev);
    if (code in coursesQBySubjectArea) {
      return coursesQBySubjectArea[code];
    }

    const alphabetizedCode = courseDiscoveryService.alphabetizeSubjectAreaCode(code);
    const coursesUrl = coursesUrlFormat(termAbbrev, alphabetizedCode);
    const coursesQ = this.$http.get(coursesUrl).then(response => {
      const coursesData = <StringMap<CourseJson>> (response.data || {});
      const finalQs: angular.IPromise<void>[] = [];

      const courses = Object.keys(coursesData)
          .map(displayName => {
            const courseData = coursesData[displayName];

            const course = Course.parse(courseData);
            course.instances.forEach((courseInstance: CourseInstance) => {
              if (courseInstance.hasFinalExam) {
                finalQs.push(
                    this.finals.getFinalMeetingForCourseInstanceQ(termAbbrev, courseInstance).then(
                        (finalMeeting: Final) => courseInstance.setFinalMeeting(finalMeeting)
                    ));
              }
            });

            return course;
          });

      return this.$q.all(finalQs).then(() => courses);
    }, () => []);

    coursesQBySubjectArea[code] = coursesQ;
    return coursesQ;
  }
}

angular.module('berkeleyScheduler').service('courseDiscoveryService', [
    '$http',
    '$q',
    'finals',
    courseDiscoveryService
]);

