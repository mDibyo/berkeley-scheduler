'use strict';

function Time(hours, minutes) {
  if (hours < 0 || hours > 24) {
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

Time.fivePM = new Time(17, 0);

Time.prototype.add = function(other) {
  return new Time(this.hours + other.hours, this.minutes + other.minutes);
};

Time.prototype.compareTo = function(other) {
  return this.getTotalMinutes() - other.getTotalMinutes();
};

Time.prototype.toString = function() {
  var hours = this.hours % 24;
  var suffix = 'AM';
  if (hours >= 12) {
    suffix = 'PM';
  }
  hours = hours % 12;
  if (hours == 0) {
    hours = 12;
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

module.exports = Time;


