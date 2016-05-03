'use strict';

var Schedule = require('./schedule');

function ScheduleGroup(userId, courses) {
  this.courses = courses;

  var idComponentList = this.courses.map(function(course) {
    return course.id;
  });
  idComponentList.unshift(userId);
  this.userId = userId;
  this.id = Schedule.generateId(idComponentList);

  this.sectionChoices = [];
  this.courses.forEach(function(course) {
    course.sectionTypes.forEach(function(sectionType) {
      this.sectionChoices.push(course
          .getSectionsByType(sectionType)
          .filter(function(section) {
        return section.selected;
      }));
    }, this);
  }, this);

  this.sectionChoiceIterator = this.sectionChoices.map(function() {
    return 0;
  });
  this.sectionChoiceIterator[this.sectionChoiceIterator.length-1] = -1;

  this.schedules = {};
}

ScheduleGroup.prototype.next = function() {
  var success = this.updateIterator();
  if (!success) {
    return null;
  }

  var sections = this.sectionChoices.map(function(choices, index) {
    return choices[this.sectionChoiceIterator[index]];
  }, this);
  return this.getScheduleWithSections(sections);
};

ScheduleGroup.prototype.updateIterator = function() {
  // TODO
};

ScheduleGroup.prototype.getScheduleWithSections = function(sections) {
  // TODO
  return new Schedule(this.userId, sections);
};

module.exports = ScheduleGroup;