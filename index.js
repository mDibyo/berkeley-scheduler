(function() {
  'use strict';

  angular.module('scheduleBuilder', [
    'ui.router',
    'ngSanitize',
    'ngMaterial'
  ])
    .config([
      '$stateProvider',
      '$urlRouterProvider',
      function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('find', {
            url: '/find',
            templateUrl: 'assets/html/find.html',
            controller: 'CourseFindCtrl',
            controllerAs: 'vm'
          })
          .state('schedule', {
            url: '/schedule',
            templateUrl: 'assets/html/schedule.html',
            controller: 'ScheduleCtrl',
            controllerAs: 'vm'
          });

        $urlRouterProvider.otherwise('find');
      }
    ])
    .directive('sbCourseDisplayAndSelect', function() {
      return {
        scope: {
          course: '='
        },
        templateUrl: "assets/html/course_display_and_select.partial.html"
      };
    });

  var sampleCoursesUrl = 'assets/json/sample_courses.json';

  function courses($http) {
    var sampleCoursesQ = $http.get(sampleCoursesUrl).then(function(response) {
      return response.data.map(function(courseJson) {
        return Course.parse(courseJson);
      });
    });

    return {
      sampleCoursesQ: sampleCoursesQ
    }
  }
  angular.module('scheduleBuilder').factory('courses', [
    '$http',
    courses
  ]);

  function scheduleFactory() {
    var _courses = {};
    var _schedules = {};
    var _stale = false;

    function addCourse(course) {
      if (_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      _courses[course.ccn] = course;
      _stale = true;
      return true;
    }

    function dropCourse(course) {
      if (!_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      delete _courses[course.ccn];
      _stale = true;
      return true;
    }

    function generateSchedules() {
      if (_stale) {
        _schedules = [];
        // TODO: Generate schedules
        _stale = false;
      }
      return _schedules;
    }

    return {
      addCourse: addCourse,
      dropCourse: dropCourse,
      generateSchedules: generateSchedules
    };
  }
  angular.module('scheduleBuilder').factory('scheduleFactory', [
    scheduleFactory
  ]);

  function BaseCtrl($state, $window) {
    var vm = this;

    vm.goToState = goToState;
    vm.goToExternal = goToExternal;

    function goToState(to, params, options) {
      $state.go(to, params, options);
    }

    function goToExternal(href) {
      $window.open(href, '_blank');
    }
  }

  CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseFindCtrl($state, $window, $scope, courses, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.coursesList = [];
    vm.addedCoursesList = [];
    vm.addCourse = addCourse;
    vm.dropCourse = dropCourse;
    vm.setSelectedCourse = setSelectedCourse;

    var selectedCourse = null;
    courses.sampleCoursesQ.then(function(courses) {
      vm.coursesList = courses;
    });

    function addCourse(course) {
      if (scheduleFactory.addCourse(course)) {
        vm.addedCoursesList.push(course);
      } else {
        console.error('Unable to add course ', course);
      }
    }

    function dropCourse(course) {
      if (scheduleFactory.dropCourse(course)) {
        if (course == selectedCourse) {
          vm.setSelectedCourse(null);
        }
        vm.addedCoursesList.remove(course);
      } else {
        console.error('Unable to drop course ', course);
      }
    }

    function setSelectedCourse(course) {
      console.log(course);
      if (selectedCourse != null) {
        selectedCourse.view = false;
      }
      selectedCourse = course;
      if (selectedCourse != null) {
        selectedCourse.view = true;
      }
    }
  }
  angular.module('scheduleBuilder').controller('CourseFindCtrl', [
    '$state',
    '$window',
    '$scope',
    'courses',
    'scheduleFactory',
    CourseFindCtrl
  ]);

  ScheduleCtrl.prototype = Object.create(BaseCtrl.prototype);
  function ScheduleCtrl($state, $window) {
    BaseCtrl.call(this, $state, $window);
  }
  angular.module('scheduleBuilder').controller('ScheduleCtrl', [
    '$state',
    '$window',
    ScheduleCtrl
  ]);
})();