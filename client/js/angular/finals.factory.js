'use strict';

var constants = require('../constants');
var Final = require('../models/final');
var Meeting = require('../models/meeting');

var foreignLanguageListingUrl = 'data/foreignLanguageListing.json';
var finalMeetingsUrl = 'data/' + constants.TERM_ABBREV + '/finals/meetings.json';
var finalRulesUrl = 'data/' + constants.TERM_ABBREV + '/finals/rules.json';

function finals($http, $q) {
  var finalsByCourseId = {};

  var _finalMeetingsQ = $http.get(finalMeetingsUrl).then(function(response) {
    var finalMeetings = response.data;
    Object.keys(finalMeetings).forEach(function(meetingKey) {
      finalMeetings[meetingKey] = Meeting.parse(finalMeetings[meetingKey]);
    });
    return finalMeetings;
  }, function() {
    console.error('could not retrieve foreign language listing.');
    return {};
  });

  var _finalRulesQ = $http.get(finalRulesUrl).then(function(response) {
    return response.data;
  }, function() {
    console.error('could not retrieve foreign language listing.');
    return {};
  });

  var _foreignLanguagesListingQ
      = $http.get(foreignLanguageListingUrl).then(function(response) {
    return response.data;
  }, function() {
    console.error('could not retrieve foreign language listing.');
    return {};
  });

  var _finalRulesAllQ = $q.all([
    _finalRulesQ,
    _foreignLanguagesListingQ
  ]).then(function(results) {
    var finalRulesAll = results[0];
    finalRulesAll.foreignLanguageCourses = results[1];
    return finalRulesAll;
  });

  function getFinalMeetingQ(meetingKey) {
    return _finalMeetingsQ.then(function(meetings) {
      return meetings[meetingKey] || null;
    });
  }

  function getFinalQ(course, meetingKey) {
    return getFinalMeetingQ(meetingKey).then(function(finalMeeting) {
      return new Final(course, finalMeeting);
    })
  }

  function getFinalMeetingForCourseQ(course) {
    if (finalsByCourseId.hasOwnProperty(course.id)) {
      return $q.when(finalsByCourseId[course.id]);
    }

    return _finalRulesAllQ.then(function(finalRulesAll) {
      var department = course.department;
      var courseNumber = course.courseNumber;

      // exceptions.
      var exceptions = finalRulesAll.exceptions;
      if (exceptions.hasOwnProperty(department)) {
        if (exceptions[department].hasOwnProperty(courseNumber)) {
          return exceptions[department][courseNumber];
        }
      }

      // foreign language.
      var flCourses = finalRulesAll.foreignLanguageCourses;
      if (flCourses.hasOwnProperty(department)) {
        if (flCourses[department].hasOwnProperty(courseNumber)) {
          return finalRulesAll.foreignLaunguageListing;
        }
      }

      if (!course.meetings.length) {
        return null;
      }

      var courseDays = course.meetings[0].days;
      if (courseDays['Saturday'] || courseDays['Sunday']) {
        return finalRulesAll.SatSunCourses;
      } else if (courseDays['Monday'] ||
                 courseDays['Wednesday'] ||
                 courseDays['Friday']) {
        return finalRulesAll.MTWRFCourses[course.meetings[0].startTime.hours];
      } else if (courseDays['Tuesday'] || courseDays['Thursday']) {
        return finalRulesAll.TRCourses[course.meetings[0].startTime.hours];
      }
    }).then(function(meetingKey) {
      return getFinalQ(course, meetingKey);
    }).then(function(final) {
      finalsByCourseId[course.id] = final;
      return final;
    })
  }

  return {
    getFinalMeetingForCourseQ: getFinalMeetingForCourseQ
  };
}
angular.module('berkeleyScheduler').factory('finals', [
  '$http',
  '$q',
  finals
]);
