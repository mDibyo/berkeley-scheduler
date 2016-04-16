'use strict';

function Course(courseJson) {
  var courseSplit = courseJson.course.split(' ', 2);
  this.department = courseSplit[0];
  this.courseNumber = courseSplit[1];

  this.title = courseJson.title;
  this.instructor = courseJson.instructor;
  this.ccn = courseJson.ccn;
  this.units = courseJson.units;

  this.sections = courseJson.sections;
  this.sectionTypes = [];
  this.sections.forEach(function(section) {
    section.selected = true;

    if (this.sectionTypes.indexOf(section.type) < 0) {
      this.sectionTypes.push(section.type);
    }
  }, this);

  this.color = null;
  this.view = false;
}

Course.parse = function(data) {
  return new Course(data);
};

Course.prototype.getSectionsByType = function(type) {
  return this.sections.filter(function(section) {
    return section.type === type;
  });
};
