'use strict';

var Meeting = require('./meeting');
var ScheduleMeetingGroup = require('./scheduleMeetingGroup').default;

function Schedule(userId, sections) {
  this.courses = {};
  // this.sectionsByDay = {
  //   'Monday': [],
  //   'Tuesday': [],
  //   'Wednesday': [],
  //   'Thursday': [],
  //   'Friday': []
  // };
  this.meetingsByDay = {
    'Monday': [],
    'Tuesday': [],
    'Wednesday': [],
    'Thursday': [],
    'Friday': []
  };
  this._meetingGroupsByDay = {};

  var sectionIdList = [];
  sections.forEach(function(section) {
    sectionIdList.push(section.id);
    var courseId = section.course.id;
    if (!this.courses.hasOwnProperty(courseId)) {
      this.courses[courseId] = [];
    }
    this.courses[courseId].push(section);

    section.meetings.forEach(function(meeting) {
      meeting.owner = section;
      meeting.getDayList().forEach(function(day) {
        this.meetingsByDay[day].push(meeting);
      }, this);
    }, this);
  }, this);
  for (var day in this.meetingsByDay) {
    this.meetingsByDay[day].sort(function(a, b) {
      return a.startTime.compareTo(b.startTime);
    });
  }

  this.id = Schedule.generateId([userId].concat(sectionIdList));

  this.selected = true;

  this._hasNoTimeConflicts = null;
}

Schedule.timeFootprints = {};

Schedule.prototype.getTimeFootprint = function() {
  var footprint = Meeting.dayAbrvs.map(function(dayAbrv) {
    return dayAbrv[1] +
      this.meetingsByDay[dayAbrv[0]].map(function(meeting) {
        return meeting.startTime.getTotalMinutes() + '-' + meeting.endTime.getTotalMinutes();
      }).reduce(function(a, b) {
        return a + '.' + b;
      }, '');
  }, this).reduce(function(a, b) {
    return a + '|' + b;
  }, '');
  Schedule.timeFootprints[footprint] = this.meetingsByDay;
  return footprint;
};

Schedule.prototype.hasNoTimeConflicts = function() {
  if (this._hasNoTimeConflicts === null) {
    this._hasNoTimeConflicts = this._calculateHasNoTimeConflicts();
  }
  return this._hasNoTimeConflicts;
};

Schedule.prototype._calculateHasNoTimeConflicts = function() {
  var meetingGroups;
  for (var day in this.meetingsByDay) {
    meetingGroups = this.getMeetingGroupsForDay(day);
    for (var i = 0; i < meetingGroups.length; i++) {
      if (meetingGroups[i].slots.length > 1) {
        return false;
      }
    }
  }
  return true;
};

Schedule.prototype.getMeetingGroupsForDay = function(day) {
  if (!this._meetingGroupsByDay.hasOwnProperty(day)) {
    this._meetingGroupsByDay[day] = this._generateMeetingGroupsForDay(day);
  }
  return this._meetingGroupsByDay[day];
};

Schedule.prototype._generateMeetingGroupsForDay = function(day) {
  if (!this.meetingsByDay[day].length) {
    return [];
  }

  var meetings = this.meetingsByDay[day];
  var meetingGroups = [];
  var currMeetingGroup = new ScheduleMeetingGroup(meetings[0], day);
  for (var i = 1; i < meetings.length; i++) {
    var meeting = meetings[i];
    if (currMeetingGroup.hasOverlap(meeting)) {
      currMeetingGroup.add(meeting);
    } else {
      meetingGroups.push(currMeetingGroup);
      currMeetingGroup = new ScheduleMeetingGroup(meeting, day);
    }
  }
  meetingGroups.push(currMeetingGroup);
  return meetingGroups;
};

Schedule.generateId = function(idComponentList) {
  var userId = idComponentList.shift();
  idComponentList = idComponentList.map(function(id) {
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
    return id;
  });
};

module.exports = Schedule;
