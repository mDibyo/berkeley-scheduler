'use strict';

var Meeting = require('./meeting');
var ScheduleSectionGroup = require('./scheduleSectionGroup');

function Schedule(userId, sections) {
  this.courses = {};
  this.sectionsByDay = {
    'Monday': [],
    'Tuesday': [],
    'Wednesday': [],
    'Thursday': [],
    'Friday': []
  };
  this.sectionGroupsByDay = {};

  var sectionIdList = [];
  sections.forEach(function (section) {
    sectionIdList.push(section.id);
    var courseId = section.course.id;
    if (!this.courses.hasOwnProperty(courseId)) {
      this.courses[courseId] = [];
    }
    this.courses[courseId].push(section);

    if (section.meetings.length > 0) {
      for (var day in section.meetings[0].days) {
        if (section.meetings[0].days[day]) {
          this.sectionsByDay[day].push(section);
        }
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

Schedule.prototype.getSectionGroupsForDay = function(day) {
  if (!this.sectionGroupsByDay.hasOwnProperty(day)) {
    this.sectionGroupsByDay[day] = this._generateSectionGroupsForDay(day);
  }
  return this.sectionGroupsByDay[day];
};

Schedule.prototype._generateSectionGroupsForDay = function(day) {
  if (!this.sectionsByDay[day].length) {
    return [];
  }

  var sections = this.sectionsByDay[day];
  var sectionGroups = [];
  var currSectionGroup = new ScheduleSectionGroup(sections[0], day);
  for (var i = 1; i < sections.length; i++) {
    var section = sections[i];
    if (currSectionGroup.hasOverlap(section)) {
      currSectionGroup.add(section);
    } else {
      sectionGroups.push(currSectionGroup);
      currSectionGroup = new ScheduleSectionGroup(section, day);
    }
  }
  sectionGroups.push(currSectionGroup);
  return sectionGroups;
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
