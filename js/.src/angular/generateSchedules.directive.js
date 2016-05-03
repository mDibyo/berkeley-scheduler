var Time = require('../models/time');
var BaseCtrl = require('./_base.controller');

function sbGenerateSchedulesDirective() {

  sbGenerateSchedulesCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbGenerateSchedulesCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

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

    vm.scheduleIsStale = scheduleFactory.isStale();
    vm.generateMessage = 'Generate Schedules';
    vm.showOptions = schedulingOptions.showOptions;
    vm.viewSchedules = viewSchedules;
    vm.generateAndViewSchedules = generateAndViewSchedules;
    vm.toggleOptions = toggleOptions;

    vm.gapOptions = {
      minimize: 'minimizeGaps',
      maximize: 'maximizeGaps',
      none: 'dontWorryAboutGaps'
    };
    if (schedulingOptions.minimizeGaps) {
      vm.gapOption = vm.gapOptions.minimize;
    } else if (schedulingOptions.maximizeGaps) {
      vm.gapOption = vm.gapOptions.maximize;
    } else {
      vm.gapOption = vm.gapOptions.none;
    }
    vm.onChangeGapOption = onChangeGapOption;

    vm.partsOfDay = {
      morning: 'preferMorning',
      afternoon: 'preferAfternoon',
      evening: 'preferEvening',
      none: 'preferNone'
    };
    if (schedulingOptions.preferMornings) {
      vm.preferPartOfDay = vm.partsOfDay.morning;
    } else if (schedulingOptions.preferAfternoons) {
      vm.preferPartOfDay = vm.partsOfDay.afternoon;
    } else if (schedulingOptions.preferEvenings) {
      vm.preferPartOfDay = vm.partsOfDay.evening;
    } else {
      vm.preferPartOfDay = vm.partsOfDay.none;
    }
    vm.onChangePreferPartOfDay = onChangePreferPartOfDay;

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

    vm.preferNoTimeConflicts = schedulingOptions.preferNoTimeConflicts;
    vm.disablePreferNoTimeConflicts = vm.noTimeConflicts;
    vm.onChangePreferNoTimeConflicts = onChangePreferNoTimeConflicts;

    vm.savedSchedules = scheduleFactory.getSavedSchedules();
    vm.dropSavedSchedule = function($event, schedule) {
      $event.stopPropagation();
      scheduleFactory.dropSavedSchedule(schedule);
    };

    scheduleFactory.registerSetStaleListener(function(isStale) {
      vm.scheduleIsStale = isStale;
    });

    scheduleFactory.registerAddSavedScheduleListener(function(schedule) {
      vm.savedSchedules.push(schedule);
    });

    scheduleFactory.registerDropSavedScheduleListener(function(schedule) {
      vm.savedSchedules.remove(schedule);
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
      vm.generateMessage = 'Generating';
      scheduleFactory.generateSchedulesQ().then(function() {
        scheduleFactory.filterSchedules();
        scheduleFactory.reorderSchedules();
        vm.generateMessage = 'Generate Schedules';
        viewSchedules();
      });
    }

    function toggleOptions() {
      vm.showOptions = !vm.showOptions;
      scheduleFactory.setSchedulingOption('showOptions', vm.showOptions);
    }

    function onChangeGapOption() {
      switch (vm.gapOption) {
        case vm.gapOptions.minimize:
          scheduleFactory.setSchedulingOption('minimizeGaps', true);
          scheduleFactory.setSchedulingOption('maximizeGaps', false);
          break;
        case vm.gapOptions.maximize:
          scheduleFactory.setSchedulingOption('minimizeGaps', false);
          scheduleFactory.setSchedulingOption('maximizeGaps', true);
          break;
        case vm.gapOptions.none:
          scheduleFactory.setSchedulingOption('minimizeGaps', false);
          scheduleFactory.setSchedulingOption('maximizeGaps', false);
          break;
      }
      if (vm.gapOption != null) {
        vm.preferPartOfDay = vm.partsOfDay.none;
        scheduleFactory.setSchedulingOption('preferMornings', false);
        scheduleFactory.setSchedulingOption('preferAfternoons', false);
        scheduleFactory.setSchedulingOption('preferEvenings', false);
      }
      scheduleFactory.reorderSchedules();
    }

    function onChangePreferPartOfDay() {
      switch (vm.preferPartOfDay) {
        case vm.partsOfDay.morning:
          scheduleFactory.setSchedulingOption('preferMornings', true);
          scheduleFactory.setSchedulingOption('preferAfternoons', false);
          scheduleFactory.setSchedulingOption('preferEvenings', false);
          break;
        case vm.partsOfDay.afternoon:
          scheduleFactory.setSchedulingOption('preferMornings', false);
          scheduleFactory.setSchedulingOption('preferAfternoons', true);
          scheduleFactory.setSchedulingOption('preferEvenings', false);
          break;
        case vm.partsOfDay.evening:
          scheduleFactory.setSchedulingOption('preferMornings', false);
          scheduleFactory.setSchedulingOption('preferAfternoons', false);
          scheduleFactory.setSchedulingOption('preferEvenings', true);
          break;
        case vm.partsOfDay.none:
          scheduleFactory.setSchedulingOption('preferMornings', false);
          scheduleFactory.setSchedulingOption('preferAfternoons', false);
          scheduleFactory.setSchedulingOption('preferEvenings', false);
          break;
      }
      if (vm.preferPartOfDay != vm.partsOfDay.none) {
        vm.gapOption = vm.gapOptions.none;
        scheduleFactory.setSchedulingOption('minimizeGaps', false);
        scheduleFactory.setSchedulingOption('maximizeGaps', false);
      }
      scheduleFactory.reorderSchedules();
    }

    function onChangeNoTimeConflicts() {
      vm.disablePreferNoTimeConflicts = vm.noTimeConflicts;
      scheduleFactory.setSchedulingOption('noTimeConflicts', vm.noTimeConflicts);
      scheduleFactory.filterSchedules();
      scheduleFactory.reorderSchedules();
    }

    function onChangePreferNoTimeConflicts() {
      schedulingOptions.setSchedulingOption('preferNoTimeConflicts', vm.preferNoTimeConflicts);
      schedulingOptions.reorderSchedules();
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
      scheduleFactory.reorderSchedules();
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
      scheduleFactory.reorderSchedules();
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
      sbGenerateSchedulesCtrl
    ],
    controllerAs: 'dvm',
    templateUrl: 'html/generate_schedules.partial.html'
  }
}
angular.module('scheduleBuilder').directive('sbGenerateSchedules', [
  sbGenerateSchedulesDirective
]);
