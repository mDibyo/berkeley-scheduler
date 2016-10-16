var Time = require('../models/time');
var BaseCtrl = require('./_base.controller');

function bsGenerateSchedulesDirective() {

  bsGenerateSchedulesCtrl.prototype = Object.create(BaseCtrl.prototype);
  function bsGenerateSchedulesCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window, scheduleFactory);

    var vm = this;

    var hours = [];
    var halfHours = [];
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    var startHour = 8;
    var endHour = 24;
    //var numHours = endHour - startHour;
    for (var h = startHour; h < endHour; h++) {
      hours.push(new Time(h, 0));
      halfHours.push(new Time(h, 0));
      halfHours.push(new Time(h, 30));
    }
    hours.push(new Time(h, 0));
    halfHours.push(new Time(h, 0));

    var schedulingOptions = scheduleFactory.getSchedulingOptions();

    vm.scheduleGenerationStatus = scheduleFactory.getScheduleGenerationStatus();
    vm.showSavedSchedules = schedulingOptions.showSavedSchedules;
    vm.showOptions = schedulingOptions.showOptions;
    vm.toggleSavedSchedules = toggleSavedSchedules;
    vm.toggleOptions = toggleOptions;
    vm.viewSchedules = viewSchedules;
    vm.generateAndViewSchedules = generateAndViewSchedules;

    vm.sortingOptions = {
      preferMornings: 'preferMornings',
      preferAfternoons: 'preferAfternoons',
      preferEvenings: 'preferEvenings',
      minimizeGaps: 'minimizeGaps',
      maximizeGaps: 'maximizeGaps',
      minimizeNumberOfDays: 'minimizeNumberOfDays',
      maximizeNumberOfDays: 'maximizeNumberOfDays',
      preferNoTimeConflicts: 'preferNoTimeConflicts',
      noPreference: 'noPreference'
    };
    vm.selectedSortingOption = vm.sortingOptions.noPreference;
    for (var option in vm.sortingOptions) {
      if (schedulingOptions[option]) {
        vm.selectedSortingOption = option;
        break;
      }
    }

    vm.onChangeSortingOption = onChangeSortingOption;

    function onChangeSortingOption() {
      scheduleFactory.setSchedulingOption('preferMornings', false, false);
      scheduleFactory.setSchedulingOption('preferAfternoons', false, false);
      scheduleFactory.setSchedulingOption('preferEvenings', false, false);
      scheduleFactory.setSchedulingOption('minimizeGaps', false, false);
      scheduleFactory.setSchedulingOption('maximizeGaps', false, false);
      scheduleFactory.setSchedulingOption('preferNoTimeConflicts', false, false);

      scheduleFactory.setSchedulingOption(vm.selectedSortingOption, true, true);
      maybeFilterAndReorderSchedules();
    }

    vm.selectedDayStartTimeJson =
      schedulingOptions.dayStartTime || halfHours[0];
    vm.selectedDayEndTimeJson =
      schedulingOptions.dayEndTime || halfHours[halfHours.length-1];
    vm.dayStartTimes = halfHours;
    vm.dayEndTimes = halfHours;
    vm.onSelectDayStartTime = onSelectDayStartTime;
    vm.onSelectDayEndTime = onSelectDayEndTime;
    vm.isSelectedDayStartTime = isSelectedDayStartTime;
    vm.isSelectedDayEndTime = isSelectedDayEndTime;

    vm.noTimeConflicts = schedulingOptions.noTimeConflicts;
    vm.onChangeNoTimeConflicts = onChangeNoTimeConflicts;

    vm.savedSchedules = scheduleFactory.getSavedSchedules();
    vm.dropSavedSchedule = function($event, schedule) {
      $event.stopPropagation();
      scheduleFactory.dropSavedSchedule(schedule);
    };

    scheduleFactory.registerSchedulingOptionsChangeListener('generateSchedules', function(newOptions) {
      vm.noTimeConflicts = schedulingOptions.noTimeConflicts = newOptions.noTimeConflicts;
    });

    scheduleFactory.registerScheduleGenerationStatusListener('generateSchedules', function(status) {
      vm.scheduleGenerationStatus = status;
      if (status.status === 'stale' && $state.includes('schedule.viewSchedule')) {
        vm.generateAndViewSchedules();
      }
    });

    scheduleFactory.registerAddSavedScheduleListener(function(schedule) {
      vm.savedSchedules.push(schedule);
    });

    scheduleFactory.registerDropSavedScheduleIdListener(function(schedule) {
      vm.savedSchedules.remove(schedule);
    });

    function maybeFilterAndReorderSchedules() {
      var status = vm.scheduleGenerationStatus.status;
      if (status === 'done' || status === 'failed') {
        scheduleFactory.filterAndReorderSchedules();
      }
    }

    function viewSchedules() {
      var currScheduleId = scheduleFactory.getCurrScheduleId();
      if (currScheduleId === undefined) {
        generateAndViewSchedules();
      }
      vm.goToState('schedule.viewSchedule', {
        scheduleId: currScheduleId
      });
    }

    function generateAndViewSchedules() {
      vm.goToState('schedule.generatingSchedules', {
        scheduleGroupId: scheduleFactory.getCurrentScheduleGroupId()
      });
    }

    function toggleSavedSchedules(showSavedSchedules) {
      if (showSavedSchedules) {
        toggleOptions(false);
      }
      vm.showSavedSchedules = showSavedSchedules;
      scheduleFactory.setSchedulingOption('showSavedSchedules', vm.showSavedSchedules);
    }

    function toggleOptions(showOptions) {
      if (showOptions) {
        toggleSavedSchedules(false);
      }
      vm.showOptions = showOptions;
      scheduleFactory.setSchedulingOption('showOptions', vm.showOptions);
    }

    function onChangeNoTimeConflicts() {
      vm.disablePreferNoTimeConflicts = vm.noTimeConflicts;
      scheduleFactory.setSchedulingOption('noTimeConflicts', vm.noTimeConflicts);
      maybeFilterAndReorderSchedules();
    }

    function onSelectDayStartTime() {
      var times = halfHours.slice();
      var selectedDayStartTime = Time.parse(vm.selectedDayStartTimeJson);
      while (times.length > 0 && times[0].compareTo(selectedDayStartTime) < 0) {
        times.shift()
      }
      vm.dayEndTimes = times;

      scheduleFactory.setSchedulingOption('dayStartTime', selectedDayStartTime);
      maybeFilterAndReorderSchedules();
    }

    function onSelectDayEndTime() {
      var times = halfHours.slice();
      var selectedDayEndTime = Time.parse(vm.selectedDayEndTimeJson);
      while (times.length > 0 && times[times.length-1].compareTo(selectedDayEndTime) > 0) {
        times.pop()
      }
      vm.dayStartTimes = times;

      scheduleFactory.setSchedulingOption('dayEndTime', selectedDayEndTime);
      maybeFilterAndReorderSchedules();
    }

    function isSelectedDayStartTime(time) {
      var selectedDayStartTimeJson = Time.parse(vm.selectedDayStartTimeJson);
      return time.hours === selectedDayStartTimeJson.hours
        && time.minutes === selectedDayStartTimeJson.minutes;
    }

    function isSelectedDayEndTime(time) {
      var selectedDayEndTimeJson = Time.parse(vm.selectedDayEndTimeJson);
      return time.hours === selectedDayEndTimeJson.hours
        && time.minutes === selectedDayEndTimeJson.minutes;
    }
  }

  return {
    controller: [
      '$state',
      '$window',
      'scheduleFactory',
      bsGenerateSchedulesCtrl
    ],
    controllerAs: 'dvm',
    templateUrl: 'assets/static/html/generate_schedules.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsGenerateSchedules', [
  bsGenerateSchedulesDirective
]);
