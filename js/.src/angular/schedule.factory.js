var Time = require('../models/time');
var Schedule = require('../models/schedule');

var userIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';
var primaryUserIdCookieKey = 'primaryUserId';
var userIdListCookieKey = 'allUserIds';
var preferencesCookieKeyFormat = '{}.preferences';
var savedCoursesCookieKeyFormat = '{}.addedCourses';
var savedSchedulesCookieKeyFormat = '{}.savedSchedules';
var schedulingOptionsCookieKeyFormat = '{}.schedulingOptions';

function scheduleFactory($q, $timeout, $cookies, reverseLookup) {
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
  var _preferences = _loadPreferencesFromCookie();

  var _courses = {};
  var _currCourse = null;
  var _sections = {};
  var _addCourseListeners = [];
  var _dropCourseListeners = [];
  var _setCurrCourseListeners = [];

  var _schedules = {};
  var _savedSchedules = [];
  var _addSavedScheduleListeners = [];
  var _dropSavedScheduleListeners = [];
  var _allScheduleIdList = [];
  var _currScheduleIdList = [];
  var _currScheduleListInfoChangeListeners = {};
  var _currScheduleIdx = 0;
  var _schedulingOptions = _loadSchedulingOptionsFromCookie();
  var _orderByFns = {
    minimizeGaps: minimizeGaps,
    maximizeGaps: maximizeGaps,
    preferMornings: preferMornings,
    preferAfternoons: preferAfternoons,
    preferEvenings: preferEvenings,
    preferNoTimeConflicts: preferNoTimeConflicts
  };
  var _filterFns = {
    noTimeConflicts: noTimeConflicts,
    dayStartTime: dayStartTime,
    dayEndTime: dayEndTime
  };
  _loadCoursesFromCookieInto_courses();
  _loadSchedulesFromCookieInto_savedSchedules();
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

  function _loadPreferencesFromCookie() {
    var preferencesCookieKey =
      preferencesCookieKeyFormat.replace('{}', _primaryUserId);
    var preferences = $cookies.getObject(preferencesCookieKey) || {};
    if (preferences.showMobUnoptDialog === undefined) {
      preferences.showMobUnoptDialog = true;
    }
    return preferences;
  }

  function _savePreferencesToCookie() {
    var preferencesCookieKey =
      preferencesCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(preferencesCookieKey, _preferences);
  }

  function _loadSchedulingOptionsFromCookie() {
    var schedulingOptionsCookieKey =
      schedulingOptionsCookieKeyFormat.replace('{}', _primaryUserId);
    var schedulingOptions = $cookies.getObject(schedulingOptionsCookieKey) || {};
    schedulingOptions.showSavedSchedules =
      schedulingOptions.showSavedSchedules || false;
    schedulingOptions.showOptions =
      schedulingOptions.showOptions || false;
    schedulingOptions.minimizeGaps =
      schedulingOptions.minimizeGaps || false;
    schedulingOptions.maximizeGaps =
      schedulingOptions.maximizeGaps || false;
    schedulingOptions.preferMornings =
      schedulingOptions.preferMornings || false;
    schedulingOptions.preferAfternoons =
      schedulingOptions.preferAfternoons || false;
    schedulingOptions.preferEvenings =
      schedulingOptions.preferEvenings || false;
    schedulingOptions.preferNoTimeConflicts =
      schedulingOptions.preferNoTimeConflicts || false;
    schedulingOptions.dayStartTime =
      schedulingOptions.dayStartTime || null;
    schedulingOptions.dayEndTime =
      schedulingOptions.dayEndTime || null;
    if (schedulingOptions.noTimeConflicts === undefined) {
      schedulingOptions.noTimeConflicts = true;
    }
    schedulingOptions.showFinalsSchedule =
      schedulingOptions.showFinalsSchedule || false;
    return schedulingOptions;
  }

  function _saveSchedulingOptionsToCookie() {
    var schedulingOptionsCookieKey =
      schedulingOptionsCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(schedulingOptionsCookieKey, _schedulingOptions);
  }

  function _loadCoursesFromCookieInto_courses() {
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

  function _loadSchedulesFromCookieInto_savedSchedules() {
    var savedSchedulesCookieKey =
      savedSchedulesCookieKeyFormat.replace('{}', _primaryUserId);
    var savedSchedules = $cookies.getObject(savedSchedulesCookieKey);
    if (!savedSchedules) {
      return;
    }
    savedSchedules.forEach(function(scheduleId) {
      getScheduleQById(scheduleId).then(function(schedule) {
        _addSavedScheduleNoSave(schedule);
      })
    });
  }

  function _saveSchedulesToCookie() {
    var scheduleInfosToSave = _savedSchedules.map(function(schedule) {
      return schedule.id;
    });
    var savedSchedulesCookieKey =
      savedSchedulesCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(savedSchedulesCookieKey, scheduleInfosToSave,
      {expires: _cookieExpiryDate});
  }

  // Order by functions
  function maximizeGaps(schedule) {
    var total = 0;
    var section, horizon, i, gap;
    for (var day in schedule.meetingsByDay) {
      var sections = schedule.meetingsByDay[day];
      if (sections.length >= 2) {
        horizon = sections[0].meeting.endTime.getTotalMinutes();
        for (i = 1; i < sections.length; i++) {
          section = sections[i];
          if (horizon > 0) {
            gap = section.meeting.startTime.getTotalMinutes() - horizon;
            total += Math.max(0, gap) / 60;
          }
          horizon = Math.max(horizon, section.meeting.endTime.getTotalMinutes());
        }
      }
    }
    return total;
  }

  function minimizeGaps(schedule) {
    return 1 - _orderByFns.maximizeGaps(schedule);
  }

  function preferMornings(schedule) {
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

  function preferAfternoons(schedule) {
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
  }

  function preferEvenings(schedule) {
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

  function preferNoTimeConflicts(schedule) {
    var numConflicts = 0, total = 0;
    var section, horizon, i;
    for (var day in schedule.meetingsByDay) {
      var sections = schedule.meetingsByDay[day];
      total += sections.length;
      if (sections.length >= 2) {
        horizon = sections[0].meeting.endTime.getTotalMinutes();
        for (i = 1; i < sections.length; i++) {
          section = sections[i];
          if (horizon > 0) {
            if (section.meeting.startTime.getTotalMinutes() < horizon) {
              numConflicts ++;
            }
          }
          horizon = Math.max(horizon, section.meeting.endTime.getTotalMinutes());
        }
      }
    }
    return numConflicts / total;
  }

  // Filter functions
  function noTimeConflicts(schedule) {
    if (!_schedulingOptions.noTimeConflicts) {
      return true;
    }

    var section, horizon, i;
    for (var day in schedule.meetingsByDay) {
      var sections = schedule.meetingsByDay[day];
      if (sections.length >= 2) {
        horizon = sections[0].meeting.endTime.getTotalMinutes();
        for (i = 1; i < sections.length; i++) {
          section = sections[i];
          if (horizon > 0) {
            if (section.meeting.startTime.getTotalMinutes() < horizon) {
              return false;
            }
          }
          horizon = Math.max(horizon, section.meeting.endTime.getTotalMinutes());
        }
      }
    }
    return true;
  }

  function dayStartTime(schedule) {
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
  }

  function dayEndTime(schedule) {
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

  function getPreferences() {
    return angular.copy(_preferences);
  }

  function setPreference(preference, choice) {
    _preferences[preference] = choice;
    _savePreferencesToCookie();
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

  function generateSchedulesQ() {
    return $timeout(function() {
      if (!_stale) {
        return;
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
    });
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
        generateSchedulesQ().then(function() {
          filterSchedules();
          reorderSchedules();
        });
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

  function _sendCurrScheduleListInfoChange(scheduleListChanged) {
    var info = getCurrScheduleListInfo();
    info.scheduleListChanged = scheduleListChanged;
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
    var scheduleListChanged = false;
    _currScheduleIdx = _currScheduleIdList.indexOf(scheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
      scheduleListChanged = true;
    }

    _sendCurrScheduleListInfoChange(scheduleListChanged);
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

    var scheduleListChanged = true;
    _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
    }

    _sendCurrScheduleListInfoChange(scheduleListChanged);
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

    var scheduleListChanged = true;
    _currScheduleIdx = _currScheduleIdList.indexOf(currScheduleId);
    if (_currScheduleIdx < 0) {
      _currScheduleIdx = 0;
    }

    _sendCurrScheduleListInfoChange(scheduleListChanged);
  }

  function getSavedSchedules() {
    return _savedSchedules.slice();
  }

  function _addSavedScheduleNoSave(schedule) {
    if (_savedSchedules.some(function(savedSchedule) {
        return savedSchedule.id === schedule.id;
      })) {
      return false;
    }
    _savedSchedules.push(schedule);
    _addSavedScheduleListeners.forEach(function(listener) {
      listener(schedule);
    });
    return true;
  }

  function addSavedSchedule(schedule) {
    var success = _addSavedScheduleNoSave(schedule);
    if (success) {
      _saveSchedulesToCookie();
    }
    return success;
  }

  function registerAddSavedScheduleListener(listener) {
    _addSavedScheduleListeners.push(listener);
  }

  function _dropSavedScheduleNoSave(schedule) {
    var index = _savedSchedules.findIndex(function(savedSchedule) {
      return savedSchedule.id === schedule.id;
    });
    if (index < 0) {
      return false;
    }
    _savedSchedules.splice(index, 1);
    _dropSavedScheduleListeners.forEach(function(listener) {
      listener(schedule);
    });
    return true;
  }

  function dropSavedSchedule(schedule) {
    var success = _dropSavedScheduleNoSave(schedule);
    if (success) {
      _saveSchedulesToCookie();
    }
    return success;
  }

  function registerDropSavedScheduleListener(listener) {
    _dropSavedScheduleListeners.push(listener);
  }

  return {
    getPreferences: getPreferences,
    setPreference: setPreference,

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

    generateSchedulesQ: generateSchedulesQ,
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
    reorderSchedules: reorderSchedules,
    getSavedSchedules: getSavedSchedules,
    addSavedSchedule: addSavedSchedule,
    dropSavedSchedule: dropSavedSchedule,
    registerAddSavedScheduleListener: registerAddSavedScheduleListener,
    registerDropSavedScheduleListener: registerDropSavedScheduleListener
  };
}

var ScheduleGroup = require('../models/scheduleGroup');

function scheduleFactoryNew($q, $timeout, reverseLookup) {
  var _primaryUserId = 'samplePrimaryUserId';
  var _schedulingOptions = {};
  var _courses = {};
  var _currentScheduleGroup = null;
  var _scheduleIdsByFootprint = {};
  var _footprintList = [];
  var _filterFns = {};
  var _orderByFns = {};


  function generateSchedulesQ() {
    return $timeout(function() {
      // Get selected course
      var selectedCourses = Object.keys(_courses).map(function(courseId) {
        return _courses[courseId];
      }).filter(function(course) {
        return course.selected;
      });

      // Get Schedule Group
      _currentScheduleGroup = new ScheduleGroup(_primaryUserId, selectedCourses);

      // Map schedules to footprints
      _scheduleIdsByFootprint = {};
      var footprint = null;
      var schedule = _currentScheduleGroup.nextSchedule();
      while (schedule != null) {
        footprint = schedule.getTimeFootprint();
        if (!scheduleIdsByFootprint.hasOwnProperty(footprint)) {
          scheduleIdsByFootprint[footprint] = [];
        }
        scheduleIdsByFootprint[footprint].push(schedule.id);
      }

      // Filter footprints
      _footprintList = Object.keys(scheduleIdsByFootprint);
      Object.keys(_filterFns).forEach(function(filterFn) {
        _footprintList = _footprintList.filter(function(footprint) {
          return filterFn(footprint);
        });
      });

      // Reorder footprints
      var orderByOptions = Object.keys(_orderByFns).filter(function(option) {
        return _schedulingOptions[option];
      });
      var orderByValues = {};
      var value;
      _footprintList.sort(function(a, b) {
        if (!orderByValues.hasOwnProperty(a)) {
          value = 0;
          orderByOptions.forEach(function(option) {
            value += _orderByFns[option](a);
          });
          orderByValues[a] = value;
        }
        if (!orderByValues.hasOwnProperty(b)) {
          value = 0;
          orderByOptions.forEach(function(option) {
            value += _orderByFns[option](b);
          });
          orderByValues[b] = value;
        }
        return orderByValues[b] - orderByValues[a];
      });
    });
  }
  return {}
}

angular.module('scheduleBuilder').factory('scheduleFactory', [
  '$q',
  '$timeout',
  '$cookies',
  'reverseLookup',
  scheduleFactory
]);
