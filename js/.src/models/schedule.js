'use strict';

var Meeting = require('./meeting');

function Schedule(userId, sections) {
  this.courses = {};
  this.sectionsByDay = {
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

    for (var day in section.meetings[0].days) {
      if (section.meetings[0].days[day]) {
        this.sectionsByDay[day].push(section);
      }
    }
  }, this);
  for (var day in this.sectionsByDay) {
    this.sectionsByDay[day].sort(function(a, b) {
      return a.meetings[0].startTime.compareTo(b.meetings[0].startTime);
    });
  }

  this.id = Schedule.generateId([userId].concat(sectionIdList));

  this.selected = true;
}

Schedule.timeFootprints = {};

Schedule.prototype.getTimeFootprint = function() {
  var footprint = Meeting.dayAbrvs.map(function(dayAbrv) {
    return dayAbrv[1] +
      this.sectionsByDay[dayAbrv[0]].map(function(section) {
        return section.meetings[0].startTime.getTotalMinutes() + '-' + section.meetings[0].endTime.getTotalMinutes();
      }).reduce(function(a, b) {
        return a + '.' + b;
      }, '');
  }, this).reduce(function(a, b) {
    return a + '|' + b;
  }, '');
  Schedule.timeFootprints[footprint] = this.sectionsByDay;
  return footprint;
};

Schedule.generateId = function(idComponentList) {
  var userId = idComponentList.shift();
  idComponentList = idComponentList.map(function (id) {
    return parseInt(id);
  });
  idComponentList.sort(function(a, b) {
    return a - b;
  });
  idComponentList.unshift(userId);
  return idComponentList.join('.');
};

Schedule.normalizeId = function(id) {
  if (id === null) {
    return null;
  }
  return Schedule.generateId(id.split('.'));
};

Schedule.getUserIdFromId = function(id) {
  return id.split('.')[0];
};

Schedule.getSectionIdsFromId = function(id) {
  return id.split('.').slice(1).map(function(id) {
    return parseInt(id);
  });
};

module.exports = Schedule;
