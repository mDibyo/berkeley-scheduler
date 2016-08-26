var BaseCtrl = require('./_base.controller');

ViewScheduleCtrl.prototype = Object.create(BaseCtrl.prototype);
function ViewScheduleCtrl($state, $window, $stateParams, scheduleFactory, $analytics) {
  $analytics.pageTrack('/schedule/{}'.replace('{}', $stateParams.scheduleId));

  BaseCtrl.call(this, $state, $window);

  var vm = this;

  var scheduleId = $stateParams.scheduleId;

  vm.selectedSchedule = null;

  if (scheduleId) {
    vm.selectedSchedule = scheduleFactory.setCurrentScheduleById($stateParams.scheduleId);
  }

  if (vm.selectedSchedule === null) {
    vm.goToState('schedule.generatingSchedules', {startScheduleId: scheduleId});
  }
}
angular.module('berkeleyScheduler').controller('ViewScheduleCtrl', [
  '$state',
  '$window',
  '$stateParams',
  'scheduleFactory',
  '$analytics',
  ViewScheduleCtrl
]);
