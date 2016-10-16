'use strict';

function BaseCtrl($state, $window, scheduleFactory) {
  var vm = this;

  vm.goToState = goToState;
  vm.goToExternal = goToExternal;
  vm.getHref = getHref;

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

  function getHref(state, params, options) {
    return 'https://berkeleyscheduler.com/' + $state.href(state, params, options);
  }
}

module.exports = BaseCtrl;
