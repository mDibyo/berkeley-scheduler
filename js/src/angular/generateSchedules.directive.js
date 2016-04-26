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
      //scheduleFactory.reorderSchedules();
      viewSchedules();
    }

    function toggleOptions() {
      vm.showOptions = !vm.showOptions;
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
