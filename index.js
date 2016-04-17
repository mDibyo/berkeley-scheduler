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
    ]);

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

    function setStale() {
      _stale = true;
    }

    function addCourse(course) {
      if (_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      _courses[course.ccn] = course;
      setStale();
      return true;
    }

    function dropCourse(course) {
      if (!_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      delete _courses[course.ccn];
      setStale();
      return true;
    }

    function generateSchedules() {
      if (!_stale) {
        return _schedules;
      }

      _schedules = [];
      var sectionsByCourseType = [];
      for (var ccn in _courses) {
        var course = _courses[ccn];
        course.sectionTypes.forEach(function(sectionType) {
          sectionsByCourseType.push(course.getSectionsByType(sectionType).filter(function(section) {
            return section.selected;
          }));
        });
      }
      var numSections = sectionsByCourseType.length;

      var generateHelper = function(array, n) {
        for (var i = 0, l = sectionsByCourseType[n].length; i < l; i++) {
          var a = array.slice(0);
          a.push(sectionsByCourseType[n][i]);
          if (n === numSections-1) {
            _schedules.push(new Schedule(a));
          } else {
            generateHelper(a, n+1);
          }
        }
      };
      generateHelper([], 0);
      _stale = false;
      console.log(_schedules);
      return _schedules;
    }

    return {
      setStale: setStale,
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
  function CourseFindCtrl($state, $window, courses, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.coursesList = [];
    vm.addedCoursesList = [];
    vm.setSchedulesStale = setSchedulesStale;
    vm.addCourse = addCourse;
    vm.dropCourse = dropCourse;
    vm.setSelectedCourse = setSelectedCourse;
    vm.generateSchedules = scheduleFactory.generateSchedules;

    var selectedCourse = null;
    courses.sampleCoursesQ.then(function(courses) {
      vm.coursesList = courses;
    });

    function setSchedulesStale() {
      scheduleFactory.setStale();
    }

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

  function sbCourseDisplayAndSelectDirective() {
    sbCourseDisplayAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
    function sbCourseDisplayAndSelectCtrl($state, $window, scheduleFactory) {
      BaseCtrl.call(this, $state, $window);

      var vm = this;

      vm.setSchedulesStale = setSchedulesStale;

      function setSchedulesStale() {
        scheduleFactory.setStale();
      }
    }

    return {
      scope: {
        course: '='
      },
      controller: [
        '$state',
        '$window',
        'scheduleFactory',
        sbCourseDisplayAndSelectCtrl
      ],
      controllerAs: 'vm',
      templateUrl: "assets/html/course_display_and_select.partial.html"
    };
  }
  angular.module('scheduleBuilder').directive('sbCourseDisplayAndSelect', [
    sbCourseDisplayAndSelectDirective
  ]);

  function sbScheduleDisplayDirective() {
    sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
    function sbScheduleDisplayCtrl($state, $window, scheduleFactory) {
      BaseCtrl.call(this, $state, $window);

      var vm = this;

      vm.hours = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM']
      vm.halfHours = [
        '8AM', '8:30AM', '9AM', '9:30AM', '10AM', '10:30AM', '11AM', '11:30AM', '12PM',
        '12:30PM', '1PM', '1:30PM', '2PM', '2:30PM', '3PM', '3:30PM', '4PM', '4:30PM',
        '5PM', '5:30PM', '6PM', '6:30PM'
      ];
      vm.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    return {
      scope: {
        schedule: '='
      },
      controller: [
        '$state',
        '$window',
        'scheduleFactory',
        sbScheduleDisplayCtrl
      ],
      controllerAs: 'vm',
      templateUrl: "assets/html/schedule_display.partial.html"
    }
  }
  angular.module('scheduleBuilder').directive('sbScheduleDisplay', [
    'scheduleFactory',
    sbScheduleDisplayDirective
  ])
})();