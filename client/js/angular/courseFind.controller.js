var BaseCtrl = require('./_base.controller');


CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseFindCtrl($state, $window, $location, courses, scheduleFactory, $analytics) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.scheduleIsReady = scheduleFactory.isReady();
  vm.subjectAreaIsDisabled = false;
  vm.courseIsDisabled = true;
  vm.selectedCourse = null;
  vm.coursesList = [];
  vm.subjectAreasList = [];
  vm.searchSubjectArea = searchSubjectArea;
  vm.selectSubjectArea = selectSubjectArea;
  vm.searchCourse = searchCourse;
  vm.selectCourse = selectCourse;
  vm.extractCourseNumberNumber = extractCourseNumberNumber;
  vm.extractCourseNumberSuffix = extractCourseNumberSuffix;
  vm.extractCourseNumberPrefix = extractCourseNumberPrefix;

  vm.addedCoursesList = scheduleFactory.getAllCourses();
  vm.setSchedulesStale = setSchedulesStale;
  vm.addCourse = addCourse;
  vm.dropCourse = dropCourse;

  vm.generateSchedulesQ = scheduleFactory.generateSchedulesQ;

  courses.getSubjectAreasQ().then(function(subjectAreas) {
    vm.subjectAreasList = subjectAreas;
  });

  scheduleFactory.registerSetReadyListener(function(isReady) {
    vm.scheduleIsReady = isReady;
  });

  scheduleFactory.registerAddCourseListener(function(course) {
    vm.addedCoursesList.push(course);
    if (!vm.scheduleIsReady) {
      return;
    }
    vm.goToState('schedule.viewCourse', {id: course.id});
  });

  scheduleFactory.registerDropCourseListener(function(course) {
    vm.addedCoursesList.remove(course);
    if (vm.addedCoursesList.length != 0) {
      vm.goToState('schedule.viewCourse', {
        id: vm.addedCoursesList[vm.addedCoursesList.length-1].id
      });
    } else {
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
      if (angular.lowercase(subjectArea.code).indexOf(query) === 0) {
        return true;
      }
      if (angular.lowercase(subjectArea.description).indexOf(query) === 0) {
        return true;
      }
      return subjectArea.abbreviations.some(function(abbrv) {
        return angular.lowercase(abbrv).indexOf(query) === 0
      })
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
    scheduleFactory.setStale(true);
  }

  function addCourse(course) {
    scheduleFactory.addCourse(course);
  }

  function dropCourse(course) {
    scheduleFactory.dropCourse(course);
  }
}
angular.module('berkeleyScheduler').controller('CourseFindCtrl', [
  '$state',
  '$window',
  '$location',
  'courses',
  'scheduleFactory',
  '$analytics',
  CourseFindCtrl
]);
