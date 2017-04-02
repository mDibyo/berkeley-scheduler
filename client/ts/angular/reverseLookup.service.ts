import angular = require('angular');

import * as constants from '../constants';
import courseDiscoveryService from "./courseDiscovery.service";
import Course from "../models/course";

const indicesUrlFormat = 'data/' + constants.TERM_ABBREV + '/indices/{}.json';
const _2aryTo1arySectionIdIndexUrl =
    indicesUrlFormat.replace('{}', '2ary-to-1ary-section-id');
const _1arySectionIdToSubjectAreaIndexUrl =
    indicesUrlFormat.replace('{}', '1ary-section-id-to-subject-area');
const subjectAreaToCourseTitlesIndexUrl =
    indicesUrlFormat.replace('{}', 'subject-area-to-course-titles');

export default class reverseLookup {
  private coursesCache: {[id: string]: Course} = {};

  private _2aryTo1arySectionIdIndexQ: angular.IPromise<{[_2aryId: string]: string}>;
  private _1arySectionIdToSubjectAreaIndexQ: angular.IPromise<{[_1aryId: string]: string}>;
  private subjectAreaToCourseTitlesIndexQ: angular.IPromise<{[sac: string]: [string, string, string][]}>;

  constructor(
      private $http: angular.IHttpService,
      private $q: angular.IQService,
      private courseDiscoveryService: courseDiscoveryService
  ) {
    this._2aryTo1arySectionIdIndexQ =
        $http.get(_2aryTo1arySectionIdIndexUrl).then(response => response.data);
    this._1arySectionIdToSubjectAreaIndexQ =
        $http.get(_1arySectionIdToSubjectAreaIndexUrl).then(response => response.data);
    this.subjectAreaToCourseTitlesIndexQ =
        $http.get(subjectAreaToCourseTitlesIndexUrl).then(response => response.data);
  }

  getCourseQBy1arySectionId(id: string): angular.IPromise<Course> {
    if (id in this.coursesCache) {
      return this.$q.when(this.coursesCache[id]);
    }

    return this._1arySectionIdToSubjectAreaIndexQ.then(index => {
      const subjectAreaInfo = index[id];
      return this.courseDiscoveryService.getCoursesQBySubjectAreaCode(
          constants.TERM_ABBREV,
          subjectAreaInfo[0]
      ).then(courseList => {
        const courseNumber = subjectAreaInfo[1];
        for (let i = 0; i < courseList.length; i++) {
          if (courseList[i].courseNumber === courseNumber) {
            const course = courseList[i];
            this.coursesCache[id] = course;
            return course;
          }
        }
        return this.$q.reject();
      });
    });
  }

  getCourseQBy2arySectionId(id: string) {
    if (id in this.coursesCache) {
      return this.$q.when(this.coursesCache[id]);
    }
    return this._2aryTo1arySectionIdIndexQ
        .then(index => index[id])
        .then(id => this.getCourseQBy1arySectionId(id));
  }

  getCourseTitlesQBySubjectAreaCode(subjectAreaCode: string) {
    return this.subjectAreaToCourseTitlesIndexQ.then(
        index => index[subjectAreaCode]
            .map(([id, courseNumber, title]) => ({id, courseNumber, title}))
            .filter(courseTitle => courseTitle.id)
    );
  }
}
angular.module('berkeleyScheduler').service('reverseLookup', [
  '$http',
  '$q',
  'courseDiscoveryService',
  reverseLookup
]);
