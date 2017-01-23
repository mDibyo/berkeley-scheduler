'use strict';

var BaseCtrl = require('./_base.controller');


CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseFindCtrl(
    $state,
    $window,
    $location,
    $mdDialog,
    reverseLookup,
    courses,
    courseService,
    eventService,
    scheduleFactory,
    $analytics
) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.scheduleIsReady = courseService.ready;
  vm.subjectAreaIsDisabled = false;
  vm.courseIsDisabled = true;
  vm.courseQuery = null;
  vm.selectedCourseTitle = null;
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

  vm.addedEventsList = [];
  vm.createEvent = createEvent;
  vm.deleteEvent = deleteEvent;

  vm.generateSchedulesQ = scheduleFactory.generateSchedulesQ;

  courseService.getAllCoursesQ().then(function(courses) {
    vm.addedCoursesList = courses;
  });
  vm.addedEventsList = eventService.getAllEvents();

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
    var courseIdx = vm.addedCoursesList.indexOf(course);
    vm.addedCoursesList.remove(course);
    if (course.selected) {
      scheduleFactory.setStale();
    }

    if (vm.addedCoursesList.length !== 0) {
      vm.goToState('schedule.viewCourse', {
        id: vm.addedCoursesList[Math.max(0, courseIdx - 1)].id
      });
    } else if (vm.addedEventsList.length !== 0) {
      vm.goToState('schedule.viewEvent', {
        id: vm.addedEventsList[0].id
      });
    } else {
      vm.goToState('schedule');
    }
  });

  eventService.addCreateEventListener('courseFind', function(event) {
    vm.addedEventsList.push(event);
    scheduleFactory.setStale();
    vm.goToState('schedule.viewEvent', {id: event.id});
  });

  eventService.addDeleteEventListener('courseFind', function(event) {
    vm.addedEventsList.remove(event);
    if (event.selected) {
      scheduleFactory.setStale();
    }

    if (vm.addedEventsList.length !== 0) {
      vm.goToState('schedule.viewEvent', {
        id: vm.addedEventsList[vm.addedEventsList.length - 1].id
      });
    } else if (vm.addedCoursesList.length !== 0) {
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
        return angular.lowercase(abbrv).indexOf(query) === 0;
      });
    };
  }

  function selectSubjectArea(subjectArea) {
    vm.courseQuery = null;
    vm.selectedCourseTitle = null;

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
      );
    };
  }

  function selectCourseWithTitle() {
    var courseQuery = vm.courseQuery;
    var courseTitle = vm.selectedCourseTitle;

    vm.courseQuery = null;
    vm.selectedCourseTitle = null;

    if (!courseQuery || !courseQuery.length || !courseTitle) {
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

  function createEvent() {
    eventService.createEvent();
  }

  function deleteEvent(event) {
    $mdDialog.show({
      templateUrl: 'assets/static/html/confirm_event_delete.dialog.html',
      controller: 'ConfirmEventDeleteDialogCtrl',
      controllerAs: 'vm',
      parent: angular.element(document.body),
      clickOutsideToClose: true,
      escapeToClose: true,
      locals: {
        eventName: event.getName(),
        onConfirm: function() {
          eventService.deleteEvent(event);
        }
      }
    })
  }
}
angular.module('berkeleyScheduler').controller('CourseFindCtrl', [
    '$state',
    '$window',
    '$location',
    '$mdDialog',
    'reverseLookup',
    'courses',
    'courseService',
    'eventService',
    'scheduleFactory',
    '$analytics',
    CourseFindCtrl
]);
