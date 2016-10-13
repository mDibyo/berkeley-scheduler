'use strict';

var Meeting = require('./meeting');

function Section(sectionJson, course) {
  angular.extend(this, sectionJson);

  this.id = parseInt(this.id);

  var meetingsJson = this.meetings;
  // TODO: Add support for multiple meetings
  this.meetings = meetingsJson.map(Meeting.parse);
  delete this.time;

  this.course = course;
  this.selected = true;
}

module.exports = Section;

