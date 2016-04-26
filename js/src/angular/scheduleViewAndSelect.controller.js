var BaseCtrl = require('./_base.controller');

ScheduleViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
function ScheduleViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
  BaseCtrl.call(this, $state, $window);

  var vm = this;

  var scheduleId = $stateParams.scheduleId;
  if (scheduleId) {
    scheduleFactory.setCurrentScheduleById($stateParams.scheduleId);
    scheduleFactory.getScheduleQById($stateParams.scheduleId).then(function(schedule) {
      vm.selectedSchedule = schedule;
    });
  }
}
angular.module('scheduleBuilder').controller('ScheduleViewAndSelectCtrl', [
  '$state',
  '$window',
  '$stateParams',
  'scheduleFactory',
  ScheduleViewAndSelectCtrl
]);
