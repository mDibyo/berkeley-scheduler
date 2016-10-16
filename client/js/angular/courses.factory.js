'use strict';

var constants = require('../constants');
var Course = require('../models/course');

var departmentsUrl = 'data/departments.json';
var subjectAreaAbbrvsUrl = 'data/abbreviations.json';
var coursesUrlFormat = 'data/' + constants.TERM_ABBREV + '/classes/{}.json';

function courses($http, $q, finals) {
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
    var coursesQ = $http.get(coursesUrl).then(function(response) {
      var coursesData = response.data;
      var finalQs = [];

      var courses = Object.keys(coursesData).filter(function(displayName) {
        return coursesData[displayName].printInScheduleOfClasses;
      }).map(function(displayName) {
        var courseData = coursesData[displayName];
        courseData.sections = courseData.sections.filter(function(sectionData) {
          return sectionData.printInScheduleOfClasses;
        });
        var course = Course.parse(courseData);
        finalQs.push(finals.getFinalMeetingForCourseQ(course).then(function(final) {
          course.setFinalMeeting(final);
        }));
        return course;
      });

      return $q.all(finalQs).then(function() {
        return courses;
      });
    }, function() {
      return [];
    });
    _coursesQBySubjectArea[code] = coursesQ;
    return coursesQ;
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
  'finals',
  courses
]);
