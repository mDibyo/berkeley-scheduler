'use strict';

var constants = require('../constants');

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

  var _savedSchedules = [];
  var _addSavedScheduleListeners = [];
  var _dropSavedScheduleListeners = [];
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
  var _schedulingOptionsChangeListeners = {};

  var _orderByFns = {
    minimizeGaps: function(footprint) {
      return - _orderByFns.maximizeGaps(footprint);
    },
    maximizeGaps: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var total = 0, section, horizon, i, gap;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        if (sections.length >= 2) {
          horizon = sections[0].meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < sections.length; i++) {
            section = sections[i];
            if (horizon > 0) {
              gap = section.meetings[0].startTime.getTotalMinutes() - horizon;
              total += Math.max(0, gap) / 60;
            }
            horizon = Math.max(horizon, section.meetings[0].endTime.getTotalMinutes());
          }
        }
      }
      return total;
    },
    minimizeNumberOfDays: function(footprint) {
      return - _orderByFns.maximizeNumberOfDays(footprint);
    },
    maximizeNumberOfDays: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var total = 0;
      for (var day in sectionsByDay) {
        if (sectionsByDay[day].length > 0) {
          total += 1;
        }
      }
      return total;
    },
    preferMornings: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meetings[0].endTime.compareTo(Time.noon) <= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferAfternoons: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meetings[0].startTime.compareTo(Time.noon) >= 0) {
            if (sections[i].meetings[0].endTime.compareTo(Time.fivePM) <= 0) {
              totalFor ++;
            }
          }
        }
      }
      return totalFor / total;
    },
    preferEvenings: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0, total = 0;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          total ++;
          if (sections[i].meetings[0].startTime.compareTo(Time.fivePM) >= 0) {
            totalFor ++;
          }
        }
      }
      return totalFor / total;
    },
    preferNoTimeConflicts: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var numConflicts = 0, total = 0;
      var section, horizon, i;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        total += sections.length;
        if (sections.length >= 2) {
          horizon = sections[0].meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < sections.length; i++) {
            section = sections[i];
            if (horizon > 0) {
              if (section.meetings[0].startTime.getTotalMinutes() < horizon) {
                numConflicts ++;
              }
            }
            horizon = Math.max(horizon, section.meetings[0].endTime.getTotalMinutes());
          }
        }
      }
      return - (numConflicts / total);
    }
  };
  var _filterFns = {
    noTimeConflicts: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      var section, horizon, i;
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        if (sections.length >= 2) {
          horizon = sections[0].meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < sections.length; i++) {
            section = sections[i];
            if (horizon > 0) {
              if (section.meetings[0].startTime.getTotalMinutes() < horizon) {
                return false;
              }
            }
            horizon = Math.max(horizon, section.meetings[0].endTime.getTotalMinutes());
          }
        }
      }
      return true;
    },
    dayStartTime: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        if (sections.length > 0) {
          if (sections[0].meetings[0].startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
            return false;
          }
        }
      }
      return true;
    },
    dayEndTime: function(footprint) {
      var sectionsByDay = Schedule.timeFootprints[footprint];
      for (var day in sectionsByDay) {
        var sections = sectionsByDay[day];
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].meetings[0].endTime.compareTo(_schedulingOptions.dayEndTime) > 0) {
            return false;
          }
        }
      }
      return true;
    }
  };

  _loadCoursesFromCookieInto_courses();
  _loadScheduleIdsFromCookieInto_savedSchedules();
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

  function _getPrimaryUserIdTermIdentifier() {
    return _primaryUserId + '.' + constants.TERM_ABBREV;
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
    schedulingOptions.minimizeNumberOfDays =
      schedulingOptions.minimizeNumberOfDays || false;
    schedulingOptions.maximizeNumberOfDays =
      schedulingOptions.maximizeNumberOfDays || false;
    schedulingOptions.preferMornings =
      schedulingOptions.preferMornings || false;
    schedulingOptions.preferAfternoons =
      schedulingOptions.preferAfternoons || false;
    schedulingOptions.preferEvenings =
      schedulingOptions.preferEvenings || false;
    schedulingOptions.preferNoTimeConflicts =
      schedulingOptions.preferNoTimeConflicts || false;
    if (schedulingOptions.dayStartTime) {
      var time = schedulingOptions.dayStartTime;
      schedulingOptions.dayStartTime = new Time(time.hours, time.minutes);
    } else {
      schedulingOptions.dayStartTime = null;
    }
    if (schedulingOptions.dayEndTime) {
      var time = schedulingOptions.dayEndTime;
      schedulingOptions.dayEndTime = new Time(time.hours, time.minutes);
    } else {
      schedulingOptions.dayEndTime = null;
    }
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
    var savedCoursesCookieKey = savedCoursesCookieKeyFormat
      .replace('{}', _getPrimaryUserIdTermIdentifier());
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
    var savedCoursesCookieKey = savedCoursesCookieKeyFormat
      .replace('{}', _getPrimaryUserIdTermIdentifier());
    $cookies.putObject(savedCoursesCookieKey, courseInfosToSave,
      {expires: _cookieExpiryDate});
  }

  function _loadScheduleIdsFromCookieInto_savedSchedules() {
    var savedScheduleIdsCookieKey = savedScheduleIdsCookieKeyFormat
      .replace('{}', _getPrimaryUserIdTermIdentifier());
    var savedScheduleIds = $cookies.getObject(savedScheduleIdsCookieKey);
    if (!savedScheduleIds) {
      return;
    }
    savedScheduleIds.forEach(function(scheduleId) {
      getScheduleQById(scheduleId).then(function(schedule) {
        _addSavedScheduleNoSave(schedule);
      });
    });
  }

  function _saveScheduleIdsToCookie() {
    var savedScheduleIdsCookieKey = savedScheduleIdsCookieKeyFormat
      .replace('{}', _getPrimaryUserIdTermIdentifier());
    $cookies.putObject(savedScheduleIdsCookieKey, _savedSchedules.map(function(schedule) {
      return schedule.id;
    }), {expires: _cookieExpiryDate});
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
    _lastScheduleGenerationStatus = _lastScheduleGenerationStatus || new scheduleGenerationStatus.Stale();
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

    if (_numSchedules > 0) {
      _setAndBroadcastScheduleGenerationStatus(
        new scheduleGenerationStatus.Done(_numSchedules));
    } else {
      _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed());
      _findAndSetReasonForScheduleGenerationFailure();
    }
    _sendCurrScheduleListInfoChange(true);
  }

  function _findAndSetReasonForScheduleGenerationFailure() {
    if (_currScheduleGroup && _currScheduleGroup.getTotalNumSchedules() <= 0) {
      // Not enough courses/sections were selected
      var courses = _currScheduleGroup.courses;
      if (courses.length <= 0) {
        _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
          'No classes were selected.'
        ));
        return;
      }
      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        for (var j = 0; j < course.sectionTypes.length; j++) {
          var selectedSections =
            course.getSectionsByType(course.sectionTypes[j]).filter(function(section) {
              return section.selected;
            });
          if (selectedSections.length <= 0) {
            _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
              'No sections of type '
              + course.sectionTypes[j]
              + ' were selected for '
              + course.getName()
              + '.'
            ));
            return;
          }
        }
      }
    }

    // Check if any filtering option is discarding all schedules
    var fpList = Object.keys(_scheduleIdsByFp);

    fpList = fpList.filter(function(footprint) {
      return _filterFns.noTimeConflicts(footprint);
    });
    if (fpList.length <= 0) {
      _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
        'Schedules without time conflicts could not be found.'
      ));
      return;
    }

    fpList = fpList.filter(function(footprint) {
      return _filterFns.dayStartTime(footprint);
    }).filter(function(footprint) {
      return _filterFns.dayEndTime(footprint);
    });
    if (fpList.length <= 0) {
      _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
        'No schedules were found with all classes within the selected start '
        + 'and end time of day. Change your Scheduling Options, add more '
        + 'sections to your existing classes, or check for a different set of '
        + 'classes. '
      ));
    }
  }

  function _setCurrentScheduleGroup(scheduleGroup, replace) {
    if (replace
        || _currScheduleGroup === null
        || scheduleGroup.id !== _currScheduleGroup.id) {
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

  function getScheduleQById(scheduleId) {
    var schedule = getScheduleByIdFromCurrentScheduleGroup(scheduleId);
    if (schedule !== null) {
      return $q.when(schedule);
    }

    var userId = Schedule.getUserIdFromId(scheduleId);
    var sectionIdList = Schedule.getSectionIdsFromId(scheduleId);
    var sectionList = [];
    var sectionLookupQList = [];
    sectionIdList.forEach(function(sectionId) {
      if (_sections.hasOwnProperty(sectionId)) {
        var section = _sections[sectionId];
        sectionList.push(section);
      } else {
        sectionLookupQList.push(reverseLookup
          .getCourseQBy2arySectionId(sectionId)
          .then(function(course) {
            for (var i = 0; i < course.sections.length; i++) {
              var section = course.sections[i];
              if (section.id === sectionId) {
                sectionList.push(section);
                break;
              }
            }
          }));
      }
    });
    return $q.all(sectionLookupQList).then(function() {
      return new Schedule(userId, sectionList);
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
    return _lastScheduleGenerationStatus || new scheduleGenerationStatus.Stale();
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

  function _getPrevScheduleId() {
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

  function _getPrevFpFirstScheduleId() {
    var l = _currFpList.length;
    if (l <= 0) {
      return null;
    }
    var prevFpIdx = (_currFpIdx + l - 1) % l;
    return _getScheduleId(prevFpIdx, 0);
  }

  function _getNextScheduleId() {
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

  function _getNextFpFirstScheduleId() {
    var l = _currFpList.length;
    if (l <= 0) {
      return null;
    }
    var nextFpIdx = (_currFpIdx + 1) % l;
    return _getScheduleId(nextFpIdx, 0);
  }

  function getCurrScheduleListInfo() {
    return {
      total: _numSchedules,
      currentIdx: _currScheduleIdx,
      firstScheduleId: _getScheduleId(0, 0),
      prevScheduleId: _getPrevScheduleId(),
      prevFpFirstScheduleId: _getPrevFpFirstScheduleId(),
      nextScheduleId: _getNextScheduleId(),
      nextFpFirstScheduleId: _getNextFpFirstScheduleId()
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

    var footprint = schedule.getTimeFootprint();
    _currScheduleIdx = 0;
    for (_currFpIdx = 0; _currFpIdx < _currFpList.length; _currFpIdx++) {
      var schedules = _getSchedulesByFpIdx(_currFpIdx);
      if (_currFpList[_currFpIdx] === footprint) {
        _currFpScheduleIdx = schedules.indexOf(scheduleId);
        _currScheduleIdx += _currFpScheduleIdx;
        break;
      }
      _currScheduleIdx += schedules.length;
    }
    _currScheduleIdx = _currScheduleIdx % _numSchedules;
    return schedule;
  }

  function getSchedulingOptions() {
    return angular.copy(_schedulingOptions);
  }

  function setSchedulingOption(option, choice, save) {
    if (_schedulingOptions.hasOwnProperty(option)) {
      _schedulingOptions[option] = choice;

      Object.keys(_schedulingOptionsChangeListeners).forEach(function(tag) {
        _schedulingOptionsChangeListeners[tag](getSchedulingOptions());
      });
    }
    if (save === undefined || save) {
      _saveSchedulingOptionsToCookie();
    }
  }

  function registerSchedulingOptionsChangeListener(tag, listener) {
    _schedulingOptionsChangeListeners[tag] = listener;
  }

  function getSavedSchedules() {
    return _savedSchedules.slice();
  }

  function _addSavedScheduleNoSave(schedule) {
    for (var i = 0; i < _savedSchedules.length; i++) {
      if (_savedSchedules[i].id === schedule.id) {
        return false;
      }
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
      _saveScheduleIdsToCookie();
    }
    return success;
  }

  function registerAddSavedScheduleListener(listener) {
    _addSavedScheduleListeners.push(listener);
  }

  function _dropSavedScheduleNoSave(schedule) {
    for (var i = 0; i < _savedSchedules.length; i++) {
      if (_savedSchedules[i].id === schedule.id) {
        _savedSchedules.splice(i, 1);
        _dropSavedScheduleListeners.forEach(function(listener) {
          listener(schedule);
        });
        return true;
      }
    }
    return false;
  }

  function dropSavedSchedule(schedule) {
    var success = _dropSavedScheduleNoSave(schedule);
    if (success) {
      _saveScheduleIdsToCookie();
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
    setStale: setStale,

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
    getScheduleQById: getScheduleQById,
    getScheduleByIdFromCurrentScheduleGroup: getScheduleByIdFromCurrentScheduleGroup,
    getCurrScheduleId: getCurrScheduleId,
    getScheduleGenerationStatus: getScheduleGenerationStatus,
    registerScheduleGenerationStatusListener: registerScheduleGenerationStatusListener,
    getCurrScheduleListInfo: getCurrScheduleListInfo,
    registerCurrScheduleListInfoChangeListener: registerCurrScheduleListInfoChangeListener,
    setCurrentScheduleById: setCurrentScheduleById,

    getSchedulingOptions: getSchedulingOptions,
    setSchedulingOption: setSchedulingOption,
    registerSchedulingOptionsChangeListener: registerSchedulingOptionsChangeListener,
    filterAndReorderSchedules: filterAndReorderSchedules,
    getSavedSchedules: getSavedSchedules,
    addSavedSchedule: addSavedSchedule,
    dropSavedSchedule: dropSavedSchedule,
    registerAddSavedScheduleListener: registerAddSavedScheduleListener,
    registerDropSavedScheduleIdListener: registerDropSavedScheduleListener
  };
}

angular.module('berkeleyScheduler').factory('scheduleFactory', [
  '$q',
  '$timeout',
  '$cookies',
  'reverseLookup',
  scheduleFactory
]);
