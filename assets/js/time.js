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

  Time.twelveHours = new Time(12, 0);

  Time.prototype.add = function(other) {
    return new Time(this.hours + other.hours, this.minutes + other.minutes);
  };

  Time.prototype.compareTo = function(other) {
    return this.getTotalMinutes() - other.getTotalMinutes();
  };

  Time.prototype.toString = function() {
    var hours = this.hours;
    var suffix = ' AM';
    if (hours > 12) {
      hours -= 12;
      suffix = ' PM';
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

var TimeInterval = (function() {
  function TimeInterval(startTime, endTime) {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  var timeStringRegex = /(\d+)(?::(\d+))?-(\d+)(?::(\d+))?([AP])/;
  var onePM = new Time(13, 0);

  TimeInterval.parse = function(timeString) {
    var timeComponents = timeStringRegex.exec(timeString);
    var startTime = new Time(parseInt(timeComponents[1]), parseInt(timeComponents[2] || 0));
    if (startTime.hours == 12) {
      startTime.hours = 0;
    }
    var endTime = new Time(parseInt(timeComponents[3]), parseInt(timeComponents[4] || 0));
    if (endTime.hours == 12) {
      endTime.hours = 0;
    }
    if (timeComponents[5] === 'P') {
      if (startTime.compareTo(endTime) < 0) {
        startTime = startTime.add(Time.twelveHours);
      }
      endTime = endTime.add(Time.twelveHours);
    }
    return new TimeInterval(startTime, endTime);
  };

  TimeInterval.prototype.getTotalMinutes = function() {
    return this.endTime.getTotalMinutes() - this.startTime.getTotalMinutes();
  };

  return TimeInterval;
})();

