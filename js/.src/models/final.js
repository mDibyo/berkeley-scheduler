'use strict';

var Meeting = require('./meeting');
var Time = require('./time');

function Final(course) {
  this.course = course;

  this.meeting = Final.getSubjectCourseToFinalSection(course);
  if (!this.meeting && course.meetings.length) {
    var courseDays = course.meetings[0].days;
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
  Monday1130230PM: new Meeting(new Time(11, 30), new Time(14, 30), Meeting.daysFromAbrvs('M')),
  Monday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('M')),
  Monday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('M')),
  Tuesday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('T')),
  Tuesday1130230PM: new Meeting(new Time(11, 30), new Time(14, 30), Meeting.daysFromAbrvs('T')),
  Tuesday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('T')),
  Tuesday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('T')),
  Wednesday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('W')),
  Wednesday1130230PM: new Meeting(new Time(11, 30), new Time(14, 30), Meeting.daysFromAbrvs('W')),
  Wednesday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('W')),
  Wednesday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('W')),
  Thursday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('R')),
  Thursday1130230PM: new Meeting(new Time(11, 30), new Time(14, 30), Meeting.daysFromAbrvs('R')),
  Thursday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('R')),
  Thursday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('R')),
  Friday811AM: new Meeting(new Time(8, 0), new Time(11, 0), Meeting.daysFromAbrvs('F')),
  Friday1130230PM: new Meeting(new Time(11, 30), new Time(14, 30), Meeting.daysFromAbrvs('F')),
  Friday36PM: new Meeting(new Time(15, 0), new Time(18, 0), Meeting.daysFromAbrvs('F')),
  Friday710PM: new Meeting(new Time(19, 0), new Time(22, 0), Meeting.daysFromAbrvs('F'))
};

Final.elementaryForeignLangListing = {
  'AFRICAM': [
    '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B',
    '13A', '13B', '15A', '15B', '30A', '30B', '31A', '31B'
  ],
  'ARABIC': ['100A', '100B', '1A', '1B', '20A', '20B'],
  'ARMENI': ['101A', '101B', '1A', '1B'],
  'BENGLA': ['101A', '101B', '1A', '1B'],
  'BERMESE': ['1A', '1B'],
  'BOSCRSR': ['117A', '117B', '27A', '27B'],
  'BULGARI': ['118A', '118B', '28A', '28B'],
  'CATALAN': ['101A'],
  'CELTIC': ['15', '16', '85', '86', '102A', '102B', '105A', '144A', '144B', '145A', '145B'],
  'CHINESE': ['1A', '1B', '1X', '1Y', '10A', '10B', '10X', '10Y', '100A', '100B', '100XA', '100XB'],
  'COMP LIT': ['112A', '112B'],
  'CUNEIF': ['100A', '100B', '102A', '102B', '106A', '106B'],
  'CZECH': ['116A', '116B', '26A', '26B'],
  'DANISH': ['1A', '1B'],
  'DUTCH': ['1', '2', '3'],
  'EGYPT': ['100A', '100B', '101A', '101B', '102A', '102B'],
  'EURA ST': ['289', '2A', '2B'],
  'FILIPN': ['100A', '100B', '101A', '101B', '1A', '1B'],
  'FINNISH': ['102A', '102B', '1A', '1B'],
  'FRENCH': ['1', '2', '3', '4'],
  'GERMAN': ['1', '101', '102', '110', '2', '3', '4'],
  'GREEK': ['1', '2'],
  'HEBREW': ['100A', '100B', '106A', '106B', '1A', '1B', '20A', '20B'],
  'HIN-URD': ['1A', '1B', '2A', '2B', '100A', '100B', '103A', '103B', '104A', '104B'],
  'HUNGARI': ['1A', '1B'],
  'ICELAND': ['1A', '1B'],
  'IRANIAN': ['110A', '110B'],
  'ITALIAN': ['1', '1S', '2', '3', '4'],
  'JAPAN': ['100A', '100B', '100X', '10A', '10B', '10X', '1A', '1B'],
  'JEWISH': ['101'],
  'KHMER': ['100A', '100B', '101A', '101B', '1A', '1B'],
  'KOREAN': ['1A', '1AX', '1B', '1BX', '10A', '10AX', '10B', '100A', '10BX', '100AX', '100B', '100BX'],
  'LATIN': ['1', '2'],
  'LINGUIS': ['1A', '1B', '2A'],
  'MALAY/I': ['100A', '100B', '1A', '1B'],
  'MONGOLN': ['1A', '1B'],
  'NORWEGN': ['1A', '1B'],
  'PERSIAN': ['100A', '100B', '1A', '1B', '20A', '20B'],
  'POLISH': ['115A', '155B', '25A', '25B'],
  'PORTUG': ['101A', '102', '11', '12', '26', '8'],
  'PUNJABI': ['100A', '100B', '1A', '1B'],
  'ROMANI': ['102A', '102B', '1A', '1B'],
  'RUSSIAN': ['1', '103A', '103B', '2', '3', '4', '6A', '6B'],
  'S,SEASN': ['1A', '1B'],
  'SANSKR': ['100A', '100B', '101A', '101B', '101C'],
  'SCANDIN': ['101A', '101B'],
  'SEMETIC': ['100A', '100B', '205A', '205B'],
  'SPANISH': ['1', '12', '2', '21', '22', '26', '3', '4', '8'],
  'SWEDISH': ['1A', '1B'],
  'TAMIL': ['101A', '101B', '1A', '1B'],
  'TELUGU': ['1A', '1B'],
  'THAI': ['100A', '100B', '101A', '101B', '1A', '1B'],
  'TIBETAN': ['10A', '10B', '1A', '1B'],
  'TURKISH': ['100A', '100B', '10A', '1A', '1B'],
  'VIETNMS': ['100A', '100B', '101A', '101B', '1A', '1B'],
  'YIDDISH': ['101']
};

Final.getSubjectCourseToFinalSection = function(course) {
  if (course.department === 'ECON') {
    if (course.courseNumber === '1' || course.courseNumber === '100B') {
      return Final.meetings.Tuesday1130230PM;
    }
  } else if (course.department === 'CHEM') {
    if (course.courseNumber === '1A' || course.courseNumber === '1B' ||
        course.courseNumber === '3A' || course.courseNumber === '3B') {
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
  switch (course.meetings[0].startTime.hours) {
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
  switch (course.meetings[0].startTime.hours) {
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
      return Final.meetings.Tuesday36PM;
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
