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
          .filter(function(section) {
        this.sections[section.id] = section;
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

ScheduleGroup.prototype._nextScheduleSectionIds = function() {
  if (!this._updateIterator()) {
    return [];
  }
  return this.sectionChoices.map(function(choices, index) {
    return choices[index][this.sectionChoiceIterator[index]];
  }, this);
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

ScheduleGroup.prototype.getScheduleWithId = function(scheduleId) {
  var found = true;
  var sections = Schedule.getSectionIdsFromId(scheduleId).map(function(sectionId) {
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
