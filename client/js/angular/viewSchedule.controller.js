var BaseCtrl = require('./_base.controller');

ViewScheduleCtrl.prototype = Object.create(BaseCtrl.prototype);
function ViewScheduleCtrl($state, $window, $location, $stateParams, scheduleFactory, $analytics) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  var scheduleId = $stateParams.scheduleId;

  var noTimeConflicts = $stateParams.noTimeConflicts !== 'false';
  scheduleFactory.setSchedulingOption('noTimeConflicts', noTimeConflicts);

  vm.selectedSchedule = null;

  if (scheduleId) {
    vm.selectedSchedule = scheduleFactory.setCurrentScheduleById(scheduleId);
  }

  if (vm.selectedSchedule === null) {
    vm.goToState('schedule.generatingSchedules', {startScheduleId: scheduleId});
  }
}
angular.module('berkeleyScheduler').controller('ViewScheduleCtrl', [
  '$state',
  '$window',
  '$location',
  '$stateParams',
  'scheduleFactory',
  '$analytics',
  ViewScheduleCtrl
]);
