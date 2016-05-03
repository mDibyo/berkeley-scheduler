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

ScheduleGroup.prototype.next = function() {
  this._updateIterator();
  var sectionIds = this.sectionChoices.map(function(choices, index) {
    return choices[this.sectionChoiceIterator[index]];
  }, this);
  return this._getScheduleWithSections(sectionIds);
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
  return new Schedule(this.userId, sections);
};

module.exports = ScheduleGroup;