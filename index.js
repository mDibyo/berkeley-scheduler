(function() {
  'use strict';

  angular.module('scheduleBuilder', [
    'ui.router',
    'ngSanitize',
    'ngCookies',
    'ngMaterial'
  ])
    .config([
      '$stateProvider',
      '$urlRouterProvider',
      function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('schedule', {
            url: '/schedule',
            templateUrl: 'assets/html/schedule.html',
            controller: 'CourseFindCtrl',
            controllerAs: 'vm'
          })
          .state('schedule.viewCourse', {
            url: '/course/{id}',
            templateUrl: 'assets/html/course_view_and_select.partial.html',
            controller: 'CourseViewAndSelectCtrl',
            controllerAs: 'vm'
          })
          .state('schedule.viewSchedule', {
            url: '/{scheduleId}',
            templateUrl: 'assets/html/schedule_view_and_select.partial.html',
            controller: 'ScheduleViewAndSelectCtrl',
            controllerAs: 'vm'
          });

        $urlRouterProvider.otherwise('schedule');
      }
    ]);

  var sampleCoursesUrl = 'assets/json/sample_courses.json';
  var departmentsUrl = 'data/final/departments.json';
  var coursesUrlFormat = 'data/final/subject-areas/{}.json';

  function courses($http) {
    var sampleCoursesQ = $http.get(sampleCoursesUrl).then(function(response) {
      return response.data.map(function(courseJson) {
        return Course.parse(courseJson);
      });
    });
    function getSampleCoursesQ() {
      return sampleCoursesQ
    }

    var subjectAreasQ = $http.get(departmentsUrl).then(function(response) {
      var subjectAreas = response.data.subjectAreas;
      return Object.keys(subjectAreas).map(function(code) {
        return {
          code: code,
          description: subjectAreas[code]
        }
      });
    });
    function getSubjectAreasQ() {
      return subjectAreasQ;
    }

    var coursesQBySubjectArea = {};
    function getCoursesQBySubjectAreaCode(code) {
      if (code in coursesQBySubjectArea) {
        return coursesQBySubjectArea[code];
      }

      var alphabetizedCode = alphabetizeSubjectAreaCode(code);
      var coursesUrl = coursesUrlFormat.replace('{}', alphabetizedCode);
      var q = $http.get(coursesUrl).then(function(response) {
        var courses = response.data;
        return Object.keys(courses).map(function(displayName) {
          return Course.parse(courses[displayName]);
        });
      }, function() {
        return [];
      });
      coursesQBySubjectArea[code] = q;
      return q;
    }

    function alphabetizeSubjectAreaCode(code) {
      return code.replace(/\W/g, '');
    }

    return {
      getSampleCoursesQ: getSampleCoursesQ,
      getSubjectAreasQ: getSubjectAreasQ,
      getCoursesQBySubjectAreaCode: getCoursesQBySubjectAreaCode
    }
  }
  angular.module('scheduleBuilder').factory('courses', [
    '$http',
    courses
  ]);

  var savedCoursesCookieKey = 'addedCourses';

  function scheduleFactory($cookies) {
    var _stale = false;

    var _courses = {};
    var _sections = {};

    var _schedules = {};
    var _scheduleIdList = [];
    var _currentScheduleIdx = 0;

    //loadCoursesFromCookie();

    function loadCoursesFromCookie() {
      var savedCourses = $cookies.getObject(savedCoursesCookieKey);
      if (savedCourses != null) {
        savedCourses.forEach(function(course) {
          course.sections.forEach(function(section) {
            section.course = course;
          });
          addCourseNoSave(course);
        });
      }
    }

    function saveCoursesToCookie() {
      var coursesToSave = [];
      for (var id in _courses) {
        coursesToSave.push(_courses[id]);
      }
      //$cookies.putObject(savedCoursesCookieKey, coursesToSave);
    }

    function setStale() {
      _stale = true;
    }

    function getAllCourses() {
      var courses = [];
      for (var id in _courses) {
        courses.push(_courses[id]);
      }
      return courses;
    }

    function getCourseById(id) {
      if (_courses.hasOwnProperty(id)) {
        return _courses[id];
      }
      if (_sections.hasOwnProperty(id)) {
        return _sections[id].course;
      }
      return null;
    }

    function addCourseNoSave(course) {
      if (_courses.hasOwnProperty(course.id)) {
        return false;
      }
      _courses[course.id] = course;
      course.add();
      course.sections.forEach(function(section) {
        _sections[section.id] = section;
      });
      setStale();
      return true;
    }

    function addCourse(course) {
      var success = addCourseNoSave(course);
      if (success) {
        saveCoursesToCookie();
      }
      return success;
    }

    function dropCourseNoSave(course) {
      if (!_courses.hasOwnProperty(course.id)) {
        return false;
      }
      delete _courses[course.id];
      course.drop();
      course.sections.forEach(function(section) {
        delete _sections[section.id];
      });
      setStale();
      return true;
    }

    function dropCourse(course) {
      var success = dropCourseNoSave(course);
      if (success) {
        saveCoursesToCookie();
      }
      return success;
    }

    function generateSchedules() {
      if (!_stale) {
        return _schedules;
      }

      _schedules = {};
      _scheduleIdList = [];
      _currentScheduleIdx = 0;
      var sectionsByCourseType = [];
      for (var id in _courses) {
        var course = _courses[id];
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
      getCourseById: getCourseById,
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
    '$cookies',
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

    vm.generateSchedules = scheduleFactory.generateSchedules;

    var selectedCourse = null;
    courses.getSampleCoursesQ().then(function(courses) {
      vm.coursesList = courses;
    });
    courses.getSubjectAreasQ().then(function(subjectAreas) {
      vm.subjectAreasList = subjectAreas;
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
  angular.module('scheduleBuilder').controller('CourseFindCtrl', [
    '$state',
    '$window',
    'courses',
    'scheduleFactory',
    CourseFindCtrl
  ]);

  CourseViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.selectedCourse = scheduleFactory.getCourseById($stateParams.id);
  }
  angular.module('scheduleBuilder').controller('CourseViewAndSelectCtrl', [
    '$state',
    '$window',
    '$stateParams',
    'scheduleFactory',
    CourseViewAndSelectCtrl
  ]);

  ScheduleViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function ScheduleViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    scheduleFactory.setCurrentScheduleById($stateParams.scheduleId);
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

      vm.hours = [];
      vm.halfHours = [];
      vm.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      vm.getMeetingPosition = getMeetingPosition;
      vm.getMeetingHeight = getMeetingHeight;
      vm.getMeetingColor = getMeetingColor;

      vm.getPrevScheduleId = scheduleFactory.getPrevScheduleId;
      vm.getNextScheduleId = scheduleFactory.getNextScheduleId;

      var startHour = 8;
      var endHour = 19;
      var numHours = endHour - startHour;
      for (var h = startHour; h < endHour; h++) {
        vm.hours.push(new Time(h, 0));
        vm.halfHours.push(new Time(h, 0));
        vm.halfHours.push(new Time(h, 30));
      }

      var dayHeight = 600;
      var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();
      var dayTotalMinutes = (new Time(numHours, 0)).getTotalMinutes();

      function getMeetingPosition(section) {
        var interval = TimeInterval.parse(section.time.split(' ', 2)[1]);
        var offset = interval.startTime.getTotalMinutes() - startHourTotalMinutes;
        return offset / dayTotalMinutes * dayHeight;
      }

      function getMeetingHeight(section) {
        var interval = TimeInterval.parse(section.time.split(' ', 2)[1]);
        var height = interval.getTotalMinutes();
        return height / dayTotalMinutes * dayHeight;
      }

      function getMeetingColor(section) {
        return Course.colorCodes[section.course.color];
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
        vm.goToState('schedule.viewSchedule', {
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
      controllerAs: 'dvm',
      templateUrl: 'assets/html/generate_schedules.partial.html'
    }
  }
  angular.module('scheduleBuilder').directive('sbGenerateSchedules', [
    sbGenerateSchedulesDirective
  ]);
})();