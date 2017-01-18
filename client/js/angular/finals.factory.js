'use strict';

var constants = require('../constants');
var Final = require('../models/final');
var Meeting = require('../models/meeting').default;

var foreignLanguageListingUrl = 'data/foreignLanguageListing.json';
var finalTimesUrl = 'data/' + constants.TERM_ABBREV + '/finals/times.json';
var finalRulesUrl = 'data/' + constants.TERM_ABBREV + '/finals/rules.json';

function finals($http, $q) {
  var finalsByCourseInstanceId = {};

  var _finalTimesQ = $http.get(finalTimesUrl).then(function(response) {
    return response.data;
  }, function() {
    console.error('could not retrieve foreign language listing.');
    return {};
  });
  var finalDatesQ = _finalTimesQ.then(function(times) {
    var finalDates = times.dates || {};
    Object.keys(finalDates).forEach(function(day) {
      var date = finalDates[day];
      finalDates[day] = new Date(date.year, date.month, date.day);
    });
    return finalDates;
  });
  var _finalMeetingsQ = _finalTimesQ.then(function(times) {
    var finalMeetings = times.meetings || {};
    Object.keys(finalMeetings).forEach(function(meetingKey) {
      finalMeetings[meetingKey] = Meeting.parse(finalMeetings[meetingKey]);
    });
    return finalMeetings;
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

  function getFinalQ(courseInstance, meetingKey) {
    return getFinalMeetingQ(meetingKey).then(function(finalMeeting) {
      return new Final(courseInstance, finalMeeting);
    })
  }

  function getFinalMeetingForCourseInstanceQ(courseInstance) {
    if (finalsByCourseInstanceId.hasOwnProperty(courseInstance.id)) {
      return $q.when(finalsByCourseInstanceId[courseInstance.id]);
    }

    return _finalRulesAllQ.then(function(finalRulesAll) {
      var department = courseInstance.course.department;
      var courseNumber = courseInstance.course.courseNumber;

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

      if (!courseInstance.primarySection.meetings.length) {
        return null;
      }

      // TODO(dibyo): Handle multiple primary sections for courses
      var courseMeeting = courseInstance.primarySection.meetings[0];
      var courseDays = courseMeeting.days;
      if (courseDays.Saturday || courseDays.Sunday) {
        return finalRulesAll.SatSunCourses;
      } else if (courseDays.Monday ||
                 courseDays.Wednesday ||
                 courseDays.Friday) {
        return finalRulesAll.MTWRFCourses[courseMeeting.startTime.hours];
      } else if (courseDays.Tuesday || courseDays.Thursday) {
        return finalRulesAll.TRCourses[courseMeeting.startTime.hours];
      }
    }).then(function(meetingKey) {
      return getFinalQ(courseInstance, meetingKey);
    }).then(function(final) {
      finalsByCourseInstanceId[courseInstance.id] = final;
      return final;
    })
  }

  return {
    finalDatesQ: finalDatesQ,
    getFinalMeetingForCourseInstanceQ: getFinalMeetingForCourseInstanceQ
  };
}
angular.module('berkeleyScheduler').factory('finals', [
  '$http',
  '$q',
  finals
]);
