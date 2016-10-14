'use strict';

var constants = require('../constants');

var indicesUrlFormat = 'data/' + constants.TERM_ABBREV + '/indices/{}.json';
var _2aryTo1arySectionIdIndexUrl =
  indicesUrlFormat.replace('{}', '2ary-to-1ary-section-id');
var _1arySectionIdToSubjectAreaIndexUrl =
  indicesUrlFormat.replace('{}', '1ary-section-id-to-subject-area');

function reverseLookup($http, $q, courses) {
  var _coursesCache = {};

  var _2aryTo1arySectionIdIndexQ =
    $http.get(_2aryTo1arySectionIdIndexUrl).then(function(response) {
      return response.data;
    });

  var _1arySectionIdToSubjectAreaIndexQ =
    $http.get(_1arySectionIdToSubjectAreaIndexUrl).then(function(response) {
      return response.data;
    });

  function getCourseQBy1arySectionId(id) {
    if (id in _coursesCache) {
      var deferred = $q.defer();
      deferred.resolve(_coursesCache[id]);
      return deferred.promise;
    }
    return _1arySectionIdToSubjectAreaIndexQ.then(function(index) {
      return index[id];
    }).then(function(subjectAreaInfo) {
      return courses.getCoursesQBySubjectAreaCode(subjectAreaInfo[0])
        .then(function(courseList) {
          var courseNumber = subjectAreaInfo[1];
          for (var i = 0; i < courseList.length; i++) {
            if (courseList[i].courseNumber === courseNumber) {
              var course = courseList[i];
              _coursesCache[id] = course;
              return course;
            }
          }
          return $q.reject();
        });
    });
  }

  function getCourseQBy2arySectionId(id) {
    if (id in _coursesCache) {
      return $q.when(_coursesCache[id]);
    }
    return _2aryTo1arySectionIdIndexQ.then(function(index) {
      return index[id];
    }).then(getCourseQBy1arySectionId);
  }

  return {
    getCourseQBy1arySectionId: getCourseQBy1arySectionId,
    getCourseQBy2arySectionId: getCourseQBy2arySectionId
  }
}
angular.module('berkeleyScheduler').factory('reverseLookup', [
  '$http',
  '$q',
  'courses',
  reverseLookup
]);
