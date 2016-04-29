'use strict';

var Meeting = require('./meeting');
var Time = require('./time');

function Final(course) {
  this.course = course;

  this.meeting = Final.getSubjectCourseToFinalSection(course);
  if (!this.meeting && course.meeting) {
    var courseDays = course.meeting.days;
    if (courseDays['Saturday'] || courseDays['Sunday']) {
      this.meeting = Final.getSatSunCourseTimeToFinalSection(course);
    } else if (courseDays['Monday'] ||
               courseDays['Wednesday'] ||
               courseDays['Friday']) {
      this.meeting = Final.getMTWRFCourseTimeToFinalSection(course);
    } else if (courseDays['Tuesday'] ||
               courseDays['Thursday']) {
      this.meeting = Final.getTRCourseTimeToFinalSection(course);
    }
  }
}

Final.meetings = {
  Monday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('M')),
  Monday1130230PM: new Meeting(new Time(11, 30), new Time(2, 30), Meeting.daysFromAbrvs('M')),
  Monday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('M')),
  Monday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('M')),
  Tuesday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('T')),
  Tuesday1130230PM: new Meeting(new Time(11, 30), new Time(2, 30), Meeting.daysFromAbrvs('T')),
  Tuesday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('T')),
  Tuesday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('T')),
  Wednesday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('W')),
  Wednesday1130230PM: new Meeting(new Time(11, 30), new Time(2, 30), Meeting.daysFromAbrvs('W')),
  Wednesday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('W')),
  Wednesday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('W')),
  Thursday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('R')),
  Thursday1130230PM: new Meeting(new Time(11, 30), new Time(2, 30), Meeting.daysFromAbrvs('R')),
  Thursday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('R')),
  Thursday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('R')),
  Friday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('F')),
  Friday1130230PM: new Meeting(new Time(11, 30), new Time(2, 30), Meeting.daysFromAbrvs('F')),
  Friday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('F')),
  Friday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('F'))
};

Final.elementaryForeignLangListing = {
  'AFRICAM': ['30A', '30B', '11A', '11B', '7A', '7B', '13A', '13B'],
  'ARABIC': ['1A', '1B'],
  'CELTIC': ['102A', '15'],
  'CHINESE': ['1A', '1B', '1X', '1Y'],
  'CUNEIF': ['100A', '100B', '106A', '106B', '102A', '102B'],
  'EGYPT': ['100A', '100B'],
  'FRENCH': ['1', '2'],
  'GERMAN': ['1', '2'],
  'GREEK': ['1', '2'],
  'HEBREW': ['1A', '1B'],
  'ITALIAN': ['1', '2'],
  'JAPAN': ['1A', '1B'],
  'KOREAN': ['1A', '1AX', '1B', '1BX'],
  'LATIN': ['1', '2'],
  'PERSIAN': ['1A', '1B'],
  'RUSSIAN': ['1', '2'],
  'S,SEASN': ['1A', '1B'],
  'SANSKR': ['100A', '100B'],
  'SPANISH': ['1', '2'],
  'TELUGU': ['1A', '1B'],
  'TIBETAN': ['1A', '1B'],
  'TURKISH': ['1A', '1B'],
  'YIDDISH': ['101']
};

Final.getSubjectCourseToFinalSection = function(course) {
  if (course.department === 'ECON') {
    if (course.courseNumber === '1' || course.courseNumber === '100B') {
      return Final.meetings.Tuesday1130230PM;
    }
  } else if (course.department === 'CHEM') {
    if (course.courseNumber === '1A' || course.courseNumber === '1B') {
      return Final.meetings.Monday36PM;
    }
  } else if (course.department in Final.elementaryForeignLangListing) {
    if (Final.elementaryForeignLangListing[course.department]
        .indexOf(course.courseNumber) >= 0) {
      return Final.meetings.Wednesday1130230PM;
    }
  }
};

Final.getMTWRFCourseTimeToFinalSection = function(course) {
  switch (course.meeting.startTime.hours) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      return null;
    case 8:
      return Final.meetings.Monday710PM;
    case 9:
      return Final.meetings.Tuesday710PM;
    case 10:
      return Final.meetings.Monday811AM;
    case 11:
      return Final.meetings.Monday1130230PM;
    case 12:
      return Final.meetings.Friday1130230PM;
    case 13:
      return Final.meetings.Wednesday710PM;
    case 14:
      return Final.meetings.Thursday36PM;
    case 15:
      return Final.meetings.Tuesday710PM;
    case 16:
      return Final.meetings.Thursday811AM;
    case 17:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
    case 23:
    case 24:
      return Final.meetings.Friday36PM;
  }
};

Final.getTRCourseTimeToFinalSection = function(course) {
  switch (course.meeting.startTime.hours) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      return null;
    case 8:
      return Final.meetings.Wednesday36PM;
    case 9:
      return Final.meetings.Thursday36PM;
    case 10:
      return Final.meetings.Friday36PM;
    case 11:
      return Final.meetings.Wednesday811AM;
    case 12:
    case 13:
      return Final.meetings.Friday811AM;
    case 14:
      return Final.meetings.Tuesday811AM;
    case 15:
    case 16:
      return Final.meetings.Friday710PM;
    case 17:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
    case 23:
    case 24:
      return Final.meetings.Thursday1130230PM;
  }
};

Final.getSatSunCourseTimeToFinalSection = function() {
  return Final.meetings.Wednesday36PM;
};

module.exports = Final;