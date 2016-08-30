'use strict';

function BaseCtrl($state, $window, scheduleFactory) {
  var vm = this;

  vm.goToState = goToState;
  vm.goToExternal = goToExternal;

  function goToState(to, params, options) {
    if (to === 'schedule.viewSchedule') {
      goToScheduleViewSchedule(params, options);
      return;
    }
    $state.go(to, params, options);
  }

  function goToExternal(href) {
    $window.open(href, '_blank');
  }

  function goToScheduleViewSchedule(params, options) {
    var schedulingOptions = scheduleFactory.getSchedulingOptions();
    params.noTimeConflicts = schedulingOptions.noTimeConflicts;
    $state.go('schedule.viewSchedule', params, options);
  }
}

module.exports = BaseCtrl;
