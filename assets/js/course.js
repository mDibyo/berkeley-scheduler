'use strict';

var Section = (function() {
  function Section(sectionJson, course) {
    angular.extend(this, sectionJson);

    this.location = this.location.description;
    this.meeting = Meeting.parse(this.time);
    delete this.time;

    this.course = course;
    this.selected = true;
  }

  return Section;
})();

var Course = (function() {
  function Course(courseJson) {
    if (courseJson.displayName === undefined) {
      console.log(courseJson);
    }
    var courseSplit = courseJson.displayName.split(' ', 2);
    this.department = courseSplit[0];
    this.courseNumber = courseSplit[1];

    this.title = courseJson.title;
    this.instructors = courseJson.instructors;
    this.id = courseJson.id;
    this.units = courseJson.units;

    this.sectionTypes = [];
    this.sections = courseJson.sections.map(function(sectionJson) {
      var section = new Section(sectionJson, this);

      if (this.sectionTypes.indexOf(section.type) < 0) {
        this.sectionTypes.push(section.type);
      }

      return section;
    }, this);

    this.color = null;
    this.view = false;
  }

  Course.colorCodes = {
    'red': '#f44336',
    'pink': '#e91e63',
    'purple': '#9c27b0',
    'deep-purple': '3673ab7',
    'indigo': '#3f51b5',
    'blue': '#2196f3',
    'light-blue': '303a9f4',
    'cyan': '#00bcd4',
    'teal': '#009688',
    'green': '34caf50',
    'light-green': '#8bc34a',
    'lime': '#cddc39',
    'yellow': '#ffeb3b',
    'amber': '#ffc107',
    'orange': '#ff9800',
    'deep-orange': '#ff5722',
    'brown': '#795548',
    'blue-grey': '#607d8b'
  };

  Course.unregisteredColors = Object.keys(Course.colorCodes);

  Course.registeredColors = [];

  Course.courseColors = {};

  Course.getRegisteredColor = function() {
    var l = Course.unregisteredColors.length;
    if (l == 0) {
      return Course.registeredColors[Math.floor(Math.random() * Course.registeredColors.length)]
    }
    var idx = Math.floor(Math.random() * l);
    var color = Course.unregisteredColors.splice(idx, 1)[0];
    Course.registeredColors.push(color);
    return color;
  };

  Course.unRegisterColor = function(color) {
    Course.registeredColors.remove(color);
    Course.unregisteredColors.push(color);
  };

  Course.parse = function(data) {
    return new Course(data);
  };

  Course.prototype.getSectionsByType = function(type) {
    return this.sections.filter(function(section) {
      return section.type === type;
    });
  };

  Course.prototype.add = function() {
    if (!Course.courseColors.hasOwnProperty(this.id)) {
      Course.courseColors[this.id] = Course.getRegisteredColor();
      console.log('registering color');
    }
    this.color = Course.courseColors[this.id];
  };

  Course.prototype.drop = function() {
    delete Course.courseColors[this.id];
    Course.unRegisterColor(this.color);
  };

  return Course;
})();