'use strict';

var Time = require('./time.js');

function Meeting(startTime, endTime, days, location, instructors) {
  this.startTime = startTime;
  this.endTime = endTime;
  this.days = days;
  this.location = location;
  this.instructors = instructors;
}

Meeting.parse = function(meetingJson) {
  var location = meetingJson.location.description || null;
  if (meetingJson.startTime === null || meetingJson.endTime === null) {
    return new Meeting(null, null, meetingJson.days, location, meetingJson.instructors);
  }

  var startTimeSplit = meetingJson.startTime.split(':');
  var startTime = new Time(parseInt(startTimeSplit[0]), parseInt(startTimeSplit[1]));
  var endTimeSplit = meetingJson.endTime.split(':');
  var endTime = new Time(parseInt(endTimeSplit[0]), parseInt(endTimeSplit[1]));
  return new Meeting(startTime, endTime, meetingJson.days, location, meetingJson.instructors);
};

Meeting.dayAbrvExpansions = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  R: 'Thursday',
  F: 'Friday'
};

Meeting.dayAbrvs = [
  ['Monday', 'M'],
  ['Tuesday', 'T'],
  ['Wednesday', 'W'],
  ['Thursday', 'R'],
  ['Friday', 'F']
];

Meeting.daysFromAbrvs = function(abrvs) {
  var days = {
    'Monday': false,
    'Tuesday': false,
    'Wednesday': false,
    'Thursday': false,
    'Friday': false
  };
  for (var i = 0; i < abrvs.length; i++) {
    days[Meeting.dayAbrvExpansions[abrvs[i]]] = true;
  }
  return days;
};

Meeting.prototype.getTotalMinutes = function() {
  return this.endTime.getTotalMinutes() - this.startTime.getTotalMinutes();
};

Meeting.prototype.toString = function() {
  var dayAbrv = '';
  Meeting.dayAbrvs.forEach(function(day) {
    if (this.days[day[0]]) {
      dayAbrv += day[1];
    }
  }, this);
  if (this.startTime == null || this.endTime == null) {
    return dayAbrv;
  }
  return dayAbrv + ' ' + this.startTime.toString() + ' - ' + this.endTime.toString();
};

module.exports = Meeting;
