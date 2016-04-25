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

  var departmentsUrl = 'data/final/departments.json';
  var coursesUrlFormat = 'data/final/fa16/classes/{}.json';

  function courses($http) {
    var _coursesQBySubjectArea = {};

    var _subjectAreasQ = $http.get(departmentsUrl).then(function(response) {
      var subjectAreas = response.data.subjectAreas;
      return Object.keys(subjectAreas).map(function(code) {
        return {
          code: code,
          description: subjectAreas[code]
        }
      });
    });

    function getSubjectAreasQ() {
      return _subjectAreasQ;
    }

    function getCoursesQBySubjectAreaCode(code) {
      if (code in _coursesQBySubjectArea) {
        return _coursesQBySubjectArea[code];
      }

      var alphabetizedCode = _alphabetizeSubjectAreaCode(code);
      var coursesUrl = coursesUrlFormat.replace('{}', alphabetizedCode);
      var q = $http.get(coursesUrl).then(function(response) {
        var courses = response.data;
        return Object.keys(courses).map(function(displayName) {
          return Course.parse(courses[displayName]);
        });
      }, function() {
        return [];
      });
      _coursesQBySubjectArea[code] = q;
      return q;
    }

    function _alphabetizeSubjectAreaCode(code) {
      return code.replace(/\W/g, '');
    }

    return {
      getSubjectAreasQ: getSubjectAreasQ,
      getCoursesQBySubjectAreaCode: getCoursesQBySubjectAreaCode
    }
  }
  angular.module('scheduleBuilder').factory('courses', [
    '$http',
    courses
  ]);

  var indicesUrlFormat = 'data/final/fa16/indices/{}.json';
  var _2aryTo1arySectionIdIndexUrl =
    indicesUrlFormat.replace('{}', '2ary-to-1ary-section-id');
  var _1arySectionIdToSubjectAreaIndexUrl =
    indicesUrlFormat.replace('{}', '1ary-section-id-to-subject-area');

  function reverseLookup($http, $q, courses) {
    var _coursesCache = {};

    var _2aryTo1arySectionIdIndexQ =
      $http.get(_2aryTo1arySectionIdIndexUrl).then(function(response) {
        return response.data;
      });

    var _1arySectionIdToSubjectAreaIndexQ =
      $http.get(_1arySectionIdToSubjectAreaIndexUrl).then(function(response) {
        return response.data;
      });

    function getCourseQBy1arySectionId(id) {
      if (id in _coursesCache) {
        var deferred = $q.defer();
        deferred.resolve(_coursesCache[id]);
        return deferred.promise;
      }
      return _1arySectionIdToSubjectAreaIndexQ.then(function(index) {
        return index[id];
      }).then(function(subjectAreaInfo) {
        return courses.getCoursesQBySubjectAreaCode(subjectAreaInfo[0])
          .then(function(courseList) {
            var courseNumber = subjectAreaInfo[1];
            for (var i = 0; i < courseList.length; i++) {
              if (courseList[i].courseNumber === courseNumber) {
                var course = courseList[i];
                _coursesCache[id] = course;
                return course;
              }
            }
          });
      });
    }

    function getCourseQBy2arySectionId(id) {
      if (id in _coursesCache) {
        var deferred = $q.defer();
        deferred.resolve(_coursesCache[id]);
        return deferred.promise;
      }
      return _2aryTo1arySectionIdIndexQ.then(function(index) {
        return index[id];
      }).then(getCourseQBy1arySectionId);
    }

    return {
      getCourseQBy1arySectionId: getCourseQBy1arySectionId,
      getCourseQBy2arySectionId: getCourseQBy2arySectionId
    }
  }
  angular.module('scheduleBuilder').factory('reverseLookup', [
    '$http',
    '$q',
    'courses',
    reverseLookup
  ]);

  var userIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var primaryUserIdCookieKey = 'primaryUserId';
  var userIdListCookieKey = 'allUserIds';
  var savedCoursesCookieKeyFormat = '{}.addedCourses';

  function scheduleFactory($q, $cookies, reverseLookup) {
    var _stale = false;
    var _setStaleListeners = [];
    var _inDisplayMode = false;
    var _setInDisplayModeListeners = [];

    var _cookieExpiryDate = (function() {
      var date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date;
    })();
    var _primaryUserId = _loadPrimaryUserIdFromCookie();
    var _userIdList = _loadUserIdListFromCookie();

    var _courses = {};
    var _sections = {};
    var _addCourseListeners = [];
    var _dropCourseListeners = [];

    var _schedules = {};
    var _allScheduleIdList = [];
    var _currScheduleIdList = [];
    var _currScheduleListInfoChangeListeners = [];
    var _currScheduleIdx = 0;
    var _schedulingOptions = {
      preferMornings: false,
      preferAfternoons: false,
      preferEvenings: false,
      dayStartTime: null,
      dayEndTime: null
    };
    var _orderByFns = {
      preferMornings: function(schedule) {
        if (!_schedulingOptions.preferMornings) {
          return 1;
        }

        var totalFor = 0, total = 0;
        for (var day in schedule.meetingsByDay) {
          var sections = schedule.meetingsByDay[day];
          for (var i = 0; i < sections.length; i++) {
            total ++;
            if (sections[i].meeting.endTime.compareTo(Time.noon) <= 0) {
              totalFor ++;
            }
          }
        }
        return totalFor / total;
      }
    };
    var _filterFns = {
      dayStartTime: function(schedule) {
        if (_schedulingOptions.dayStartTime == null) {
          return true;
        }

        for (var day in schedule.meetingsByDay) {
          var sections = schedule.meetingsByDay[day];
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].meeting.startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
              return false;
            }
          }
        }
        return true;
      },
      dayEndTime: function(schedule) {
        if (_schedulingOptions.dayEndTime == null) {
          return true;
        }

        for (var day in schedule.meetingsByDay) {
          var sections = schedule.meetingsByDay[day];
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].meeting.endTime.compareTo(_schedulingOptions.dayEndTime) > 0) {
              return false;
            }
          }
        }
        return true;
      }
    };

    _loadCoursesFromCookieInto_Courses();

    function _generateUserId() {
      var id = '';
      for (var i = 0; i < 10; i++) {
        id += userIdCharSet[Math.floor(Math.random() * userIdCharSet.length)]
      }
      return id;
    }

    function _loadPrimaryUserIdFromCookie() {
      var primaryUserId = $cookies.get(primaryUserIdCookieKey);
      if (primaryUserId === undefined) {
        primaryUserId = _generateUserId();
        $cookies.put(primaryUserIdCookieKey, primaryUserId,
          {expires: _cookieExpiryDate});
      }
      return primaryUserId;
    }

    function _loadUserIdListFromCookie() {
      var userIdList = $cookies.getObject(userIdListCookieKey);
      if (userIdList === undefined && _primaryUserId) {
        userIdList = [_primaryUserId];
        $cookies.putObject(userIdListCookieKey, _userIdList,
          {expires: _cookieExpiryDate});
      }
      return userIdList;
    }

    function _loadCoursesFromCookieInto_Courses() {
      var savedCoursesCookieKey =
        savedCoursesCookieKeyFormat.replace('{}', _primaryUserId);
      var savedCourses = $cookies.getObject(savedCoursesCookieKey);
      if (!savedCourses) {
        return;
      }
      savedCourses.forEach(function(courseInfo) {
        reverseLookup.getCourseQBy1arySectionId(courseInfo.id).then(function(course) {
          course.sections.forEach(function(section) {
            if (courseInfo.unselectedSections.indexOf(section.id) >= 0) {
              section.selected = false;
            }
          });
          _addCourseNoSave(course);
        })
      });
    }

    function _saveCoursesToCookie() {
      var courseInfosToSave = [];
      for (var id in _courses) {
        var selectedSections = [], unselectedSections = [];
        _courses[id].sections.forEach(function(section) {
          if (section.selected) {
            selectedSections.push(section.id);
          } else {
            unselectedSections.push(section.id);
          }
        });
        courseInfosToSave.push({
          id: id,
          selectedSections: selectedSections,
          unselectedSections: unselectedSections
        });
      }
      var savedCoursesCookieKey =
        savedCoursesCookieKeyFormat.replace('{}', _primaryUserId);
      $cookies.putObject(savedCoursesCookieKey, courseInfosToSave,
        {expires: _cookieExpiryDate});
    }

    function isStale() {
      return _stale;
    }

    function setStale() {
      _stale = true;
      _saveCoursesToCookie();
      _setStaleListeners.forEach(function(listener) {
        listener(_stale);
      })
    }

    function registerSetStaleListener(listener) {
      _setStaleListeners.push(listener);
    }

    function setInDisplayMode(inDisplayMode) {
      _inDisplayMode = inDisplayMode;
      _setInDisplayModeListeners.forEach(function(listener) {
        listener(inDisplayMode);
      });
    }

    function registerSetInDisplayModeListener(listener) {
      _setInDisplayModeListeners.push(listener);
    }

    function getAllCourses() {
      var courses = [];
      for (var id in _courses) {
        courses.push(_courses[id]);
      }
      return courses;
    }

    function getCourseQById(id) {
      if (_courses.hasOwnProperty(id)) {
        var deferred = $q.defer();
        deferred.resolve(_courses[id]);
        return deferred.promise;
      }
      var courseQ = reverseLookup.getCourseQBy2arySectionId(id);
      courseQ.then(addCourse);
      return courseQ;
    }

    function _addCourseNoSave(course) {
      if (_courses.hasOwnProperty(course.id)) {
        return false;
      }
      _courses[course.id] = course;
      course.add();
      course.sections.forEach(function(section) {
        _sections[section.id] = section;
      });
      setStale();
      _addCourseListeners.forEach(function(listener) {
        listener(course);
      });
      return true;
    }

    function addCourse(course) {
      var success = _addCourseNoSave(course);
      if (success) {
        _saveCoursesToCookie();
      }
      return success;
    }

    function _dropCourseNoSave(course) {
      if (!_courses.hasOwnProperty(course.id)) {
        return false;
      }
      delete _courses[course.id];
      course.drop();
      course.sections.forEach(function(section) {
        delete _sections[section.id];
      });
      setStale();
      _dropCourseListeners.forEach(function(listener) {
        listener(course);
      });
      return true;
    }

    function dropCourse(course) {
      var success = _dropCourseNoSave(course);
      if (success) {
        _saveCoursesToCookie();
      }
      return success;
    }

    function registerAddCourseListener(listener) {
      _addCourseListeners.push(listener);
    }

    function registerDropCourseListener(listener) {
      _dropCourseListeners.push(listener);
    }

    function generateSchedules() {
      if (!_stale) {
        return _schedules;
      }

      _schedules = {};
      _allScheduleIdList = [];
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
            var schedule = new Schedule(_primaryUserId, a);
            _schedules[schedule.id] = schedule;
            _allScheduleIdList.push(schedule.id);
          } else {
            generateHelper(a, n+1);
          }
        }
      };
      generateHelper([], 0);
      _stale = false;
      _currScheduleIdList = _allScheduleIdList.slice();
      _currScheduleIdx = 0;

      _sendCurrScheduleListInfoChange();
      return _schedules;
    }

    function getScheduleQById(scheduleId) {
      var userId = Schedule.getUserIdFromId(scheduleId);
      var isPrimaryUser = userId == _primaryUserId;
      if (!isPrimaryUser) {
        setInDisplayMode(true);
      }
      var deferred = $q.defer();
      if (_schedules.hasOwnProperty(scheduleId)) {
        deferred.resolve(_schedules[scheduleId]);
        return deferred.promise;
      }
      scheduleId = Schedule.normalizeId(scheduleId);
      if (_schedules.hasOwnProperty(scheduleId)) {
        deferred.resolve(_schedules[scheduleId]);
        return deferred.promise;
      }

      var sectionIdList = Schedule.getSectionIdsFromId(scheduleId);
      var sectionList = [];
      var sectionLookupQList = [];
      sectionIdList.forEach(function(sectionId) {
        if (_sections.hasOwnProperty(sectionId)) {
          sectionList.push(_sections[sectionId]);
        } else {
          sectionLookupQList.push(reverseLookup
            .getCourseQBy2arySectionId(sectionId)
            .then(function(course) {
              if (isPrimaryUser) {
                _stale = true;
                if (_addCourseNoSave(course)) {
                  // This was the first time the course was added.
                  // Only select this section.
                  course.sections.forEach(function (section) {
                    if (section.id === sectionId) {
                      section.selected = true;
                      sectionList.push(section);
                    } else {
                      section.selected = false;
                    }
                  });
                } else {
                  // The course has already been added previously.
                  // Ensure this section is selected.
                  course = _courses[course.id];
                  for (var i = 0; i < course.sections.length; i++) {
                    var section = course.sections[i];
                    if (section.id === sectionId) {
                      sectionList.push(section);
                      section.selected = true;
                      break;
                    }
                  }
                }
              } else {
                course.add();
                for (var j = 0; j < course.sections.length; j++) {
                  if (course.sections[j].id === sectionId) {
                    sectionList.push(course.sections[j]);
                    break;
                  }
                }
              }
            }));
        }
      });
      return $q.all(sectionLookupQList).then(function() {
        var schedule = new Schedule(userId, sectionList);
        _schedules[schedule.id] = schedule;
        if (isPrimaryUser) {
          generateSchedules();
        }
        return schedule;
      });
    }

    function getCurrScheduleId() {
      return _currScheduleIdList[_currScheduleIdx];
    }

    function getPrevScheduleId() {
      var l = _currScheduleIdList.length;
      var prevScheduleIdx = (_currScheduleIdx + l - 1) % l;
      return _currScheduleIdList[prevScheduleIdx];
    }

    function getNextScheduleId() {
      var nextScheduleIdx = (_currScheduleIdx + 1) % _currScheduleIdList.length;
      return _currScheduleIdList[nextScheduleIdx];
    }

    function getCurrScheduleListInfo() {
      return {
        total: _currScheduleIdList.length,
        currentIdx: _currScheduleIdx,
        prevScheduleId: getPrevScheduleId(),
        nextScheduleId: getNextScheduleId()
      };
    }

    function _sendCurrScheduleListInfoChange() {
      var info = getCurrScheduleListInfo();
      _currScheduleListInfoChangeListeners.forEach(function(listener) {
        listener(info);
      });
    }

    function registerCurrScheduleListInfoChangeListener(listener) {
      _currScheduleListInfoChangeListeners.push(listener);
    }

    function setCurrentScheduleById(scheduleId) {
      if (!_schedules.hasOwnProperty(scheduleId)) {
        scheduleId = Schedule.normalizeId(scheduleId);
      }
      _currScheduleIdx = _currScheduleIdList.indexOf(scheduleId);
      if (_currScheduleIdx < 0) {
        _currScheduleIdx = 0;
      }

      _sendCurrScheduleListInfoChange();
    }

    function getSchedulingOptions() {
      return angular.copy(_schedulingOptions);
    }

    function setSchedulingOption(option, choice) {
      _schedulingOptions[option] = choice;
    }

    function filterSchedules() {
      var currScheduleId = getCurrScheduleId();

      _currScheduleIdList = _allScheduleIdList.slice();
      Object.keys(_filterFns).forEach(function (option) {
        var fn = _filterFns[option];
        _currScheduleIdList = _currScheduleIdList.filter(function (scheduleId) {
          return fn(_schedules[scheduleId]);
        });
      });

      _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
      if (_currScheduleIdx < 0) {
        _currScheduleIdx = 0;
      }

      _sendCurrScheduleListInfoChange();
    }

    function reorderSchedules() {
      var currScheduleId = getCurrScheduleId();

      var orderByOptions = Object.keys(_orderByFns);
      var orderByValues = {};
      var schedule, value;
      _currScheduleIdList.sort(function(a, b) {
        if (!orderByValues.hasOwnProperty(a)) {
          schedule = _schedules[a];
          value = 0;
          orderByOptions.forEach(function(option) {
            if (_schedulingOptions[option]) {
              value += _orderByFns[option](schedule);
            }
          });
          orderByValues[a] = value;
        }
        if (!orderByValues.hasOwnProperty(b)) {
          schedule = _schedules[b];
          value = 0;
          orderByOptions.forEach(function(option) {
            if (_schedulingOptions[option]) {
              value += _orderByFns[option](schedule);
            }
          });
          orderByValues[b] = value;
        }
        return orderByValues[b] - orderByValues[a];
      });

      _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
      if (_currScheduleIdx < 0) {
        _currScheduleIdx = 0;
      }

      _sendCurrScheduleListInfoChange();
    }

    return {
      isStale: isStale,
      setStale: setStale,
      registerSetStaleListener: registerSetStaleListener,
      setInDisplayMode: setInDisplayMode,
      registerSetInDisplayModeListener: registerSetInDisplayModeListener,

      getAllCourses: getAllCourses,
      getCourseQById: getCourseQById,
      addCourse: addCourse,
      registerAddCourseListener: registerAddCourseListener,
      dropCourse: dropCourse,
      registerDropCourseListener: registerDropCourseListener,

      generateSchedules: generateSchedules,
      getScheduleQById: getScheduleQById,
      getCurrScheduleId: getCurrScheduleId,
      getPrevScheduleId: getPrevScheduleId,
      getNextScheduleId: getNextScheduleId,
      getCurrScheduleListInfo: getCurrScheduleListInfo,
      registerCurrScheduleListInfoChangeListener: registerCurrScheduleListInfoChangeListener,
      setCurrentScheduleById: setCurrentScheduleById,
      getSchedulingOptions: getSchedulingOptions,
      setSchedulingOption: setSchedulingOption,
      filterSchedules: filterSchedules,
      reorderSchedules: reorderSchedules
    };
  }
  angular.module('scheduleBuilder').factory('scheduleFactory', [
    '$q',
    '$cookies',
    'reverseLookup',
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
    vm.inDisplayMode = false;
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

    scheduleFactory.registerAddCourseListener(function(course) {
      vm.addedCoursesList.push(course);
    });

    scheduleFactory.registerDropCourseListener(function(course) {
      vm.addedCoursesList.remove(course);
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

  CourseViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.selectedCourse = null;
    scheduleFactory.getCourseQById($stateParams.id).then(function(course) {
      vm.selectedCourse = course;
    });
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

    var scheduleId = $stateParams.scheduleId;
    if (scheduleId) {
      scheduleFactory.setCurrentScheduleById($stateParams.scheduleId);
      scheduleFactory.getScheduleQById($stateParams.scheduleId).then(function(schedule) {
        vm.selectedSchedule = schedule;
      });
    }
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
    var hours = [];
    var halfHours = [];
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    var startHour = 8;
    var endHour = 19;
    var numHours = endHour - startHour;
    for (var h = startHour; h < endHour; h++) {
      hours.push(new Time(h, 0));
      halfHours.push(new Time(h, 0));
      halfHours.push(new Time(h, 30));
    }

    var dayHeight = 600;
    var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();
    var dayTotalMinutes = (new Time(numHours, 0)).getTotalMinutes();

    sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
    function sbScheduleDisplayCtrl($state, $window, scheduleFactory) {
      BaseCtrl.call(this, $state, $window);

      var vm = this;

      vm.hours = hours;
      vm.halfHours = halfHours;
      vm.days = days;
      vm.currScheduleListInfo = scheduleFactory.getCurrScheduleListInfo();
      vm.getMeetingPosition = getMeetingPosition;
      vm.getMeetingHeight = getMeetingHeight;
      vm.getMeetingColor = getMeetingColor;

      scheduleFactory.registerCurrScheduleListInfoChangeListener(function(info) {
        vm.currScheduleListInfo = info;
        vm.goToState('schedule.viewSchedule', {
          scheduleId: scheduleFactory.getCurrScheduleId()
        });
      });

      function getMeetingPosition(section) {
        var offset = section.meeting.startTime.getTotalMinutes() - startHourTotalMinutes;
        return offset / dayTotalMinutes * dayHeight;
      }

      function getMeetingHeight(section) {
        var height = section.meeting.getTotalMinutes();
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

      var hours = [];
      var halfHours = [];
      var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      var startHour = 8;
      var endHour = 19;
      //var numHours = endHour - startHour;
      for (var h = startHour; h < endHour; h++) {
        hours.push(new Time(h, 0));
        halfHours.push(new Time(h, 0));
        halfHours.push(new Time(h, 30));
      }
      hours.push(new Time(h, 0));
      halfHours.push(new Time(h, 0));

      var schedulingOptions = scheduleFactory.getSchedulingOptions();

      vm.scheduleIsStale = scheduleFactory.isStale();
      vm.showOptions = false;
      vm.viewSchedules = viewSchedules;
      vm.generateAndViewSchedules = generateAndViewSchedules;
      vm.toggleOptions = toggleOptions;
      vm.reorderSchedules = reorderSchedules;
      vm.refilterAndReorderSchedules = refilterAndReorderSchedules;

      vm.preferMornings = schedulingOptions.preferMornings;
      vm.preferAfternoons = schedulingOptions.preferAfternoons;
      vm.preferEvenings = schedulingOptions.preferEvenings;
      vm.selectedDayStartTimeJson = schedulingOptions.dayStartTime;
      vm.selectedDayEndTimeJson = schedulingOptions.dayEndTime;
      vm.dayStartTimes = halfHours;
      vm.dayEndTimes = halfHours;
      vm.onChangePreferMornings = onChangePreferMornings;
      vm.onChangePreferAfternoons = onChangePreferAfternoons;
      vm.onChangePreferEvenings = onChangePreferEvenings;
      vm.onSelectDayStartTime = onSelectDayStartTime;
      vm.onSelectDayEndTime = onSelectDayEndTime;

      scheduleFactory.registerSetStaleListener(function(isStale) {
        vm.scheduleIsStale = isStale;
      });

      function viewSchedules() {
        var currScheduleId = scheduleFactory.getCurrScheduleId();
        if (currScheduleId === undefined) {
          return;
        }
        vm.goToState('schedule.viewSchedule', {
          scheduleId: currScheduleId
        });
      }

      function generateAndViewSchedules() {
        scheduleFactory.generateSchedules();
        scheduleFactory.filterSchedules();
        scheduleFactory.reorderSchedules();
        viewSchedules();
      }

      function toggleOptions() {
        vm.showOptions = !vm.showOptions;
      }

      function reorderSchedules() {
        // TODO
      }

      function refilterAndReorderSchedules() {
        // TODO
        reorderSchedules()
      }

      function onChangePreferMornings() {
        scheduleFactory.setSchedulingOption('preferMornings', vm.preferMornings);
      }

      function onChangePreferAfternoons() {
        scheduleFactory.setSchedulingOption('preferMornings', vm.preferAfternoons);
      }

      function onChangePreferEvenings() {
        scheduleFactory.setSchedulingOption('preferMornings', vm.preferEvenings);
      }

      function onSelectDayStartTime() {
        var times = halfHours.slice();
        var selectedDayStartTime = Time.parse(vm.selectedDayStartTimeJson);
        while (times.length > 0 && times[0].compareTo(selectedDayStartTime) < 0) {
          times.shift()
        }
        vm.dayEndTimes = times;

        scheduleFactory.setSchedulingOption('dayStartTime', selectedDayStartTime);
        scheduleFactory.filterSchedules();
      }

      function onSelectDayEndTime() {
        var times = halfHours.slice();
        var selectedDayEndTime = Time.parse(vm.selectedDayEndTimeJson);
        while (times.length > 0 && times[times.length-1].compareTo(selectedDayEndTime) > 0) {
          times.pop()
        }
        vm.dayStartTimes = times;

        scheduleFactory.setSchedulingOption('dayEndTime', selectedDayEndTime);
        scheduleFactory.filterSchedules();
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