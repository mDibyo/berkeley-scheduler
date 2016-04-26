'use strict';

var Time = (function() {
  function Time(hours, minutes) {
    if (hours < 0 || hours > 23) {
      console.error('invalid hours', hours);
    }
    this.hours = hours;
    if (minutes < 0 || minutes > 59) {
      console.error('invalid minutes', minutes);
    }
    this.minutes = minutes;
  }

  Time.parse = function(timeJson) {
    if (typeof timeJson === 'string' || timeJson instanceof String) {
      timeJson = JSON.parse(timeJson);
    }
    return new Time(timeJson.hours, timeJson.minutes);
  };

  Time.noon = new Time(12, 0);

  Time.prototype.add = function(other) {
    return new Time(this.hours + other.hours, this.minutes + other.minutes);
  };

  Time.prototype.compareTo = function(other) {
    return this.getTotalMinutes() - other.getTotalMinutes();
  };

  Time.prototype.toString = function() {
    var hours = this.hours;
    var suffix = ' AM';
    if (hours >= 12) {
      suffix = ' PM';
      if (hours > 12) {
        hours -= 12;
      }
    }
    var string = hours.toString();
    if (this.minutes != 0) {
      string += ':' + this.minutes.toString();
    }
    return string + suffix;
  };

  Time.prototype.getTotalMinutes = function() {
    return this.hours * 60 + this.minutes;
  };

  return Time;
})();

var Meeting = (function() {
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

  return Meeting;
})();

