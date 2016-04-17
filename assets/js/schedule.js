'use strict';

function Schedule(sections) {
  this.courses = {};
  sections.forEach(function (section) {
    var ccn = section.course.ccn;
    if (!this.courses.hasOwnProperty(ccn)) {
      this.courses[ccn] = [];
    }
    this.courses[ccn].push(section);
  }, this);
}
