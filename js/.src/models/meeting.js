'use strict';

var Time = require('./time.js');

function Meeting(startTime, endTime, days) {
  this.startTime = startTime;
  this.endTime = endTime;
  this.days = days;
}

Meeting.parse = function(meetingJson) {
  if (meetingJson.startTime === null || meetingJson.endTime === null) {
    return new Meeting(null, null, meetingJson.days);
  }

  var startTimeSplit = meetingJson.startTime.split(':');
  var startTime = new Time(parseInt(startTimeSplit[0]), parseInt(startTimeSplit[1]));
  var endTimeSplit = meetingJson.endTime.split(':');
  var endTime = new Time(parseInt(endTimeSplit[0]), parseInt(endTimeSplit[1]));
  return new Meeting(startTime, endTime, meetingJson.days);
};

//Meeting.dayAbrvExpansions = {
//  M: 'Monday',
//  T: 'Tuesday',
//  W: 'Wednesday',
//  R: 'Thursday',
//  F: 'Friday'
//};
Meeting.dayAbrvs = [
  ['Monday', 'M'],
  ['Tuesday', 'T'],
  ['Wednesday', 'W'],
  ['Thursday', 'R'],
  ['Friday', 'F']
];

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
  return dayAbrv + ' ' + this.startTime.toString() + '-' + this.endTime.toString();
};

module.exports = Meeting;
