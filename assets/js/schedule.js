'use strict';

var Schedule = (function() {
  function Schedule(sections) {
    this.courses = {};
    this.meetingsByDay = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': []
    };

    var ccnList = [];
    sections.forEach(function (section) {
      ccnList.push(section.ccn);
      var ccn = section.course.ccn;
      if (!this.courses.hasOwnProperty(ccn)) {
        this.courses[ccn] = [];
      }
      this.courses[ccn].push(section);

      var dayAbrvs = section.time.split(' ', 2)[0];
      for (var i = 0; i < dayAbrvs.length; i++) {
        this.meetingsByDay[Schedule.dayAbrvExpansions[dayAbrvs[i]]].push(section);
      }
    }, this);
    this.id = Schedule.generateId(ccnList);

    this.selected = true;
  }

  Schedule.generateId = function(ccnList) {
    ccnList = ccnList.map(function (ccn) {
      return parseInt(ccn);
    });
    ccnList.sort(function(a, b) {
      return a - b;
    });
    return ccnList.join('.');
  };

  Schedule.normalizeId = function(id) {
    if (id === null) {
      return null;
    }
    return Schedule.generateId(id.split('.'));
  };

  Schedule.dayAbrvExpansions = {
    M: 'Monday',
    T: 'Tuesday',
    W: 'Wednesday',
    R: 'Thursday',
    F: 'Friday'
  };

  Schedule.intervalAbrvPositionOffsets = {
    '8-9A': 0,
    '8-9:30A': 0,
    '9-9A': 1,
    '9:30-11A': 1.5,
    '10-11A': 2,
    '11-12P': 3,
    '11-12:30P': 4,
    '12-1P': 4,
    '12:30-2P': 4.5,
    '1-2P': 5,
    '2-3P': 6,
    '2-3:30P': 6,
    '3-4P': 7,
    '3:30-5P': 7.5,
    '4-5P': 8,
    '5-6P': 9,
    '5-6:30P': 9,
    '6-7P': 10,
    '6:30-8P': 10.5,
    '7-8P': 11
  };

  Schedule.intervalAbrvHeights = {
    '8-9A': 1,
    '8-9:30A': 1.5,
    '9-9A': 1,
    '9:30-11A': 1.5,
    '10-11A': 1,
    '11-12P': 1,
    '11-12:30P': 1.5,
    '12-1P': 1,
    '12:30-2P': 1.5,
    '1-2P': 1,
    '2-3P': 1,
    '2-3:30P': 1.5,
    '3-4P': 1,
    '3:30-5P': 1.5,
    '4-5P': 1,
    '5-6P': 1,
    '5-6:30P': 1.5,
    '6-7P': 1,
    '6:30-8P': 1.5,
    '7-8P': 1
  };

  return Schedule;
})();
