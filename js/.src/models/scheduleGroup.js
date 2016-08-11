'use strict';

var Schedule = require('./schedule');

function ScheduleGroup(userId, courses) {
  this.id = ScheduleGroup.generateId(userId, courses);
  this.userId = userId;
  this.courses = courses;

  this.sections = {};
  this.sectionChoices = [];
  this.courses.forEach(function(course) {
    course.sectionTypes.forEach(function(sectionType) {
      this.sectionChoices.push(course
        .getSectionsByType(sectionType)
        .map(function(section) {
          this.sections[section.id] = section;
          return section;
        }, this)
        .filter(function(section) {
          return section.selected;
        }, this));
    }, this);
  }, this);
  this.resetIterator();
}

ScheduleGroup.generateId = function(userId, courses) {
  var idComponentList = courses.map(function(course) {
    return course.id;
  });
  idComponentList.unshift(userId);
  return Schedule.generateId(idComponentList);
};

ScheduleGroup.normalizeId = function(id) {
  if (id === null) {
    return null;
  }
  return Schedule.generateId(id.split('.'));
};

ScheduleGroup.getCourseIdsFromId = function(id) {
  return Schedule.getSectionIdsFromId(id);
};

ScheduleGroup.getUserIdFromId = function(id) {
  return Schedule.getUserIdFromId(id);
};

ScheduleGroup.prototype._nextScheduleSectionIds = function() {
  if (!this._updateIterator()) {
    return [];
  }
  return this.sectionChoices.map(function(choices, index) {
    return choices[this.sectionChoiceIterator[index]];
  }, this);
};

ScheduleGroup.prototype.getTotalNumSchedules = function() {
  if (this.sectionChoices.length <= 0) {
    return 0;
  }

  return this.sectionChoices.map(function(sectionChoice) {
    return sectionChoice.length;
  }).reduce(function(a, b) {
    return a * b;
  }, 1);
};

ScheduleGroup.prototype.nextSchedule = function() {
  var sections = this._nextScheduleSectionIds();
  return this._getScheduleWithSections(sections);
};

ScheduleGroup.prototype.nextScheduleId = function() {
  var sectionIds = this._nextScheduleSectionIds().map(function(section) {
    return section.id
  });
  if (sectionIds.length === 0) {
    return null;
  }
  return Schedule.generateId([this.userId].concat(sectionIds));
};

ScheduleGroup.prototype.getScheduleById = function(scheduleId) {
  var found = true;
  var sectionIds = Schedule.getSectionIdsFromId(scheduleId);
  if (sectionIds.length != this.sectionChoices.length) {
    return null;
  }
  var sections = sectionIds.map(function(sectionId) {
    var section = this.sections[sectionId];
    if (!section) {
      found = false;
    }
    return section;
  }, this);
  if (!found) {
    return null;
  }
  return this._getScheduleWithSections(sections);
};

ScheduleGroup.prototype.resetIterator = function() {
  this.sectionChoiceIterator = this.sectionChoices.map(function() {
    return 0;
  });
  this.sectionChoiceIterator[0] = -1;
};

ScheduleGroup.prototype._updateIterator = function() {
  if (this.getTotalNumSchedules() === 0) {
    return false;
  }

  var incrementPos = 0;
  while (incrementPos < this.sectionChoiceIterator.length) {
    this.sectionChoiceIterator[incrementPos] ++;
    if (this.sectionChoiceIterator[incrementPos] < this.sectionChoices[incrementPos].length) {
      return true;
    }
    this.sectionChoiceIterator[incrementPos] = 0;
    incrementPos ++;
  }
  return false;
};

ScheduleGroup.prototype._getScheduleWithSections = function(sections) {
  if (sections.length === 0) {
    return null;
  }
  return new Schedule(this.userId, sections);
};

module.exports = ScheduleGroup;
