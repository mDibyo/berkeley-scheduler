var BaseCtrl = require('./_base.controller');
var constants = require('../constants');
var Time = require('../models/time');

function bsPreferencesDirective() {
  bsPreferencesCtrl.prototype = Object.create(BaseCtrl.prototype);
  function bsPreferencesCtrl($state, $window, schedulingOptionsService, scheduleFactory, savedScheduleService) {
    BaseCtrl.call(this, $state, $window, schedulingOptionsService);

    var vm = this;

    var hours = [];
    var halfHours = [];
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    var startHour = 8;
    var endHour = 24;
    for (var h = startHour; h < endHour; h++) {
      hours.push(new Time(h, 0));
      halfHours.push(new Time(h, 0));
      halfHours.push(new Time(h, 30));
    }
    hours.push(new Time(h, 0));
    halfHours.push(new Time(h, 0));

    var schedulingOptions = schedulingOptionsService.getAllSchedulingOptions();

    vm.scheduleGenerationStatus = scheduleFactory.getScheduleGenerationStatus();
    vm.showSavedSchedules = schedulingOptions.showSavedSchedules;
    vm.showOptions = schedulingOptions.showOptions;
    vm.toggleSavedSchedules = toggleSavedSchedules;
    vm.toggleOptions = toggleOptions;

    scheduleFactory.registerScheduleGenerationStatusListener('preferences', function(status) {
      vm.scheduleGenerationStatus = status;
      if (status.status === 'stale' && $state.includes('schedule.viewSchedule')) {
        scheduleFactory.getCurrentScheduleGroupIdQ(constants.TERM_ABBREV).then(function(scheduleGroupId) {
          vm.goToState('schedule.generatingSchedules', {
            scheduleGroupId: scheduleGroupId
          });
        });
      }
    });

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
      schedulingOptionsService.setSchedulingOption('preferMornings', false, false);
      schedulingOptionsService.setSchedulingOption('preferAfternoons', false, false);
      schedulingOptionsService.setSchedulingOption('preferEvenings', false, false);
      schedulingOptionsService.setSchedulingOption('minimizeGaps', false, false);
      schedulingOptionsService.setSchedulingOption('maximizeGaps', false, false);
      schedulingOptionsService.setSchedulingOption('minimizeNumberOfDays', false, false);
      schedulingOptionsService.setSchedulingOption('maximizeNumberOfDays', false, false);
      schedulingOptionsService.setSchedulingOption('preferNoTimeConflicts', false, false);

      schedulingOptionsService.setSchedulingOption(vm.selectedSortingOption, true, true);
      maybeFilterAndReorderSchedules();
    }

    vm.selectedDayStartTime =
      schedulingOptions.dayStartTime || halfHours[0];
    vm.selectedDayEndTime =
      schedulingOptions.dayEndTime || halfHours[halfHours.length - 1];
    vm.dayStartTimes = halfHours;
    vm.dayEndTimes = halfHours;
    vm.onSelectDayStartTime = onSelectDayStartTime;
    vm.onSelectDayEndTime = onSelectDayEndTime;

    vm.noTimeConflicts = schedulingOptions.noTimeConflicts;
    vm.onChangeNoTimeConflicts = onChangeNoTimeConflicts;

    vm.savedSchedules = [];
    vm.dropSavedSchedule = function($event, schedule) {
      $event.stopPropagation();
      savedScheduleService.dropSavedSchedule(schedule);
    };

    schedulingOptionsService.addChangeSchedulingOptionListener('preferences', function(newOptions) {
      vm.noTimeConflicts = schedulingOptions.noTimeConflicts = newOptions.noTimeConflicts;
    });

    savedScheduleService.addAddSavedScheduleListener(constants.TERM_ABBREV, 'preferences', function(schedule) {
      vm.savedSchedules.push(schedule);
    });

    savedScheduleService.addDropSavedScheduleListener(constants.TERM_ABBREV, 'preferences', function(schedule) {
      vm.savedSchedules.remove(schedule);
    });

    function maybeFilterAndReorderSchedules() {
      var status = vm.scheduleGenerationStatus.status;
      if (status === 'done' || status === 'failed') {
        scheduleFactory.filterAndReorderSchedules();
      }
    }

    function toggleSavedSchedules(showSavedSchedules) {
      if (showSavedSchedules) {
        toggleOptions(false);
      }
      vm.showSavedSchedules = showSavedSchedules;
      schedulingOptionsService.setSchedulingOption('showSavedSchedules', vm.showSavedSchedules);
    }

    function toggleOptions(showOptions) {
      if (showOptions) {
        toggleSavedSchedules(false);
      }
      vm.showOptions = showOptions;
      schedulingOptionsService.setSchedulingOption('showOptions', vm.showOptions);
    }

    function onChangeNoTimeConflicts() {
      vm.disablePreferNoTimeConflicts = vm.noTimeConflicts;
      schedulingOptionsService.setSchedulingOption('noTimeConflicts', vm.noTimeConflicts);
      maybeFilterAndReorderSchedules();
    }

    function onSelectDayStartTime() {
      var times = halfHours.slice();
      while (times.length > 0 && times[0].compareTo(vm.selectedDayStartTime) < 0) {
        times.shift()
      }
      vm.dayEndTimes = times;

      schedulingOptionsService.setSchedulingOption('dayStartTime', vm.selectedDayStartTime);
      maybeFilterAndReorderSchedules();
    }

    function onSelectDayEndTime() {
      var times = halfHours.slice();
      while (times.length > 0 && times[times.length - 1].compareTo(vm.selectedDayEndTime) > 0) {
        times.pop()
      }
      vm.dayStartTimes = times;

      schedulingOptionsService.setSchedulingOption('dayEndTime', vm.selectedDayEndTime);
      maybeFilterAndReorderSchedules();
    }
  }

  return {
    controller: [
      '$state',
      '$window',
      'schedulingOptionsService',
      'scheduleFactory',
      'savedScheduleService',
      bsPreferencesCtrl
    ],
    controllerAs: 'dvm',
    templateUrl: 'assets/static/html/preferences.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsPreferences', [
  bsPreferencesDirective
]);
