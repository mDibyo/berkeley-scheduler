'use strict';

var Course = require('../models/course');

var departmentsUrl = 'data/final/departments.json';
var coursesUrlFormat = 'data/final/fa16/classes/{}.json';

function courses($http) {
  var _coursesQBySubjectArea = {};

  var _subjectAreasQ = $http.get(departmentsUrl).then(function(response) {
    var subjectAreas = response.data.subjectAreas;
    return Object.keys(subjectAreas).map(function(code) {
      return {
        code: code,
        description: subjectAreas[code]
      }
    });
  });

  function getSubjectAreasQ() {
    return _subjectAreasQ;
  }

  function getCoursesQBySubjectAreaCode(code) {
    if (code in _coursesQBySubjectArea) {
      return _coursesQBySubjectArea[code];
    }

    var alphabetizedCode = _alphabetizeSubjectAreaCode(code);
    var coursesUrl = coursesUrlFormat.replace('{}', alphabetizedCode);
    var q = $http.get(coursesUrl).then(function(response) {
      var courses = response.data;
      return Object.keys(courses).map(function(displayName) {
        return Course.parse(courses[displayName]);
      });
    }, function() {
      return [];
    });
    _coursesQBySubjectArea[code] = q;
    return q;
  }

  function _alphabetizeSubjectAreaCode(code) {
    return code.replace(/\W/g, '');
  }

  return {
    getSubjectAreasQ: getSubjectAreasQ,
    getCoursesQBySubjectAreaCode: getCoursesQBySubjectAreaCode
  }
}
angular.module('scheduleBuilder').factory('courses', [
  '$http',
  courses
]);
