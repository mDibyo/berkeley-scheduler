import angular = require('angular');

import Course from '../models/course';


interface IReverseLookupService {
  getCourseQBy1arySectionId(id: string): angular.IPromise<Course>;
  getCourseQBy2arySectionId(id: string): angular.IPromise<Course>;
}

export = IReverseLookupService;
