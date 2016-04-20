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

    var sectionIdList = [];
    sections.forEach(function (section) {
      sectionIdList.push(section.id);
      var courseId = section.course.id;
      if (!this.courses.hasOwnProperty(courseId)) {
        this.courses[courseId] = [];
      }
      this.courses[courseId].push(section);

      for (var day in section.meeting.days) {
        if (section.meeting.days[day]) {
          this.meetingsByDay[day].push(section);
        }
      }
    }, this);
    this.id = Schedule.generateId(sectionIdList);

    this.selected = true;
  }

  Schedule.generateId = function(sectionIdList) {
    sectionIdList = sectionIdList.map(function (id) {
      return parseInt(id);
    });
    sectionIdList.sort(function(a, b) {
      return a - b;
    });
    return sectionIdList.join('.');
  };

  Schedule.normalizeId = function(id) {
    if (id === null) {
      return null;
    }
    return Schedule.generateId(id.split('.'));
  };

  return Schedule;
})();
