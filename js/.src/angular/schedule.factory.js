var Time = require('../models/time');
var Schedule = require('../models/schedule');
var ScheduleGroup = require('../models/scheduleGroup');
var scheduleGenerationStatus = require('../models/scheduleGenerationStatus');

var userIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';
var generatingSchedulesInstanceIdCharSet = userIdCharSet;
var primaryUserIdCookieKey = 'primaryUserId';
var userIdListCookieKey = 'allUserIds';
var preferencesCookieKeyFormat = '{}.preferences';
var savedCoursesCookieKeyFormat = '{}.addedCourses';
var savedScheduleIdsCookieKeyFormat = '{}.savedScheduleIds';
var schedulingOptionsCookieKeyFormat = '{}.schedulingOptions';

function scheduleFactory($q, $timeout, $cookies, reverseLookup) {
  var _ready = false;
  var _forReadyQs = [];
  var _setReadyListeners = [];
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
  var _sections = {};
  var _addCourseListeners = [];
  var _dropCourseListeners = [];

  var _savedScheduleIds = [];
  var _addSavedScheduleIdListeners = [];
  var _dropSavedScheduleIdListeners = [];
  var _currScheduleGroup = null;
  var _scheduleIdsByFp = {};
  var _currFpList = [];
  var _generatingSchedulesStops = {};
  var _generatingSchedulesQ = null;
  var _lastScheduleGenerationStatus = scheduleGenerationStatus.Stale();
  var _scheduleGenerationStatusListeners = {};
  var _currScheduleListInfoChangeListeners = {};
  var _currFpIdx = 0;
  var _currFpScheduleIdx = 0;
  var _currScheduleIdx = 0;
  var _numSchedules = 0;
  var _schedulingOptions = _loadSchedulingOptionsFromCookie();
  //var _orderByFns = {
  //  minimizeGaps: minimizeGaps,
  //  maximizeGaps: maximizeGaps,
  //  preferMornings: preferMornings,
  //  preferAfternoons: preferAfternoons,
  //  preferEvenings: preferEvenings,
  //  preferNoTimeConflicts: preferNoTimeConflicts
  //};
  //var _filterFns = {
  //  noTimeConflicts: noTimeConflicts,
  //  dayStartTime: dayStartTime,
  //  dayEndTime: dayEndTime
  //};


  var _orderByFns = {
    minimizeGaps: function(footprint) {
      return - _orderByFns.maximizeGaps(footprint);
    },
    maximizeGaps: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var total = 0, section, horizon, i, gap;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    },
    preferMornings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.endTime.compareTo(Time.noon) <= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferAfternoons: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    preferEvenings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.startTime.compareTo(Time.fivePM) >= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferNoTimeConflicts: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var numConflicts = 0, total = 0;
      var section, horizon, i;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
  };
  var _filterFns = {
    noTimeConflicts: function(footprint) {
      if (!_schedulingOptions.noTimeConflicts) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      var section, horizon, i;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    },
    dayStartTime: function(footprint) {
      if (_schedulingOptions.dayStartTime == null) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        if (sections.length > 0) {
          if (sections[0].meeting.startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
            return false;
          }
        }
      }
      return true;
    },
    dayEndTime: function(footprint) {
      if (_schedulingOptions.dayEndTime == null) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].meeting.endTime.compareTo(_schedulingOptions.dayEndTime) > 0) {
            return false;
          }
        }
      }
      return true;
    }
  };

  _loadCoursesFromCookieInto_courses();
  _loadScheduleIdsFromCookieInto_savedScheduleIds();
  $q.all(_forReadyQs).then(function() {
    _setReady();
  });

  function _generateId(charSet, numChars) {
    var id = '';
    for (var i = 0; i < numChars; i++) {
      id += charSet[Math.floor(Math.random() * charSet.length)]
    }
    return id;
  }

  function _loadPrimaryUserIdFromCookie() {
    var primaryUserId = $cookies.get(primaryUserIdCookieKey);
    if (primaryUserId === undefined) {
      primaryUserId = _generateId(userIdCharSet, 10);
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
          course.selected = courseInfo.selected === undefined || courseInfo.selected;
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
        selected: _courses[id].selected,
        selectedSections: selectedSections,
        unselectedSections: unselectedSections
      });
    }
    var savedCoursesCookieKey =
      savedCoursesCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(savedCoursesCookieKey, courseInfosToSave,
      {expires: _cookieExpiryDate});
  }

  function _loadScheduleIdsFromCookieInto_savedScheduleIds() {
    var savedScheduleIdsCookieKey =
      savedScheduleIdsCookieKeyFormat.replace('{}', _primaryUserId);
    var savedScheduleIds = $cookies.getObject(savedScheduleIdsCookieKey);
    if (!savedScheduleIds) {
      return;
    }
    savedScheduleIds.forEach(function(scheduleId) {
      //getScheduleQById(scheduleId, false).then(function(schedule) {
      _addSavedScheduleByIdNoSave(scheduleId);
      //})
    });
  }

  function _saveScheduleIdsToCookie() {
    var savedScheduleIdsCookieKey =
      savedScheduleIdsCookieKeyFormat.replace('{}', _primaryUserId);
    $cookies.putObject(savedScheduleIdsCookieKey, _savedScheduleIds,
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

  function _isStale() {
    return _lastScheduleGenerationStatus.status === 'stale';
  }

  function setStale(stale) {
    if (stale === undefined) {
      stale = true
    }
    if (stale) {
      Object.keys(_generatingSchedulesStops).forEach(function(instanceId) {
        _generatingSchedulesStops[instanceId] = true;
      });
      _setAndBroadcastScheduleGenerationStatus(
        new scheduleGenerationStatus.Stale());
    }
    _saveCoursesToCookie();
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
      return $q.when(_courses[id]);
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
      course.selected = true;
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

  function _updateNumSchedules() {
    _numSchedules = _currFpList.map(function(footprint) {
      return _scheduleIdsByFp[footprint].length
    }).reduce(function(a, b) {
      return a + b;
    }, 0);
  }

  function generateSchedulesQ() {
    if (_generatingSchedulesQ === null) {
      _generatingSchedulesQ = $timeout(function () {
        var instanceId = _generateId(generatingSchedulesInstanceIdCharSet, 4);
        _generatingSchedulesStops[instanceId] = false;

        // Map schedules to footprints
        _scheduleIdsByFp = {};
        var deferred = $q.defer();
        var totalNumSchedules = _currScheduleGroup.getTotalNumSchedules();
        var totalGenerated = 0;
        var generatorChunkSize = 128;
        var schedule = _currScheduleGroup.nextSchedule();
        var footprint = null;

        function updateTotalAndSetAndBroadcastStatus(numGenerated) {
          totalGenerated += numGenerated;
          _setAndBroadcastScheduleGenerationStatus(
            new scheduleGenerationStatus.Generating(totalGenerated, totalNumSchedules))
        }

        function generateSchedulesHelperAsync() {
          return $timeout(function generateSchedulesChunkHelperSync() {
            if (_generatingSchedulesStops[instanceId]) {
              _generatingSchedulesQ = null;
              deferred.reject();
              delete _generatingSchedulesStops[instanceId];
              return;
            }

            var numGenerated = 0;
            while (numGenerated < generatorChunkSize) {
              if (schedule == null) {
                totalGenerated += numGenerated;
                _generatingSchedulesQ = null;
                deferred.resolve();
                delete _generatingSchedulesStops[instanceId];
                return;
              }
              footprint = schedule.getTimeFootprint();
              if (!_scheduleIdsByFp.hasOwnProperty(footprint)) {
                _scheduleIdsByFp[footprint] = [];
              }
              _scheduleIdsByFp[footprint].push(schedule.id);
              numGenerated++;
              schedule = _currScheduleGroup.nextSchedule();
            }
            updateTotalAndSetAndBroadcastStatus(numGenerated);
            return generateSchedulesHelperAsync();
          });
        }

        setStale(false);
        updateTotalAndSetAndBroadcastStatus(0);
        generateSchedulesHelperAsync();
        return deferred.promise.then(function () {
          _currFpList = Object.keys(_scheduleIdsByFp);
          _updateNumSchedules();
          _sendCurrScheduleListInfoChange(true);
        });
      }).then(function() {
        _generatingSchedulesQ = null;
      });
    }

    return _generatingSchedulesQ;
  }

  function filterAndReorderSchedules() {
    if (_isStale()) {
      return;
    }

    _currFpList = Object.keys(_scheduleIdsByFp);

    // Filter footprints
    _setAndBroadcastScheduleGenerationStatus(
      new scheduleGenerationStatus.FilteringAndReordering(_numSchedules, true));
    Object.keys(_filterFns).forEach(function applyFilterFn(option) {
      if (!_schedulingOptions[option]) {
        return;
      }
      var filterFn = _filterFns[option];
      _currFpList = _currFpList.filter(function(footprint) {
        return filterFn(footprint);
      });
    });

    // Reorder footprints
    _setAndBroadcastScheduleGenerationStatus(
      new scheduleGenerationStatus.FilteringAndReordering(_numSchedules, false));
    var orderByOptions = Object.keys(_orderByFns).filter(function(option) {
      return _schedulingOptions[option];
    });
    var orderByValues = {};
    var value;
    _currFpList.sort(function(a, b) {
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

    _currFpIdx = 0;
    _currFpScheduleIdx = 0;
    _currScheduleIdx = 0;
    _updateNumSchedules();

    var newScheduleGenerationStatus = null;
    if (_numSchedules > 0) {
      newScheduleGenerationStatus = new scheduleGenerationStatus.Done(_numSchedules);
    } else {
      newScheduleGenerationStatus = new scheduleGenerationStatus.Failed();
    }
    _setAndBroadcastScheduleGenerationStatus(newScheduleGenerationStatus);
    _sendCurrScheduleListInfoChange(true);
  }

  function _setCurrentScheduleGroup(scheduleGroup, replace) {
    if (replace || scheduleGroup.id !== _currScheduleGroup.id) {
      _currScheduleGroup = scheduleGroup;
    }
  }

  function getCurrentScheduleGroupId() {
    if (_currScheduleGroup === null || _isStale()) {
      var courseList = Object.keys(_courses).map(function(courseId) {
        return _courses[courseId];
      }).filter(function(course) {
        return course.selected;
      });
      _setCurrentScheduleGroup(new ScheduleGroup(_primaryUserId, courseList), true);
    }

    return _currScheduleGroup.id;
  }

  function setCurrentScheduleGroupById(scheduleGroupId) {
    if (_currScheduleGroup !== null) {
      if (_currScheduleGroup.id === ScheduleGroup.normalizeId(scheduleGroupId)) {
        return;
      }
    }

    var userId = ScheduleGroup.getUserIdFromId(scheduleGroupId);
    var courseIdList = ScheduleGroup.getCourseIdsFromId(scheduleGroupId);
    var courseList = [];
    var courseLookupQList = [];
    courseIdList.forEach(function(courseId) {
      var course = _courses[courseId];
      if (course) {
        courseList.push(course);
      } else {
        courseLookupQList.push(reverseLookup
          .getCourseQBy1arySectionId(courseId)
          .then(function(course) {
            courseList.push(course);
            addCourse(course);
          }));
      }
    });

    return $q.all(courseLookupQList).then(function() {
      Object.keys(_courses).forEach(function(courseId) {
        _courses[courseId].selected = courseIdList.indexOf(parseInt(courseId)) >= 0;
      });

      _setCurrentScheduleGroup(new ScheduleGroup(userId, courseList), false);
    });
  }

  function setCurrentScheduleGroupByScheduleIdQ(scheduleId) {
    if (getScheduleByIdFromCurrentScheduleGroup(scheduleId) !== null) {
      return $q.when();
    }

    var userId = Schedule.getUserIdFromId(scheduleId);
    var sectionIdList = Schedule.getSectionIdsFromId(scheduleId);
    var courseIdList = [];
    var sectionList = [];
    var sectionLookupQList = [];
    sectionIdList.forEach(function(sectionId) {
      if (_sections.hasOwnProperty(sectionId)) {
        var section = _sections[sectionId];
        sectionList.push(section);
        courseIdList.push(section.course.id);
      } else {
        sectionLookupQList.push(reverseLookup
          .getCourseQBy2arySectionId(sectionId)
          .then(function(course) {
            setStale(true);
            courseIdList.push(course.id);
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
          }));
      }
    });
    return $q.all(sectionLookupQList).then(function() {
      var courseList = [];
      Object.keys(_courses).forEach(function(courseId) {
        if (courseIdList.indexOf(parseInt(courseId)) >= 0) {
          var course = _courses[courseId];
          course.selected = true;
          courseList.push(course);
        } else {
          _courses[courseId].selected = false;
        }
      });

      _setCurrentScheduleGroup(new ScheduleGroup(userId, courseList), false);
    });
  }

  function _setAndBroadcastScheduleGenerationStatus(scheduleGenerationStatus) {
    _lastScheduleGenerationStatus = scheduleGenerationStatus;

    Object.keys(_scheduleGenerationStatusListeners).forEach(function(tag) {
      _scheduleGenerationStatusListeners[tag](scheduleGenerationStatus);
    });
  }

  function getScheduleGenerationStatus() {
    return _lastScheduleGenerationStatus;
  }

  function registerScheduleGenerationStatusListener(tag, listener) {
    _scheduleGenerationStatusListeners[tag] = listener;
  }

  function _getSchedulesByFpIdx(fpIdx) {
    return _scheduleIdsByFp[_currFpList[fpIdx]] || [];
  }

  function _getScheduleId(fpIdx, scheduleIdx) {
    return _getSchedulesByFpIdx(fpIdx)[scheduleIdx];
  }

  function getCurrScheduleId() {
    return _getScheduleId(_currFpIdx, _currFpScheduleIdx);
  }

  function getPrevScheduleId() {
    var l = _currFpList.length;
    if (l <= 0) {
      return null;
    }
    var prevFpIdx = _currFpIdx;
    var prevFpScheduleIdx = _currFpScheduleIdx - 1;
    while (prevFpScheduleIdx < 0) {
      prevFpIdx = (_currFpIdx + l - 1) % l;
      prevFpScheduleIdx = _getSchedulesByFpIdx(prevFpIdx).length - 1;
    }
    return _getScheduleId(prevFpIdx, prevFpScheduleIdx);
  }

  function getNextScheduleId() {
    var l = _currFpList.length;
    if (l <= 0) {
      return null;
    }
    var nextFpIdx = _currFpIdx;
    var nextFpScheduleIdx = _currFpScheduleIdx + 1;
    while (nextFpScheduleIdx >= _getSchedulesByFpIdx(nextFpIdx).length) {
      nextFpIdx = (_currFpIdx + 1) % l;
      nextFpScheduleIdx = 0;
    }
    return _getScheduleId(nextFpIdx, nextFpScheduleIdx);
  }

  function getCurrScheduleListInfo() {
    return {
      total: _numSchedules,
      currentIdx: _currScheduleIdx,
      firstScheduleId: _getScheduleId(0, 0),
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

  function getScheduleByIdFromCurrentScheduleGroup(scheduleId) {
    if (_currScheduleGroup) {
      return _currScheduleGroup.getScheduleById(scheduleId);
    }
    return null;
  }

  function setCurrentScheduleById(scheduleId) {
    if (_isStale()) {
      return null;
    }

    var schedule = getScheduleByIdFromCurrentScheduleGroup(scheduleId);
    if (schedule === null) {
      return schedule;
    }

    // TODO: Implement better searching by using footprint
    _currFpIdx = _currFpList.length;
    _currFpScheduleIdx = -1;
    _currScheduleIdx = _numSchedules;
    while (_currFpScheduleIdx < 0 && _currFpIdx > 0) {
      _currFpIdx --;
      var schedules = _getSchedulesByFpIdx(_currFpIdx);
      _currScheduleIdx -= schedules.length;
      _currFpScheduleIdx = schedules.indexOf(scheduleId);
    }
    _currScheduleIdx += _currFpScheduleIdx;
    return schedule;
  }

  function getSchedulingOptions() {
    return angular.copy(_schedulingOptions);
  }

  function setSchedulingOption(option, choice) {
    _schedulingOptions[option] = choice;
    _saveSchedulingOptionsToCookie();
  }

  function getSavedScheduleIds() {
    return _savedScheduleIds.slice();
  }

  function _addSavedScheduleByIdNoSave(scheduleId) {
    if (_savedScheduleIds.indexOf(scheduleId) >= 0) {
      return false;
    }
    _savedScheduleIds.push(scheduleId);
    _addSavedScheduleIdListeners.forEach(function(listener) {
      listener(scheduleId);
    });
    return true;
  }

  function addSavedScheduleById(scheduleId) {
    var success = _addSavedScheduleByIdNoSave(scheduleId);
    if (success) {
      _saveScheduleIdsToCookie();
    }
    return success;
  }

  function registerAddSavedScheduleIdListener(listener) {
    _addSavedScheduleIdListeners.push(listener);
  }

  function _dropSavedScheduleByIdNoSave(scheduleId) {
    var index = _savedScheduleIds.indexOf(scheduleId);
    if (index < 0) {
      return false;
    }
    _savedScheduleIds.splice(index, 1);
    _dropSavedScheduleIdListeners.forEach(function(listener) {
      listener(scheduleId);
    });
    return true;
  }

  function dropSavedScheduleById(scheduleId) {
    var success = _dropSavedScheduleByIdNoSave(scheduleId);
    if (success) {
      _saveScheduleIdsToCookie();
    }
    return success;
  }

  function registerDropSavedScheduleIdListener(listener) {
    _dropSavedScheduleIdListeners.push(listener);
  }

  return {
    getPreferences: getPreferences,
    setPreference: setPreference,

    isReady: isReady,
    registerSetReadyListener: registerSetReadyListener,
    setStale: setStale,
    setInDisplayMode: setInDisplayMode,
    registerSetInDisplayModeListener: registerSetInDisplayModeListener,

    getAllCourses: getAllCourses,
    getCourseQById: getCourseQById,
    addCourse: addCourse,
    registerAddCourseListener: registerAddCourseListener,
    dropCourse: dropCourse,
    registerDropCourseListener: registerDropCourseListener,

    generateSchedulesQ: generateSchedulesQ,
    getCurrentScheduleGroupId: getCurrentScheduleGroupId,
    setCurrentScheduleGroupById: setCurrentScheduleGroupById,
    setCurrentScheduleGroupByScheduleIdQ: setCurrentScheduleGroupByScheduleIdQ,
    getScheduleByIdFromCurrentScheduleGroup: getScheduleByIdFromCurrentScheduleGroup,
    getCurrScheduleId: getCurrScheduleId,
    getPrevScheduleId: getPrevScheduleId,
    getNextScheduleId: getNextScheduleId,
    getScheduleGenerationStatus: getScheduleGenerationStatus,
    registerScheduleGenerationStatusListener: registerScheduleGenerationStatusListener,
    getCurrScheduleListInfo: getCurrScheduleListInfo,
    registerCurrScheduleListInfoChangeListener: registerCurrScheduleListInfoChangeListener,
    setCurrentScheduleById: setCurrentScheduleById,

    getSchedulingOptions: getSchedulingOptions,
    setSchedulingOption: setSchedulingOption,
    filterAndReorderSchedules: filterAndReorderSchedules,
    getSavedScheduleIds: getSavedScheduleIds,
    addSavedScheduleById: addSavedScheduleById,
    dropSavedScheduleById: dropSavedScheduleById,
    registerAddSavedScheduleIdListener: registerAddSavedScheduleIdListener,
    registerDropSavedScheduleIdListener: registerDropSavedScheduleIdListener
  };
}

angular.module('scheduleBuilder').factory('scheduleFactory', [
  '$q',
  '$timeout',
  '$cookies',
  'reverseLookup',
  scheduleFactory
]);

/*
function scheduleFactoryNew($q, $timeout, reverseLookup) {
  var _primaryUserId = 'samplePrimaryUserId';
  var _schedulingOptions = {};
  var _courses = {};
  var _stale = true;
  var _currentScheduleGroup = null;
  var _currScheduleIdList = [];
  //var scheduleIdsByFootprint = {};
  //var _footprintList = [];
  var _orderByFns = {
    minimizeGaps: function(footprint) {
      return - _orderByFns.maximizeGaps(footprint);
    },
    maximizeGaps: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var total = 0, section, horizon, i, gap;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    },
    preferMornings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.endTime.compareTo(Time.noon) <= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferAfternoons: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    preferEvenings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meeting.startTime.compareTo(Time.fivePM) >= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferNoTimeConflicts: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var numConflicts = 0, total = 0;
      var section, horizon, i;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
  };
  var _filterFns = {
    noTimeConflicts: function(footprint) {
      if (!_schedulingOptions.noTimeConflicts) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      var section, horizon, i;
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
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
    },
    dayStartTime: function(footprint) {
      if (_schedulingOptions.dayStartTime == null) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        if (sections.length > 0) {
          if (sections[0].meeting.startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
            return false;
          }
        }
      }
      return true;
    },
    dayEndTime: function(footprint) {
      if (_schedulingOptions.dayEndTime == null) {
        return true;
      }

      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var sections = meetingsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].meeting.endTime.compareTo(_schedulingOptions.dayEndTime) > 0) {
            return false;
          }
        }
      }
      return true;
    }
  };

  function generateSchedulesQ() {
    return $timeout(function() {
      if (!_stale) {
        return;
      }

      // Get selected course
      var selectedCourses = Object.keys(_courses).map(function(courseId) {
        return _courses[courseId];
      }).filter(function(course) {
        return course.selected;
      });

      // Get Schedule Group
      _currScheduleGroup = new ScheduleGroup(_primaryUserId, selectedCourses);

      // Map schedules to footprints
      var scheduleIdsByFootprint = {};
      var footprint = null;
      var schedule = _currScheduleGroup.nextSchedule();
      while (schedule != null) {
        footprint = schedule.getTimeFootprint();
        if (!scheduleIdsByFootprint.hasOwnProperty(footprint)) {
          scheduleIdsByFootprint[footprint] = [];
        }
        scheduleIdsByFootprint[footprint].push(schedule.id);
      }

      // Filter footprints
      var footprintList = Object.keys(scheduleIdsByFootprint);
      Object.keys(_filterFns).forEach(function(filterFn) {
        _currFootprintList = _currFootprintList.filter(function(footprint) {
          return filterFn(footprint);
        });
      });

      // Reorder footprints
      var orderByOptions = Object.keys(_orderByFns).filter(function(option) {
        return _schedulingOptions[option];
      });
      var orderByValues = {};
      var value;
      _currFootprintList.sort(function(a, b) {
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

      // Flatten out into schedules
      _currScheduleIdList = _currFootprintList.map(function(footprint) {
        return scheduleIdsByFootprint[footprint];
      }).reduce(function(a, b) {
        return a.concat(b);
      });
      _currScheduleIdx = 0;
      setStale(false);

      _sendCurrScheduleListInfoChange(true);
    });
  }
  return {}
}
*/
