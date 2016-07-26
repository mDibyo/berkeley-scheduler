var Time = require('../models/time');
var Schedule = require('../models/schedule');
var ScheduleGroup = require('../models/scheduleGroup');
var scheduleGenerationStatus = require('../models/scheduleGenerationStatus');

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

  var _savedSchedules = [];
  var _addSavedScheduleListeners = [];
  var _dropSavedScheduleListeners = [];
  var _currScheduleGroup = null;
  var _scheduleIdsByFp = {};
  var _currFpList = [];
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
      getScheduleQById(scheduleId, false).then(function(schedule) {
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
    if (isStale === undefined) {
      isStale = true
    }
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
      //var deferred = $q.defer();
      //deferred.resolve(_courses[id]);
      //return deferred.promise;
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
    return $timeout(function() {
      // Get selected course
      var selectedCourses = Object.keys(_courses).map(function(courseId) {
        return _courses[courseId];
      }).filter(function(course) {
        return course.selected;
      });

      // Get Schedule Group
      _currScheduleGroup = new ScheduleGroup(_primaryUserId, selectedCourses);

      // Map schedules to footprints
      _scheduleIdsByFp = {};
      var deferred = $q.defer();
      var generatorChunkSize = 1000;
      var schedule = _currScheduleGroup.nextSchedule();
      var footprint = null;

      function generateSchedulesHelperAsync() {
        return $timeout(function generateSchedulesChunkHelperSync() {
          var numGenerated = 0;
          while (numGenerated < generatorChunkSize) {
            if (schedule == null) {
              deferred.resolve();
              return;
            }
            footprint = schedule.getTimeFootprint();
            if (!_scheduleIdsByFp.hasOwnProperty(footprint)) {
              _scheduleIdsByFp[footprint] = [];
            }
            _scheduleIdsByFp[footprint].push(schedule.id);
            numGenerated ++;
            schedule = _currScheduleGroup.nextSchedule();
          }
          return generateSchedulesHelperAsync();
        });
      }

      generateSchedulesHelperAsync();
      return deferred.promise.then(function() {
        _currFpList = Object.keys(_scheduleIdsByFp);
        _updateNumSchedules();
        setStale(false);
        _sendCurrScheduleListInfoChange(true);

      });
    });
  }

  function filterAndReorderSchedules() {
    _currFpList = Object.keys(_scheduleIdsByFp);

    // Filter footprints
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
    _sendCurrScheduleListInfoChange(true);
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

      _currScheduleGroup = new ScheduleGroup(userId, courseList);
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

      _currScheduleGroup = new ScheduleGroup(userId, courseList);
    });
  }

  function getScheduleQById(scheduleId, generateSchedules) {
    var userId = Schedule.getUserIdFromId(scheduleId);
    //var isPrimaryUser = userId == _primaryUserId;
    //if (!isPrimaryUser) {
    //  setInDisplayMode(true);
    //}

    if (_currScheduleGroup) {
      var schedule = _currScheduleGroup.getScheduleById(scheduleId);
      if (schedule) {
        //var deferred = $q.defer();
        //deferred.resolve(schedule);
        //return deferred.promise;
        return $q.when(schedule);
      }
    }

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
      Object.keys(_courses).forEach(function(courseId) {
        _courses[courseId].selected = courseIdList.indexOf(parseInt(courseId)) >= 0;
      });

      var schedule = new Schedule(userId, sectionList);
      if (generateSchedules) {
        return generateSchedulesQ().then(function() {
          filterAndReorderSchedules();
          return schedule;
        });
      }
      return schedule;
    });
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
    // TODO: Move to new Schedule info system
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
    if (isStale()) {
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

  function setCurrentScheduleByIdQ(scheduleId) {
    return getScheduleQById(scheduleId, true).then(function(schedule) {
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
    });
  }

  function getSchedulingOptions() {
    return angular.copy(_schedulingOptions);
  }

  function setSchedulingOption(option, choice) {
    _schedulingOptions[option] = choice;
    _saveSchedulingOptionsToCookie();
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
    setCurrentScheduleGroupById: setCurrentScheduleGroupById,
    setCurrentScheduleGroupByScheduleIdQ: setCurrentScheduleGroupByScheduleIdQ,
    getScheduleByIdFromCurrentScheduleGroup: getScheduleByIdFromCurrentScheduleGroup,
    //getScheduleQById: getScheduleQById,
    getCurrScheduleId: getCurrScheduleId,
    getPrevScheduleId: getPrevScheduleId,
    getNextScheduleId: getNextScheduleId,
    getCurrScheduleListInfo: getCurrScheduleListInfo,
    registerCurrScheduleListInfoChangeListener: registerCurrScheduleListInfoChangeListener,
    setCurrentScheduleById: setCurrentScheduleById,
    //setCurrentScheduleByIdQ: setCurrentScheduleByIdQ,

    getSchedulingOptions: getSchedulingOptions,
    setSchedulingOption: setSchedulingOption,
    filterAndReorderSchedules: filterAndReorderSchedules,
    getSavedSchedules: getSavedSchedules,
    addSavedSchedule: addSavedSchedule,
    dropSavedSchedule: dropSavedSchedule,
    registerAddSavedScheduleListener: registerAddSavedScheduleListener,
    registerDropSavedScheduleListener: registerDropSavedScheduleListener
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
