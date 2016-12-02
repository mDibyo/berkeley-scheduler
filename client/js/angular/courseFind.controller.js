var BaseCtrl = require('./_base.controller');


CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseFindCtrl($state, $window, $location, reverseLookup, courses, courseService, scheduleFactory, $analytics) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.scheduleIsReady = courseService.ready;
  vm.subjectAreaIsDisabled = false;
  vm.courseIsDisabled = true;
  vm.selectedCourse = null;
  vm.courseTitlesList = [];
  vm.subjectAreasList = [];
  vm.searchSubjectArea = searchSubjectArea;
  vm.selectSubjectArea = selectSubjectArea;
  vm.searchCourseTitle = searchCourseTitle;
  vm.selectCourseWithTitle = selectCourseWithTitle;
  vm.extractCourseNumberNumber = extractCourseNumberNumber;
  vm.extractCourseNumberSuffix = extractCourseNumberSuffix;
  vm.extractCourseNumberPrefix = extractCourseNumberPrefix;

  vm.addedCoursesList = [];
  vm.setStale = setSchedulesStale;
  vm.addCourse = addCourse;
  vm.dropCourse = dropCourse;

  vm.generateSchedulesQ = scheduleFactory.generateSchedulesQ;

  courseService.getAllCoursesQ().then(function(courses) {
    vm.addedCoursesList = courses;
  });

  courses.getSubjectAreasQ().then(function(subjectAreas) {
    vm.subjectAreasList = subjectAreas;
  });

  courseService.addSetReadyListener('courseFind', function(isReady) {
    vm.scheduleIsReady = isReady;
    scheduleFactory.setStale();
  });

  courseService.addAddCourseListener('courseFind', function(course) {
    vm.addedCoursesList.push(course);
    scheduleFactory.setStale();
    if (!vm.scheduleIsReady) {
      return;
    }
    vm.goToState('schedule.viewCourse', {id: course.id});
  });

  courseService.addDropCourseListener('courseFind', function(course) {
    vm.addedCoursesList.remove(course);
    scheduleFactory.setStale();
    if (vm.addedCoursesList.length != 0) {
      vm.goToState('schedule.viewCourse', {
        id: vm.addedCoursesList[vm.addedCoursesList.length - 1].id
      });
    } else {
      vm.goToState('schedule');
    }
  });

  function searchSubjectArea(query) {
    return query ?
      vm.subjectAreasList.filter(createSubjectAreaFilterFor(query)) :
      vm.subjectAreasList;
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
      vm.courseTitlesList = [];
      return;
    }

    reverseLookup.getCourseTitlesQBySubjectAreaCode(subjectArea.code).then(function(courseTitles) {
      vm.courseTitlesList = courseTitles;
      vm.courseIsDisabled = false;
    });
  }

  function searchCourseTitle(query) {
    return query ? vm.courseTitlesList.filter(createCourseFilterFor(query)) : vm.courseTitlesList;
  }

  function createCourseFilterFor(query) {
    query = angular.lowercase(query);
    return function filterFn(courseTitle) {
      return (
        angular.lowercase(courseTitle.courseNumber).indexOf(query) === 0 ||
        angular.lowercase(courseTitle.title).indexOf(query) === 0
      )
    };
  }

  function selectCourseWithTitle(courseTitle) {
    if (!courseTitle) {
      return;
    }
    reverseLookup.getCourseQBy1arySectionId(courseTitle.id).then(function(course) {
      addCourse(course);
    });
  }

  var courseNumberRegex = /^([a-zA-Z]*)(\d+)([a-zA-Z]*)/;

  function extractCourseNumberNumber(course) {
    return parseInt(courseNumberRegex.exec(course.courseNumber)[2]);
  }

  function extractCourseNumberSuffix(course) {
    return courseNumberRegex.exec(course.courseNumber)[3];
  }

  function extractCourseNumberPrefix(course) {
    return courseNumberRegex.exec(course.courseNumber)[1];
  }

  function setSchedulesStale() {
    scheduleFactory.setStale(true);
  }

  function addCourse(course) {
    courseService.addCourse(course);
  }

  function dropCourse(course) {
    courseService.dropCourseQ(course);
  }
}
angular.module('berkeleyScheduler').controller('CourseFindCtrl', [
    '$state',
    '$window',
    '$location',
    'reverseLookup',
    'courses',
    'courseService',
    'scheduleFactory',
    '$analytics',
    CourseFindCtrl
]);
