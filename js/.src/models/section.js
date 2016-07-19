'use strict';

var Meeting = require('./meeting');

function Section(sectionJson, course) {
  angular.extend(this, sectionJson);

  // TODO: Investigate why location is set to null
  if (this.location !== null) {
    this.location = this.location.description;
  }
  this.meeting = Meeting.parse(this.time);
  delete this.time;

  this.course = course;
  this.selected = true;
}

module.exports = Section;

