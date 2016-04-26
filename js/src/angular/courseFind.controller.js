var BaseCtrl = require('./_base.controller');

CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseFindCtrl($state, $window, courses, scheduleFactory) {
  BaseCtrl.call(this, $state, $window);

  var vm = this;

  vm.subjectAreaIsDisabled = false;
  vm.courseIsDisabled = true;
  vm.selectedCourse = null;
  vm.inDisplayMode = false;
  vm.coursesList = [];
  vm.subjectAreasList = [];
  vm.currCourse = null;
  vm.searchSubjectArea = searchSubjectArea;
  vm.selectSubjectArea = selectSubjectArea;
  vm.searchCourse = searchCourse;
  vm.selectCourse = selectCourse;
  vm.extractCourseNumberNumber = extractCourseNumberNumber;
  vm.extractCourseNumberSuffix = extractCourseNumberSuffix;
  vm.extractCourseNumberPrefix = extractCourseNumberPrefix;

  vm.addedCoursesList = scheduleFactory.getAllCourses();
  vm.setSchedulesStale = setSchedulesStale;
  vm.leaveDisplayMode = leaveDisplayMode;
  vm.addCourse = addCourse;
  vm.dropCourse = dropCourse;

  vm.generateSchedules = scheduleFactory.generateSchedules;

  courses.getSubjectAreasQ().then(function(subjectAreas) {
    vm.subjectAreasList = subjectAreas;
  });

  scheduleFactory.registerSetInDisplayModeListener(function(inDisplayMode) {
    vm.inDisplayMode = inDisplayMode;
  });

  scheduleFactory.registerSetCurrCourseListener(function(course) {
    vm.currCourse = course;
  });

  scheduleFactory.registerAddCourseListener(function(course) {
    vm.addedCoursesList.push(course);
    if (vm.currCourse != null) {
      vm.goToState('schedule.viewCourse', {id: course.id})
    }
  });

  scheduleFactory.registerDropCourseListener(function(course) {
    vm.addedCoursesList.remove(course);
    if (vm.addedCoursesList.length == 0) {
      vm.goToState('schedule');
    }
  });

  function searchSubjectArea(query) {
    return query
      ? vm.subjectAreasList.filter(createSubjectAreaFilterFor(query))
      : vm.subjectAreasList;
  }

  function createSubjectAreaFilterFor(query) {
    query = angular.lowercase(query);
    return function filterFn(subjectArea) {
      return (
        angular.lowercase(subjectArea.code).indexOf(query) === 0 ||
        angular.lowercase(subjectArea.description).indexOf(query) === 0
      )
    };
  }

  function selectSubjectArea(subjectArea) {
    if (!subjectArea) {
      vm.courseIsDisabled = true;
      vm.coursesList = [];
      return;
    }

    courses.getCoursesQBySubjectAreaCode(subjectArea.code).then(function(courses) {
      vm.coursesList = courses;
      vm.courseIsDisabled = false;
    });
  }

  function searchCourse(query) {
    return query
      ? vm.coursesList.filter(createCourseFilterFor(query))
      : vm.coursesList;
  }

  function createCourseFilterFor(query) {
    query = angular.lowercase(query);
    return function filterFn(course) {
      return (
        angular.lowercase(course.courseNumber).indexOf(query) === 0 ||
        angular.lowercase(course.title).indexOf(query) === 0
      )
    };
  }

  function selectCourse(course) {
    if (!course) {
      return;
    }
    addCourse(course);
  }

  var courseNumberRegex = /^([a-zA-Z]*)(\d+)([a-zA-Z]*)/;

  function extractCourseNumberNumber(course) {
    var courseNumber = course.courseNumber;
    return parseInt(courseNumberRegex.exec(courseNumber)[2]);
  }

  function extractCourseNumberSuffix(course) {
    var courseNumber = course.courseNumber;
    return courseNumberRegex.exec(courseNumber)[3];
  }

  function extractCourseNumberPrefix(course) {
    var courseNumber = course.courseNumber;
    return courseNumberRegex.exec(courseNumber)[1];
  }

  function setSchedulesStale() {
    scheduleFactory.setStale();
  }

  function leaveDisplayMode() {
    scheduleFactory.setInDisplayMode(false);
    vm.goToState('schedule');
  }

  function addCourse(course) {
    scheduleFactory.addCourse(course);
  }

  function dropCourse(course) {
    scheduleFactory.dropCourse(course);
  }
}
angular.module('scheduleBuilder').controller('CourseFindCtrl', [
  '$state',
  '$window',
  'courses',
  'scheduleFactory',
  CourseFindCtrl
]);
