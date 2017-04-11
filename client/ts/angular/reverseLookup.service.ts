import angular = require('angular');

import courseDiscoveryService from "./courseDiscovery.service";
import Course from "../models/course";
import {BaseService, StringMap, TermMap} from "../utils";
import {DEFAULT_TERM_ABBREV} from "../constants";


type CourseTitleJson = [string, string, string]

export interface CourseTitleInfo {
  id: string;
  courseNumber: string;
  title: string;
}

const indicesUrlFormat = (termAbbrev: string, index: string) =>
    `data/${termAbbrev}/indices/${index}.json`;
const _2aryTo1arySectionIdIndexUrl = (termAbbrev: string) =>
    indicesUrlFormat(termAbbrev, '2ary-to-1ary-section-id');
const _1arySectionIdToSubjectAreaIndexUrl = (termAbbrev: string) =>
    indicesUrlFormat(termAbbrev, '1ary-section-id-to-subject-area');
const subjectAreaToCourseTitlesIndexUrl = (termAbbrev: string) =>
    indicesUrlFormat(termAbbrev, 'subject-area-to-course-titles');

export default class reverseLookup extends BaseService {
  constructor(
      $http: angular.IHttpService,
      private $q: angular.IQService,
      private courseDiscoveryService: courseDiscoveryService
  ) {
    super($http);

    // Get defaults
    this._2aryTo1arySectionIdIndexQByTerm.get(DEFAULT_TERM_ABBREV);
    this._1arySectionIdToSubjectAreaIndexQByTerm.get(DEFAULT_TERM_ABBREV);
    this.subjectAreaToCourseTitlesIndexQByTerm.get(DEFAULT_TERM_ABBREV);
  }

  private coursesCacheByTerm: TermMap<StringMap<Course>> = new TermMap(() => ({}));

  private _2aryTo1arySectionIdIndexQByTerm: TermMap<angular.IPromise<StringMap<string>>> =
      new TermMap(termAbbrev =>
          this.httpGet('2ary to 1ary section id index', _2aryTo1arySectionIdIndexUrl(termAbbrev))
      );

  private _1arySectionIdToSubjectAreaIndexQByTerm: TermMap<angular.IPromise<StringMap<string>>> =
      new TermMap(termAbbrev =>
          this.httpGet('1ary section id to subject area', _1arySectionIdToSubjectAreaIndexUrl(termAbbrev))
      );

  private subjectAreaToCourseTitlesIndexQByTerm: TermMap<angular.IPromise<StringMap<CourseTitleJson[]>>> =
      new TermMap(termAbbrev =>
          this.httpGet('subject area to course titles', subjectAreaToCourseTitlesIndexUrl(termAbbrev))
      );

  getCourseQBy1arySectionId(termAbbrev: string, id: string): angular.IPromise<Course> {
    const coursesCache = this.coursesCacheByTerm.get(termAbbrev);
    if (id in coursesCache) {
      return this.$q.when(coursesCache[id]);
    }

    return this._1arySectionIdToSubjectAreaIndexQByTerm
        .get(termAbbrev)
        .then(index => {
          const subjectAreaInfo = index[id];
          return this.courseDiscoveryService
              .getCoursesQBySubjectAreaCode(termAbbrev, subjectAreaInfo[0])
              .then(courseList => {
                const courseNumber = subjectAreaInfo[1];
                for (let i = 0; i < courseList.length; i++) {
                  if (courseList[i].courseNumber === courseNumber) {
                    const course = courseList[i];
                    coursesCache[id] = course;
                    return course;
                  }
                }
                return this.$q.reject();
              });
        });
  }

  getCourseQBy2arySectionId(termAbbrev: string, id: string) {
    const coursesCache = this.coursesCacheByTerm.get(termAbbrev);
    if (id in coursesCache) {
      return this.$q.when(coursesCache[id]);
    }

    return this._2aryTo1arySectionIdIndexQByTerm
        .get(termAbbrev)
        .then(index => index[id])
        .then(id => this.getCourseQBy1arySectionId(termAbbrev, id));
  }

  getCourseTitlesQBySubjectAreaCode(
      termAbbrev: string,
      subjectAreaCode: string
  ): angular.IPromise<CourseTitleInfo[]> {
    return this.subjectAreaToCourseTitlesIndexQByTerm
        .get(termAbbrev)
        .then(index => index[subjectAreaCode]
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
