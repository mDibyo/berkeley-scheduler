var Time = require('../models/time');
var Schedule = require('../models/schedule');

var userIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';
var primaryUserIdCookieKey = 'primaryUserId';
var userIdListCookieKey = 'allUserIds';
var savedCoursesCookieKeyFormat = '{}.addedCourses';
var schedulingOptionsCookieKeyFormat = '{}.schedulingOptions';

function scheduleFactory($q, $cookies, reverseLookup) {
  var _ready = false;
  var _forReadyQs = [];
  var _setReadyListeners = [];
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
  var _currCourse = null;
  var _sections = {};
  var _addCourseListeners = [];
  var _dropCourseListeners = [];
  var _setCurrCourseListeners = [];

  var _schedules = {};
  var _allScheduleIdList = [];
  var _currScheduleIdList = [];
  var _currScheduleListInfoChangeListeners = {};
  var _currScheduleIdx = 0;
  var _schedulingOptions = _loadSchedulingOptionsFromCookie();
  var _orderByFns = {
    preferMornings: function(schedule) {
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
    },
    preferAfternoons: function(schedule) {
      var totalFor = 0, total = 0;
      for (var day in schedule.meetingsByDay) {
        var sections = schedule.meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.startTime.compareTo(Time.noon) >= 0) {
            if (sections[i].meeting.endTime.compareTo(Time.fivePM) <= 0) {
              totalFor ++;
            }
          }
        }
      }
      return totalFor / total;
    },
    preferEvenings: function(schedule) {
      var totalFor = 0, total = 0;
      for (var day in schedule.meetingsByDay) {
        var sections = schedule.meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.startTime.compareTo(Time.fivePM) >= 0) {
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
        if (sections.length > 0) {
          if (sections[0].meeting.startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
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
  $q.all(_forReadyQs).then(function() {
    _setReady();
  });

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

  function _loadSchedulingOptionsFromCookie() {
    var schedulingOptionsCookieKey =
      schedulingOptionsCookieKeyFormat.replace('{}', _primaryUserId);
    var schedulingOptions = $cookies.getObject(schedulingOptionsCookieKey);
    if (schedulingOptions === undefined) {
      schedulingOptions = {}
    }
    schedulingOptions.showOptions =
      schedulingOptions.showOptions || false;
    schedulingOptions.preferMornings =
      schedulingOptions.preferMornings || false;
    schedulingOptions.preferAfternoons =
      schedulingOptions.preferAfternoons || false;
    schedulingOptions.preferEvenings =
      schedulingOptions.preferEvenings || false;
    schedulingOptions.dayStartTime =
      schedulingOptions.dayStartTime || null;
    schedulingOptions.dayEndTime =
      schedulingOptions.dayEndTime || null;
    return schedulingOptions;
  }

  function _saveSchedulingOptionsToCookie() {
    var schedulingOptionsCookieKey =
      schedulingOptionsCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(schedulingOptionsCookieKey, _schedulingOptions);
  }

  function _loadCoursesFromCookieInto_Courses() {
    var savedCoursesCookieKey =
      savedCoursesCookieKeyFormat.replace('{}', _primaryUserId);
    var savedCourses = $cookies.getObject(savedCoursesCookieKey);
    if (!savedCourses) {
      return;
    }
    savedCourses.forEach(function(courseInfo) {
      _forReadyQs.push(
        reverseLookup.getCourseQBy1arySectionId(courseInfo.id).then(function(course) {
          course.sections.forEach(function(section) {
            if (courseInfo.unselectedSections.indexOf(section.id) >= 0) {
              section.selected = false;
            }
          });
          _addCourseNoSave(course);
        }));
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

  function isReady() {
    return _ready;
  }

  function _setReady() {
    _ready = true;
    _setReadyListeners.forEach(function(listener) {
      listener(_ready);
    });
  }

  function registerSetReadyListener(listener) {
    _setReadyListeners.push(listener);
  }

  function isStale() {
    return _stale;
  }

  function setStale(isStale) {
    _stale = isStale;
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

  function setCurrCourse(course) {
    _currCourse = course;
    _setCurrCourseListeners.forEach(function(listener) {
      listener(course);
    });
  }

  function registerSetCurrCourseListener(listener) {
    _setCurrCourseListeners.push(listener);
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
    setStale(true);
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
    setStale(true);
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
    _currScheduleIdList = _allScheduleIdList.slice();
    _currScheduleIdx = 0;
    setStale(false);

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
        filterSchedules();
        reorderSchedules();
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
      firstScheduleId: _currScheduleIdList[0],
      prevScheduleId: getPrevScheduleId(),
      nextScheduleId: getNextScheduleId()
    };
  }

  function _sendCurrScheduleListInfoChange(reloadRequired) {
    var info = getCurrScheduleListInfo();
    info.reloadRequired = reloadRequired;
    Object.keys(_currScheduleListInfoChangeListeners).forEach(function(tag) {
      _currScheduleListInfoChangeListeners[tag](info);
    });
  }

  function registerCurrScheduleListInfoChangeListener(tag, listener) {
    _currScheduleListInfoChangeListeners[tag] = listener;
  }

  function setCurrentScheduleById(scheduleId) {
    if (!_schedules.hasOwnProperty(scheduleId)) {
      scheduleId = Schedule.normalizeId(scheduleId);
    }
    var reloadRequired = false;
    _currScheduleIdx = _currScheduleIdList.indexOf(scheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
      reloadRequired = true;
    }

    _sendCurrScheduleListInfoChange(reloadRequired);
  }

  function getSchedulingOptions() {
    return angular.copy(_schedulingOptions);
  }

  function setSchedulingOption(option, choice) {
    _schedulingOptions[option] = choice;
    _saveSchedulingOptionsToCookie();
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

    var reloadRequired = false;
    _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
      reloadRequired = true;
    }

    _sendCurrScheduleListInfoChange(reloadRequired);
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

    var reloadRequired = false;
    _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
      reloadRequired = true;
    }

    _sendCurrScheduleListInfoChange(reloadRequired);
  }

  return {
    isReady: isReady,
    registerSetReadyListener: registerSetReadyListener,
    isStale: isStale,
    setStale: setStale,
    registerSetStaleListener: registerSetStaleListener,
    setInDisplayMode: setInDisplayMode,
    registerSetInDisplayModeListener: registerSetInDisplayModeListener,

    setCurrCourse: setCurrCourse,
    registerSetCurrCourseListener: registerSetCurrCourseListener,
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
