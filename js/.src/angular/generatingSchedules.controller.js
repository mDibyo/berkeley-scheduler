var BaseCtrl = require('./_base.controller');

GeneratingSchedulesCtrl.prototype = Object.create(BaseCtrl.prototype);
function GeneratingSchedulesCtrl($state, $window, $httpParamSerializer, $stateParams, $q, scheduleFactory, $analytics) {
  $analytics.pageTrack(
    '/schedule/generating?{}'.replace('{}', $httpParamSerializer($stateParams)));

  BaseCtrl.call(this, $state, $window);

  var vm = this;

  var deferred = $q.defer();
  var scheduleGroupId = $stateParams.scheduleGroupId;
  var startScheduleId = $stateParams.startScheduleId;
  if (scheduleGroupId) {
    deferred.resolve(scheduleFactory.setCurrentScheduleGroupById(scheduleGroupId));
  } else if (startScheduleId) {
    deferred.resolve(scheduleFactory.setCurrentScheduleGroupByScheduleIdQ(startScheduleId).then(function() {
    }));
  }

  deferred.promise.then(function() {
    scheduleFactory.generateSchedulesQ().then(function() {
      scheduleFactory.filterAndReorderSchedules();
      vm.goToState('schedule.viewSchedule', {
        scheduleId: startScheduleId || scheduleFactory.getCurrScheduleId()
      });
    })
  });

}
angular.module('scheduleBuilder').controller('GeneratingSchedulesCtrl', [
  '$state',
  '$window',
  '$httpParamSerializer',
  '$stateParams',
  '$q',
  'scheduleFactory',
  '$analytics',
  GeneratingSchedulesCtrl
]);
