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
        this.meetingsByDay[Meeting.dayAbrvExpansions[dayAbrvs[i]]].push(section);
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

  return Schedule;
})();
