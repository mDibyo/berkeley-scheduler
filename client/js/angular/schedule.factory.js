'use strict';

var constants = require('../constants');

var Time = require('../models/time');
var Schedule = require('../models/schedule').default;
var ScheduleGroup = require('../models/scheduleGroup').default;
var scheduleGenerationStatus = require('../models/scheduleGenerationStatus');
var CustomCommitment = require('../models/customCommitment').default;
var CustomCommitmentOption = require('../models/customCommitmentOption').default;

var generatingSchedulesInstanceIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';


function scheduleFactory($q, $timeout, userService, courseService, eventService) {
  var _primaryUserId = userService.primaryUserId;

  var _savedSchedules = [];
  var _addSavedScheduleListeners = [];
  var _dropSavedScheduleListeners = [];
  /** @type ScheduleGroup **/
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
  var _schedulingOptions = userService.schedulingOptions;
  var _schedulingOptionsChangeListeners = {};

  var _orderByFns = {
    minimizeGaps: function(footprint) {
      return -_orderByFns.maximizeGaps(footprint);
    },
    maximizeGaps: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var total = 0;
      var meeting;
      var horizon;
      var i;
      var gap;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        if (meetings.length >= 2) {
          horizon = meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < meetings.length; i++) {
            meeting = meetings[i];
            if (horizon > 0) {
              gap = meeting.startTime.getTotalMinutes() - horizon;
              total += Math.max(0, gap) / 60;
            }
            horizon = Math.max(horizon, meeting.endTime.getTotalMinutes());
          }
        }
      }
      return total;
    },
    minimizeNumberOfDays: function(footprint) {
      return -_orderByFns.maximizeNumberOfDays(footprint);
    },
    maximizeNumberOfDays: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var total = 0;
      for (var day in meetingsByDay) {
        if (meetingsByDay[day].length > 0) {
          total += 1;
        }
      }
      return total;
    },
    preferMornings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0;
      var total = 0;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        for (var i = 0; i < meetings.length; i++) {
          total++;
          if (meetings[i].endTime.compareTo(Time.noon) <= 0) {
            totalFor++;
          }
        }
      }
      return totalFor / total;
    },
    preferAfternoons: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0;
      var total = 0;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        for (var i = 0; i < meetings.length; i++) {
          total++;
          if (meetings[i].startTime.compareTo(Time.noon) >= 0
            && meetings[i].endTime.compareTo(Time.fivePM) <= 0) {
            totalFor++;
          }
        }
      }
      return totalFor / total;
    },
    preferEvenings: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var totalFor = 0;
      var total = 0;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        for (var i = 0; i < meetings.length; i++) {
          total++;
          if (meetings[i].startTime.compareTo(Time.fivePM) >= 0) {
            totalFor++;
          }
        }
      }
      return totalFor / total;
    },
    preferNoTimeConflicts: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var numConflicts = 0;
      var total = 0;
      var meeting;
      var horizon;
      var i;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        total += meetings.length;
        if (meetings.length >= 2) {
          horizon = meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < meetings.length; i++) {
            meeting = meetings[i];
            if (horizon > 0) {
              if (meeting.startTime.getTotalMinutes() < horizon) {
                numConflicts++;
              }
            }
            horizon = Math.max(horizon, meeting.endTime.getTotalMinutes());
          }
        }
      }
      return -(numConflicts / total);
    }
  };
  var _filterFns = {
    noTimeConflicts: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      var meeting;
      var horizon;
      var i;
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        if (meetings.length >= 2) {
          horizon = meetings[0].endTime.getTotalMinutes();
          for (i = 1; i < meetings.length; i++) {
            meeting = meetings[i];
            if (horizon > 0) {
              if (meeting.startTime.getTotalMinutes() < horizon) {
                return false;
              }
            }
            horizon = Math.max(horizon, meeting.endTime.getTotalMinutes());
          }
        }
      }
      return true;
    },
    dayStartTime: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        if (meetings.length > 0) {
          if (meetings[0].startTime.compareTo(_schedulingOptions.dayStartTime) < 0) {
            return false;
          }
        }
      }
      return true;
    },
    dayEndTime: function(footprint) {
      var meetingsByDay = Schedule.timeFootprints[footprint];
      for (var day in meetingsByDay) {
        var meetings = meetingsByDay[day];
        for (var i = 0; i < meetings.length; i++) {
          if (meetings[i].endTime.compareTo(_schedulingOptions.dayEndTime) > 0) {
            return false;
          }
        }
      }
      return true;
    }
  };

  _loadScheduleIdsInto_savedSchedules();

  function _generateId(charSet, numChars) {
    var id = '';
    for (var i = 0; i < numChars; i++) {
      id += charSet[Math.floor(Math.random() * charSet.length)]
    }
    return id;
  }

  function _loadScheduleIdsInto_savedSchedules() {
    userService.savedScheduleIds.forEach(function(scheduleId) {
      getScheduleQById(scheduleId).then(function(schedule) {
        _addSavedScheduleNoSave(schedule);
      });
    });
  }

  function _saveScheduleIdsToCookie() {
    userService.savedScheduleIds = _savedSchedules.map(function(schedule) {
      return schedule.id;
    });
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
    courseService.save();
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
      _generatingSchedulesQ = $timeout(function() {
        var instanceId = _generateId(generatingSchedulesInstanceIdCharSet, 4);
        _generatingSchedulesStops[instanceId] = false;

        // Map schedules to footprints
        _currScheduleGroup.reset();
        _scheduleIdsByFp = {};
        var deferred = $q.defer();
        var totalNumSchedules = _currScheduleGroup.size;
        var totalGenerated = 0;
        var generatorChunkSize = 128;
        var schedule = _currScheduleGroup.next();
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
              schedule = _currScheduleGroup.next();
            }
            updateTotalAndSetAndBroadcastStatus(numGenerated);
            return generateSchedulesHelperAsync();
          });
        }

        setStale(false);
        updateTotalAndSetAndBroadcastStatus(0);
        generateSchedulesHelperAsync();
        return deferred.promise.then(function() {
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
    if (_currScheduleGroup && _currScheduleGroup.size <= 0) {
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
        var someSelected = false;
        for (var j = 0; j < course.instances.length; j++) {
          var courseInstance = course.instances[j];
          someSelected = true;
          for (var k = 0; k < courseInstance.optionTypes.length; k++) {
            var selectedOptions =
                course.getOptionsByType(course.optionTypes[k]).filter(function(option) {
                  return option.selected;
                });
            if (selectedOptions.length <= 0) {
              // This courseInstance has at least one optionType for which no options
              // are selected. Therefore, this courseInstance can not be used in
              // scheduling. Break and check other course instances.
              someSelected = false;
              break;
            }
          }
          if (someSelected) {
            // At least one course instance (this one) has some options selected for all
            // its option types. Break immediately and check other courses because this
            // is not the reason for the error.
            break;
          }
        }
        if (!someSelected) {
          // None of the course instances for this course had some options selected for
          // all its option types. Therefore, this is one reason (out of potentially
          // multiple reasons) for the error.
          _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
              'No sections of type ' +
              course.sectionTypes[k] +
              ' were selected for ' +
              course.getName() + '.'
          ));
          return;
        }
      }
    }

    // Check if any filtering option is discarding all schedules
    var fpList = Object.keys(_scheduleIdsByFp);

    if (_schedulingOptions.noTimeConflicts) {
      fpList = fpList.filter(function(footprint) {
        return _filterFns.noTimeConflicts(footprint);
      });
      if (fpList.length <= 0) {
        _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
            'Schedules without time conflicts could not be found.'
        ));
        return;
      }
    }

    fpList = fpList.filter(function(footprint) {
      return _filterFns.dayStartTime(footprint);
    }).filter(function(footprint) {
      return _filterFns.dayEndTime(footprint);
    });
    if (fpList.length <= 0) {
      _setAndBroadcastScheduleGenerationStatus(new scheduleGenerationStatus.Failed(
        'No schedules were found with all classes within the selected start ' +
        'and end time of day. Change your Scheduling Options, add more ' +
        'sections to your existing classes, or check for a different set of ' +
        'classes. '
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

  function getCurrentScheduleGroupIdQ() {
    if (_currScheduleGroup && !_isStale()) {
      return $q.when(_currScheduleGroup.id);
    }

    return courseService.getAllCoursesQ().then(function(courseList) {
      return courseList.filter(function(course) {
        return course.selected;
      });
    }).then(function(filteredCourseList) {
      _setCurrentScheduleGroup(new ScheduleGroup(
          _primaryUserId,
          filteredCourseList,
          eventService.getAllEvents().filter(function(event) {
            return event.selected;
          })
      ), true);
      return _currScheduleGroup.id;
    })
  }

  function setCurrentScheduleGroupById(scheduleGroupId) {
    if (_currScheduleGroup !== null) {
      if (_currScheduleGroup.id === ScheduleGroup.normalizeId(scheduleGroupId)) {
        return;
      }
    }

    var userId = ScheduleGroup.getUserIdFromId(scheduleGroupId);
    var commitmentIdList = ScheduleGroup.getCommitmentIdsFromId(scheduleGroupId);
    var courseIdList = [];
    var eventIdList = [];
    commitmentIdList.forEach(function(id) {
      if (CustomCommitment.isCustomCommitmentId(id)) {
        eventIdList.push(id);
      } else {
        courseIdList.push(id);
      }
    });

    return $q.all(courseIdList.map(function(courseId) {
      return courseService.addCourseByIdQ(courseId);
    })).then(function(courses) {
      courseService.setSelectedCoursesByIdQ(courseIdList);
      eventService.setSelectedEventsById(eventIdList);

      _setCurrentScheduleGroup(new ScheduleGroup(userId, courses, eventService
          .getAllEvents()
          .filter(function(event) {
            return eventIdList.indexOf(event.id) >= 0;
          })), false);
    });
  }

  function getScheduleQById(scheduleId) {
    var schedule = getScheduleByIdFromCurrentScheduleGroup(scheduleId);
    if (schedule !== null) {
      return $q.when(schedule);
    }

    var userId = Schedule.getUserIdFromId(scheduleId);
    const optionIds = Schedule.getOptionIdsFromId(scheduleId);
    return $q.all(optionIds.map(function(optionId) {
      if (CustomCommitmentOption.isCustomCommitmentOptionId(optionId)) {
        return $q.when(eventService.getOptionById(optionId));
      }
      return courseService.getSectionByIdQ(optionId);
    })).then(function(options) {
      return new Schedule(userId, options.filter(function(option) {
        return option;
      }));
    });
  }

  function setCurrentScheduleGroupByScheduleIdQ(scheduleId) {
    if (getScheduleByIdFromCurrentScheduleGroup(scheduleId) !== null) {
      return $q.when();
    }

    var userId = Schedule.getUserIdFromId(scheduleId);
    var optionIdList = Schedule.getOptionIdsFromId(scheduleId);
    var sectionIdList = [];
    var customCommitmentOptionIdList = [];
    optionIdList.forEach(function(id) {
      if (CustomCommitmentOption.isCustomCommitmentOptionId(id)) {
        customCommitmentOptionIdList.push(id);
      } else {
        sectionIdList.push(id);
      }
    });

    return courseService.getAllCoursesQ().then(function(prevAllCourses) {
      const courses = [];
      sectionIdList.forEach(function(sectionId) {
        courseService.getSectionByIdQ(sectionId).then(function(section) {
          section.selected = true;
          const course = section.owner.course;
          if (courses.findIndex(function(c) {
                return c.id === course.id;
              }) < 0) {
            courses.push(course);
          }

          if (prevAllCourses.findIndex(function(c) {
                return c.id === course.id;
              }) < 0) {
            setStale();
            // This was the first time the course was added.
            // Only select this section.
            course.instances.forEach(function(courseInstance) {
              courseInstance.sections.forEach(function(s) {
                s.selected = s.id === section.id;
              });
            });
          } else {
            // The course has already been added previously.
            // Ensure this section is selected.
            var done = false;
            for (var i = 0; i < course.instances.length; i++) {
              const courseInstance = course.instances[i];
              for (var j = 0; j < courseInstance.sections.length; j++) {
                if (courseInstance.sections[j].id === section.id) {
                  section.selected = true;
                  done = true;
                  break;
                }
              }
              if (done) {
                break;
              }
            }
          }
        });
      });
      return courses;
    }).then(function(courses) {
      var events = customCommitmentOptionIdList.map(function(optionId) {
        return eventService.getOptionById(optionId);
      }).filter(function(option) {
        return option !== undefined;
      }).map(function(option) {
        return option.owner;
      });

      // Ensure that only these courses and events are selected.
      courseService.setSelectedCoursesByIdQ(courses.map(function(c) {
        return c.id;
      }));
      eventService.setSelectedEventsById(events.map(function(e) {
        return e.id;
      }));

      _setCurrentScheduleGroup(new ScheduleGroup(userId, courses, events), false);
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
    _schedulingOptions[option] = choice;
    if (save === undefined || save) {
      userService.schedulingOptions = _schedulingOptions;
    }

    Object.keys(_schedulingOptionsChangeListeners).forEach(function(tag) {
      _schedulingOptionsChangeListeners[tag](getSchedulingOptions());
    });
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
    setStale: setStale,

    generateSchedulesQ: generateSchedulesQ,
    getCurrentScheduleGroupIdQ: getCurrentScheduleGroupIdQ,
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
    'userService',
    'courseService',
    'eventService',
  scheduleFactory
]);
