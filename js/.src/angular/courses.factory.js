'use strict';

var Course = require('../models/course');

var departmentsUrl = 'data/final/departments.json';
var subjectAreaAbbrvsUrl = 'data/final/abbreviations.json';
var coursesUrlFormat = 'data/final/fa16/classes/{}.json';

function courses($http, $q) {
  var _coursesQBySubjectArea = {};

  var _subjectAreasQ = $q.all([
    $http.get(departmentsUrl),
    $http.get(subjectAreaAbbrvsUrl).then(function(response) {
      return response;
    }, function() {
      return {data: {}};
    })
  ]).then(function(responses) {
    var subjectAreas = responses[0].data.subjectAreas;
    var abbrvs = responses[1].data;
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
angular.module('scheduleBuilder').factory('courses', [
  '$http',
  '$q',
  courses
]);
