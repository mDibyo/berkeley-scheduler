'use strict';

var constants = require('../constants');
var Course = require('../models/course');

var departmentsUrl = 'data/departments.json';
var subjectAreaAbbrvsUrl = 'data/abbreviations.json';
var coursesUrlFormat = 'data/' + constants.TERM_ABBREV + '/classes/{}.json';

function courses($http, $q) {
  var _coursesQBySubjectArea = {};

  var _subjectAreasQ = $q.all([
    $http.get(departmentsUrl).then(function(response) {
      return response.data;
    }),
    $http.get(subjectAreaAbbrvsUrl).then(function(response) {
      return response.data;
    }, function() {
      return {};
    })
  ]).then(function(results) {
    var subjectAreas = results[0].subjectAreas;
    var abbrvs = results[1];
    return Object.keys(subjectAreas).map(function(code) {
      return {
        code: code,
        description: subjectAreas[code],
        abbreviations: code in abbrvs ? abbrvs[code] : []
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
angular.module('berkeleyScheduler').factory('courses', [
  '$http',
  '$q',
  courses
]);
