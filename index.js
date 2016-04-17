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
          })
          .state('scheduleNew', {
            url: '/schedule1',
            templateUrl: 'assets/html/schedule_new.html',
            controller: 'CourseFindNewCtrl',
            controllerAs: 'vm'
          })
          .state('scheduleNew.viewCourse', {
            url: '/course/{ccn}',
            templateUrl: 'assets/html/course_view_and_select.partial.html',
            controller: 'CourseViewAndSelectCtrl',
            controllerAs: 'vm'
          })
          .state('scheduleNew.viewSchedule', {
            url: '/schedule/{scheduleId}',
            templateUrl: 'assets/html/schedule_view_and_select.partial.html',
            controller: 'ScheduleViewAndSelectCtrl',
            controllerAs: 'vm'
          });

        $urlRouterProvider.otherwise('schedule1');
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
    var _stale = false;

    var _courses = {};
    var _sections = {};

    var _schedules = {};
    var _scheduleIdList = [];
    var _currentScheduleIdx = 0;

    function setStale() {
      _stale = true;
    }

    function getAllCourses() {
      var courses = [];
      for (var ccn in _courses) {
        courses.push(_courses[ccn]);
      }
      return courses;
    }

    function getCourseByCcn(ccn) {
      if (_courses.hasOwnProperty(ccn)) {
        return _courses[ccn];
      }
      if (_sections.hasOwnProperty(ccn)) {
        return _sections[ccn].course;
      }
      return null;
    }

    function addCourse(course) {
      if (_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      _courses[course.ccn] = course;
      course.sections.forEach(function(section) {
        _sections[section.ccn] = section;
      });
      setStale();
      return true;
    }

    function dropCourse(course) {
      if (!_courses.hasOwnProperty(course.ccn)) {
        return false;
      }
      delete _courses[course.ccn];
      course.sections.forEach(function(section) {
        delete _sections[section.ccn];
      });
      setStale();
      return true;
    }

    function generateSchedules() {
      if (!_stale) {
        return _schedules;
      }

      _schedules = {};
      _scheduleIdList = [];
      _currentScheduleIdx = 0;
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
            var schedule = new Schedule(a);
            _schedules[schedule.id] = schedule;
            _scheduleIdList.push(schedule.id);
          } else {
            generateHelper(a, n+1);
          }
        }
      };
      generateHelper([], 0);
      _stale = false;
      return _schedules;
    }

    function getScheduleById(scheduleId) {
      if (!_schedules.hasOwnProperty(scheduleId)) {
        scheduleId = Schedule.normalizeId(scheduleId);
      }
      return _schedules[scheduleId];
    }

    function getCurrScheduleId() {
      return _scheduleIdList[_currentScheduleIdx];
    }

    function getPrevScheduleId() {
      var l = _scheduleIdList.length;
      var prevScheduleIdx = (_currentScheduleIdx + l - 1) % l;
      return _scheduleIdList[prevScheduleIdx];
    }

    function getNextScheduleId() {
      var nextScheduleIdx = (_currentScheduleIdx + 1) % _scheduleIdList.length;
      return _scheduleIdList[nextScheduleIdx];
    }

    function setCurrentScheduleById(scheduleId) {
      if (!_schedules.hasOwnProperty(scheduleId)) {
        scheduleId = Schedule.normalizeId(scheduleId);
      }
      _currentScheduleIdx = _scheduleIdList.indexOf(scheduleId);
      if (_currentScheduleIdx < 0) {
        _currentScheduleIdx = 0;
      }
    }

    return {
      setStale: setStale,

      getAllCourses: getAllCourses,
      getCourseByCcn: getCourseByCcn,
      addCourse: addCourse,
      dropCourse: dropCourse,

      generateSchedules: generateSchedules,
      getScheduleById: getScheduleById,
      getCurrScheduleId: getCurrScheduleId,
      getPrevScheduleId: getPrevScheduleId,
      getNextScheduleId: getNextScheduleId,
      setCurrentScheduleById: setCurrentScheduleById
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
    vm.addedCoursesList = scheduleFactory.getAllCourses();
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

  CourseFindNewCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseFindNewCtrl($state, $window, courses, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.coursesList = [];
    vm.addedCoursesList = scheduleFactory.getAllCourses();
    vm.setSchedulesStale = setSchedulesStale;
    vm.addCourse = addCourse;
    vm.dropCourse = dropCourse;
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
  }
  angular.module('scheduleBuilder').controller('CourseFindNewCtrl', [
    '$state',
    '$window',
    'courses',
    'scheduleFactory',
    CourseFindNewCtrl
  ]);

  CourseViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.selectedCourse = scheduleFactory.getCourseByCcn($stateParams.ccn);
  }
  angular.module('scheduleBuilder').controller('CourseViewAndSelectCtrl', [
    '$state',
    '$window',
    '$stateParams',
    'scheduleFactory',
    CourseViewAndSelectCtrl
  ]);

  ScheduleCtrl.prototype = Object.create(BaseCtrl.prototype);
  function ScheduleCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.sampleSchedule = scheduleFactory.generateSchedules()[0];
    console.log(vm.sampleSchedule);
  }
  angular.module('scheduleBuilder').controller('ScheduleCtrl', [
    '$state',
    '$window',
    'scheduleFactory',
    ScheduleCtrl
  ]);

  ScheduleViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function ScheduleViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.selectedSchedule = scheduleFactory.getScheduleById($stateParams.scheduleId);
  }
  angular.module('scheduleBuilder').controller('ScheduleViewAndSelectCtrl', [
    '$state',
    '$window',
    '$stateParams',
    'scheduleFactory',
    ScheduleViewAndSelectCtrl
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
      templateUrl: 'assets/html/course_display_and_select.partial.html'
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

      vm.hours = [
        '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'
      ];
      vm.numHours = vm.hours.length;
      vm.halfHours = [
        '8AM', '8:30AM', '9AM', '9:30AM', '10AM', '10:30AM', '11AM', '11:30AM', '12PM',
        '12:30PM', '1PM', '1:30PM', '2PM', '2:30PM', '3PM', '3:30PM', '4PM', '4:30PM',
        '5PM', '5:30PM', '6PM', '6:30PM'
      ];
      vm.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      vm.getMeetingPosition = getMeetingPosition;
      vm.getMeetingHeight = getMeetingHeight;

      var dayHeight = 600;

      function getMeetingPosition(section) {
        var interval = section.time.split(' ', 2)[1];
        var offset = Schedule.intervalAbrvPositionOffsets[interval];
        return offset / vm.numHours * dayHeight;
      }

      function getMeetingHeight(section) {
        var interval = section.time.split(' ', 2)[1];
        var height = Schedule.intervalAbrvHeights[interval];
        return height / vm.numHours * dayHeight;
      }
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
      templateUrl: 'assets/html/schedule_display.partial.html'
    }
  }
  angular.module('scheduleBuilder').directive('sbScheduleDisplay', [
    sbScheduleDisplayDirective
  ]);

  function sbGenerateSchedulesDirective() {
    sbGenerateSchedulesCtrl.prototype = Object.create(BaseCtrl.prototype);
    function sbGenerateSchedulesCtrl($state, $window, scheduleFactory) {
      BaseCtrl.call(this, $state, $window);

      var vm = this;

      vm.message = 'Generate Schedule';
      vm.generateSchedulesAndView = generateSchedulesAndView;

      function generateSchedulesAndView() {
        scheduleFactory.generateSchedules();
        var currScheduleId = scheduleFactory.getCurrScheduleId();
        if (currScheduleId === undefined) {
          return;
        }
        vm.goToState('scheduleNew.viewSchedule', {
          scheduleId: currScheduleId
        });
      }
    }

    return {
      controller: [
        '$state',
        '$window',
        'scheduleFactory',
        sbGenerateSchedulesCtrl
      ],
      controllerAs: 'vm',
      templateUrl: 'assets/html/generate_schedules.partial.html'
    }
  }
  angular.module('scheduleBuilder').directive('sbGenerateSchedules', [
    sbGenerateSchedulesDirective
  ]);
})();